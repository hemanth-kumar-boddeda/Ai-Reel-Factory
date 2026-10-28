"""Test suite for Instagram publishing functionality."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from app.models.job import JobStatus, JobType
from app.models.instagram import InstagramConnectionStatus
from app.models.instagram_publishing import PublishingStatus
from app.models.reel import ReelStatus


def test_instagram_publish_blocked_unless_ready_to_publish(client):
    """Test that publishing is blocked unless reel is READY_TO_PUBLISH."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-blocked"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Ensure INSTAGRAM_DEV_MODE is True for test client (patched in conftest)
    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == 200

    # Attempt to publish while reel is in default status (likely DRAFT or something)
    publish_response = client.post(f"/reels/{reel_id}/publish")
    # Should fail because reel not READY_TO_PUBLISH
    assert publish_response.status_code == 400
    assert "not ready for publishing" in publish_response.json()["detail"].lower()


def test_instagram_publish_blocked_for_non_owner(client, db_session):
    """Test that non-owner cannot publish."""
    # Create two users
    from app.models.user import UserItem, UserRole
    from app.repositories.user import UserRepository

    # We need to manually create users because the test client overrides get_current_active_user
    # Let's directly use the db_session from fixture
    user_repo = UserRepository(db_session)

    # Owner user (id will be 1 due to override in conftest? Actually the override returns a fixed user with id=1)
    # But we'll create another user
    user2 = UserItem(
        email="user2@example.com",
        hashed_password="dummy",
        is_active=True,
        role=UserRole.USER,
    )
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)

    # Create reel owned by user2
    from app.repositories.reel import ReelRepository
    from app.schemas.reel import ReelItemCreate
    reel_repo = ReelRepository(db_session)
    reel_in = ReelItemCreate(
        source="Test",
        title="Test Reel",
        url="https://example.com/test-ig-nonowner"
    )
    reel = reel_repo.create(reel_in, user_id=user2.id)

    # Create Instagram connection for owner (user id=1)
    from app.models.instagram import InstagramConnection
    from app.core.security import encrypt_token
    connection = InstagramConnection(
        user_id=1,  # owner from test client override
        instagram_account_id="12345",
        account_username="testuser",
        account_name="Test User",
        access_token_encrypted=encrypt_token("dummy_token"),
        status=InstagramConnectionStatus.ACTIVE.value
    )
    db_session.add(connection)
    db_session.commit()

    # Now try to publish using client (which acts as user id=1) on reel owned by user2
    publish_response = client.post(f"/reels/{reel.id}/publish")
    assert publish_response.status_code == 400
    assert "access denied" in publish_response.json()["detail"].lower() or "not found" in publish_response.json()["detail"].lower()


