"""Focused regression test for Instagram publish job lifecycle."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from app.models.job import JobStatus, JobType
from app.models.instagram import InstagramConnectionStatus
from app.models.instagram_publishing import PublishingStatus
from app.models.reel import ReelStatus


def test_instagram_publish_job_lifecycle(client, mock_instagram_provider):
    """Test that Instagram publish creates a JobItem with user_id, status QUEUED, and invokes RQ enqueue."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-ig-lifecycle"
    }
    create_response = client.post("/api/reels", json=reel_data)
    assert create_response.status_code == status.HTTP_200_OK
    reel_id = create_response.json()["id"]

    # Create Instagram connection (dev mode)
    connect_response = client.post("/instagram/connect")
    assert connect_response.status_code == status.HTTP_200_OK

    # Set reel to READY_TO_PUBLISH with video and caption
    from app.services.reel import ReelService
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = ReelService(db)
        reel = service.get_reel(reel_id, user_id=1)  # user_id=1 from test client override
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

    # Mock the RQ queue enqueue to capture the call
    with patch('app.jobs.queue.get_queue') as mock_get_queue:
        mock_queue = MagicMock()
        mock_get_queue.return_value = mock_queue

        # Mock ReelService.validate_final_reel and get_publishable_video_url
        with patch('app.services.reel.ReelService.validate_final_reel') as mock_validate, \
             patch('app.services.reel.ReelService.get_publishable_video_url') as mock_get_url:
            mock_validate.return_value = {"valid": True, "errors": []}
            mock_get_url.return_value = "http://localhost:8000/video/1"

            # Publish request
            publish_response = client.post(f"/reels/{reel_id}/publish")
            assert publish_response.status_code == status.HTTP_200_OK
            data = publish_response.json()
            assert "publishing_id" in data
            publishing_id = data["publishing_id"]

            # Verify that the RQ queue's enqueue method was called
            mock_get_queue.assert_called_once()
            mock_queue.enqueue.assert_called_once()
            # Check that the enqueued function is the correct one
            args, kwargs = mock_queue.enqueue.call_args
            assert args[0] == 'app.jobs.processor:process_instagram_publish_job'
            job_id = args[1]  # job_id
            assert isinstance(job_id, int)

            # Verify that a job of type INSTAGRAM_PUBLISH was created with correct user_id and status QUEUED
            from app.models.job import JobItem
            db = SessionLocal()
            try:
                job = db.query(JobItem).filter(
                    JobItem.id == job_id,
                    JobItem.type == JobType.INSTAGRAM_PUBLISH.value
                ).first()
                assert job is not None, "JobItem should be created"
                assert job.user_id == 1, f"Expected user_id=1, got {job.user_id}"  # Matches the override in test client
                assert job.status == JobStatus.QUEUED.value, f"Expected status QUEUED, got {job.status}"
                assert job.reel_id == reel_id, f"Expected reel_id {reel_id}, got {job.reel_id}"
                assert job.progress == 0
                assert job.result is None
                assert job.error is None
            finally:
                db.close()

            # Verify that a publishing record exists and is in PENDING status
            from app.models.instagram_publishing import InstagramPublishing
            db = SessionLocal()
            try:
                publishing = db.query(InstagramPublishing).filter(InstagramPublishing.id == publishing_id).first()
                assert publishing is not None
                assert publishing.status == PublishingStatus.PENDING.value
                assert publishing.reel_id == reel_id
                assert publishing.user_id == 1
            finally:
                db.close()