def test_instagram_publish_blocked_if_no_video(client):
    """Test that publishing is blocked if no video file."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-no-video"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == 200

    # Manually set reel status to READY_TO_PUBLISH but without video
    from app.services.reel import ReelService
    from app.database import SessionLocal
    # Need to get actual db session; we can use the overridden dependency
    # Let's just directly update via service using a new session
    from app.database import SessionLocal as LocalSession
    db = LocalSession()
    try:
        service = ReelService(db)
        reel = service.get_reel(reel_id, user_id=1)  # user_id=1 from override
        if reel:
            from app.schemas.reel import ReelItemUpdate
            update = ReelItemUpdate(status=ReelStatus.READY_TO_PUBLISH.value)
            service.repository.update(reel, update)
            db.commit()
    finally:
        db.close()

    # Attempt to publish
    publish_response = client.post(f"/reels/{reel_id}/publish")
    assert publish_response.status_code == 400
    assert "no video file found" in publish_response.json()["detail"].lower()


def test_instagram_publish_creates_record_and_job(client, mock_instagram_provider):
    """Test that publishing creates a publishing record and enqueues job."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-create"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == 200

    # Set reel to READY_TO_PUBLISH with video (mocked)
    from app.services.reel import ReelService
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = ReelService(db)
        reel = service.get_reel(reel_id, user_id=1)
        if reel:
            from app.schemas.reel import ReelItemUpdate
            update = ReelItemUpdate(
                status=ReelStatus.READY_TO_PUBLISH.value,
                video_path="/tmp/fake_video.mp4",
                captions="Test caption"
            )
            service.repository.update(reel, update)
            db.commit()
    finally:
        db.close()

    # Mock ReelService.validate_final_reel and get_publishable_video_url
    with patch('app.services.reel.ReelService.validate_final_reel') as mock_validate, \
         patch('app.services.reel.ReelService.get_publishable_video_url') as mock_get_url:
        mock_validate.return_value = {"valid": True, "errors": []}
        mock_get_url.return_value = "http://localhost:8000/video/1"

        # Publish
        publish_response = client.post(f"/reels/{reel_id}/publish")
        assert publish_response.status_code == 200
        data = publish_response.json()
        assert "publishing_id" in data
        assert data["status"] == PublishingStatus.PENDING.value
        publishing_id = data["publishing_id"]

        # Check that a publishing record exists
        from app.models.instagram_publishing import InstagramPublishing
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            publishing = db.query(InstagramPublishing).filter(InstagramPublishing.id == publishing_id).first()
            assert publishing is not None
            assert publishing.status == PublishingStatus.PENDING.value
            assert publishing.reel_id == reel_id
            assert publishing.caption_used == "Test caption"
        finally:
            db.close()

        # Check that a job of type INSTAGRAM_PUBLISH was created
        from app.models.job import JobItem
        db = SessionLocal()
        try:
            job = db.query(JobItem).filter(
                JobItem.reel_id == reel_id,
                JobItem.type == JobType.INSTAGRAM_PUBLISH.value
            ).first()
            assert job is not None
            assert job.status == JobStatus.PENDING.value
            job_id = job.id
        finally:
            db.close()

        # Verify that the job was enqueued (we can't easily test RQ enqueue with fakeredis?
        # but we can check that the job exists and is pending)

        # Optionally, we could process the job and verify provider calls


def test_instagram_publish_duplicate_protection(client, mock_instagram_provider):
    """Test that duplicate active publish requests are prevented."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-dup"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == 200

    # Set reel to READY_TO_PUBLISH
    from app.services.reel import ReelService
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = ReelService(db)
        reel = service.get_reel(reel_id, user_id=1)
        if reel:
            from app.schemas.reel import ReelItemUpdate
            update = ReelItemUpdate(
                status=ReelStatus.READY_TO_PUBLISH.value,
                video_path="/tmp/fake_video.mp4",
                captions="Test caption"
            )
            service.repository.update(reel, update)
            db.commit()
    finally:
        db.close()

    with patch('app.services.reel.ReelService.validate_final_reel') as mock_validate, \
         patch('app.services.reel.ReelService.get_publishable_video_url') as mock_get_url:
        mock_validate.return_value = {"valid": True, "errors": []}
        mock_get_url.return_value = "http://localhost:8000/video/1"

        # First publish request
        response1 = client.post(f"/reels/{reel_id}/publish")
        assert response1.status_code == 200
        publishing_id1 = response1.json()["publishing_id"]

        # Second publish request while first is pending/processing
        response2 = client.post(f"/reels/{reel_id}/publish")
        # Should return same publishing record (or error? According to service, returns None if cannot publish)
        # Looking at InstagramService.publish_reel: if not can_publish, returns None -> controller raises 400
        # So second request should fail with 400
        assert response2.status_code == 400
        assert "already in progress" in response2.json()["detail"].lower()


def test_instagram_publish_job_processing_success(client, mock_instagram_provider):
    """Test that processing a publishing job succeeds and updates reel to PUBLISHED."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-success"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == 200

    # Set reel to READY_TO_PUBLISH
    from app.services.reel import ReelService
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = ReelService(db)
        reel = service.get_reel(reel_id, user_id=1)
        if reel:
            from app.schemas.reel import ReelItemUpdate
            update = ReelItemUpdate(
                status=ReelStatus.READY_TO_PUBLISH.value,
                video_path="/tmp/fake_video.mp4",
                captions="Test caption"
            )
            service.repository.update(reel, update)
            db.commit()
    finally:
        db.close()

    with patch('app.services.reel.ReelService.validate_final_reel') as mock_validate, \
         patch('app.services.reel.ReelService.get_publishable_video_url') as mock_get_url:
        mock_validate.return_value = {"valid": True, "errors": []}
        mock_get_url.return_value = "http://localhost:8000/video/1"

        # Publish to get publishing record and job
        publish_response = client.post(f"/reels/{reel_id}/publish")
        assert publish_response.status_code == 200
        publishing_id = publish_response.json()["publishing_id"]

        # Get the job id
        from app.models.job import JobItem
        db = SessionLocal()
        try:
            job = db.query(JobItem).filter(
                JobItem.reel_id == reel_id,
                JobItem.type == JobType.INSTAGRAM_PUBLISH.value
            ).first()
            assert job is not None
            job_id = job.id
        finally:
            db.close()

        # Process the job
        from app.jobs.processor import process_instagram_publish_job
        process_instagram_publish_job(job_id)

        # Check job is completed
        db = SessionLocal()
        try:
            job = db.query(JobItem).filter(JobItem.id == job_id).first()
            assert job.status == JobStatus.COMPLETED.value
            assert job.progress == 100
            assert "published to instagram" in job.result.lower()
        finally:
            db.close()

        # Check publishing record is completed
        db = SessionLocal()
        try:
            from app.models.instagram_publishing import InstagramPublishing
            publishing = db.query(InstagramPublishing).filter(InstagramPublishing.id == publishing_id).first()
            assert publishing.status == PublishingStatus.COMPLETED.value
            assert publishing.published_media_id == "1234567890"  # from mock
            assert publishing.container_id == "container_123"
        finally:
            db.close()

        # Check reel status is PUBLISHED
        db = SessionLocal()
        try:
            service = ReelService(db)
            reel = service.get_reel(reel_id, user_id=1)
            assert reel.status == ReelStatus.PUBLISHED.value
        finally:
            db.close()


def test_instagram_publish_job_processing_failure(client, mock_instagram_provider):
    """Test that processing a publishing job handles failures correctly."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-fail"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == 200

    # Set reel to READY_TO_PUBLISH
    from app.services.reel import ReelService
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = ReelService(db)
        reel = service.get_reel(reel_id, user_id=1)
        if reel:
            from app.schemas.reel import ReelItemUpdate
            update = ReelItemUpdate(
                status=ReelStatus.READY_TO_PUBLISH.value,
                video_path="/tmp/fake_video.mp4",
                captions="Test caption"
            )
            service.repository.update(reel, update)
            db.commit()
    finally:
        db.close()

    with patch('app.services.reel.ReelService.validate_final_reel') as mock_validate, \
         patch('app.services.reel.ReelService.get_publishable_video_url') as mock_get_url:
        mock_validate.return_value = {"valid": True, "errors": []}
        mock_get_url.return_value = "http://localhost:8000/video/1"

        # Make the provider fail on container creation
        with patch('app.services.instagram.provider.InstagramProvider.create_reel_container') as mock_create:
            mock_create.side_effect = Exception("API error")

            # Publish to get publishing record and job
            publish_response = client.post(f"/reels/{reel_id}/publish")
            assert publish_response.status_code == 200
            publishing_id = publish_response.json()["publishing_id"]

            # Get the job id
            from app.models.job import JobItem
            db = SessionLocal()
            try:
                job = db.query(JobItem).filter(
                    JobItem.reel_id == reel_id,
                    JobItem.type == JobType.INSTAGRAM_PUBLISH.value
                ).first()
                assert job is not None
                job_id = job.id
            finally:
                db.close()

            # Process the job
            from app.jobs.processor import process_instagram_publish_job
            process_instagram_publish_job(job_id)

            # Check job is failed
            db = SessionLocal()
            try:
                job = db.query(JobItem).filter(JobItem.id == job_id).first()
                assert job.status == JobStatus.FAILED.value
                assert "api error" in job.error.lower()
            finally:
                db.close()

            # Check publishing record is failed
            db = SessionLocal()
            try:
                from app.models.instagram_publishing import InstagramPublishing
                publishing = db.query(InstagramPublishing).filter(InstagramPublishing.id == publishing_id).first()
                assert publishing.status == PublishingStatus.FAILED.value
                assert "api error" in publishing.error_message.lower()
            finally:
                db.close()

            # Check reel status is NOT PUBLISHED (should remain READY_TO_PUBLISH?)
            db = SessionLocal()
            try:
                service = ReelService(db)
                reel = service.get_reel(reel_id, user_id=1)
                # Actually, on failure we should not update reel status; it should stay READY_TO_PUBLISH
                # But the service does not revert; it stays as it was.
                assert reel.status == ReelStatus.READY_TO_PUBLISH.value
            finally:
                db.close()


# Mock fixture for InstagramProvider
@pytest.fixture(autouse=True)
def mock_instagram_provider():
    """Mock the InstagramProvider methods to avoid real API calls."""
    with patch('app.services.instagram.provider.InstagramProvider._make_request') as mock_make_request, \
         patch('app.services.instagram.provider.InstagramProvider.create_reel_container') as mock_create_container, \
         patch('app.services.instagram.provider.InstagramProvider.get_container_status') as mock_get_status, \
         patch('app.services.instagram.provider.InstagramProvider.publish_container') as mock_publish_container:

        # Configure mocks
        mock_make_request.return_value = {"id": "12345", "username": "testuser"}  # for get_account_info
        mock_create_container.return_value = "container_123"
        mock_get_status.return_value = {"status_code": "FINISHED"}
        mock_publish_container.return_value = "1234567890"

        yield


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
def test_publish_reel_job_user_id(client, mock_instagram_provider):
    """Test that publishing creates a JobItem with correct user_id."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-user-id"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == 200

    # Set reel to READY_TO_PUBLISH with video (mocked)
    from app.services.reel import ReelService
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = ReelService(db)
        reel = service.get_reel(reel_id, user_id=1)  # user_id=1 from override
        if reel:
            from app.schemas.reel import ReelItemUpdate
            update = ReelItemUpdate(
                status=ReelStatus.READY_TO_PUBLISH.value,
                video_path="/tmp/fake_video.mp4",
                captions="Test caption"
            )
            service.repository.update(reel, update)
            db.commit()
    finally:
        db.close()

    # Mock ReelService.validate_final_reel and get_publishable_video_url
    with patch('app.services.reel.ReelService.validate_final_reel') as mock_validate, \
         patch('app.services.reel.ReelService.get_publishable_video_url') as mock_get_url:
        mock_validate.return_value = {"valid": True, "errors": []}
        mock_get_url.return_value = "http://localhost:8000/video/1"

        # Publish
        publish_response = client.post(f"/reels/{reel_id}/publish")
        assert publish_response.status_code == 200
        data = publish_response.json()
        assert "publishing_id" in data
        publishing_id = data["publishing_id"]

def test_publish_reel_job_user_id(client, mock_instagram_provider):
    """Test that publishing creates a JobItem with correct user_id."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-user-id"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == 200

    # Set reel to READY_TO_PUBLISH with video (mocked)
    from app.services.reel import ReelService
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = ReelService(db)
        reel = service.get_reel(reel_id, user_id=1)  # user_id=1 from override
        if reel:
            from app.schemas.reel import ReelItemUpdate
            update = ReelItemUpdate(
                status=ReelStatus.READY_TO_PUBLISH.value,
                video_path="/tmp/fake_video.mp4",
                captions="Test caption"
            )
            service.repository.update(reel, update)
            db.commit()
    finally:
        db.close()

    # Mock ReelService.validate_final_reel and get_publishable_video_url
    with patch('app.services.reel.ReelService.validate_final_reel') as mock_validate, \
         patch('app.services.reel.ReelService.get_publishable_video_url') as mock_get_url:
        mock_validate.return_value = {"valid": True, "errors": []}
        mock_get_url.return_value = "http://localhost:8000/video/1"

        # Publish
        publish_response = client.post(f"/reels/{reel_id}/publish")
        assert publish_response.status_code == 200
        data = publish_response.json()
        assert "publishing_id" in data
        publishing_id = data["publishing_id"]

        # Check that a job of type INSTAGRAM_PUBLISH was created for the correct user
        from app.models.job import JobItem
        db = SessionLocal()
        try:
            job = db.query(JobItem).filter(
                JobItem.reel_id == reel_id,
                JobItem.type == JobType.INSTAGRAM_PUBLISH.value
            ).first()
            assert job is not None, "JobItem should be created"
            assert job.user_id == 1, f"Expected user_id=1, got {job.user_id}"  # Matches the override in test client
            assert job.status == JobStatus.PENDING.value
            assert job.progress == 0
        finally:
            db.close()
