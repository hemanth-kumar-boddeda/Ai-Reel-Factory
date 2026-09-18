"""Test suite for job processing logic and duplicate protection."""
import pytest
from fastapi import status
from unittest.mock import patch
from app.models.job import JobStatus, JobType
from app.models.reel import ReelStatus


def test_duplicate_job_protection(client):
    """Test that duplicate active jobs are prevented."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-duplicate"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create first job
    response1 = client.post(f"/api/reels/{reel_id}/render")
    assert response1.status_code == status.HTTP_200_OK
    job1 = response1.json()
    assert job1["status"] == JobStatus.PENDING.value

    # Attempt to create second job while first is pending
    response2 = client.post(f"/api/reels/{reel_id}/render")
    assert response2.status_code == status.HTTP_200_OK
    job2 = response2.json()

    # Should return the same job (duplicate protection)
    assert job2["id"] == job1["id"]
    assert job2["status"] == JobStatus.PENDING.value


def test_duplicate_job_allows_after_completion(client):
    """Test that new jobs can be created after previous job completes."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-duplicate-complete"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create first job
    response1 = client.post(f"/api/reels/{reel_id}/render")
    job1_id = response1.json()["id"]

    # Mock the job completion process
    with patch('app.main.process_reel_job') as mock_process:
        # Simulate job completion by directly updating via service
        # In real scenario, background task would call this
        pass

    # For this test, we'll manually update the job to completed state
    # to simulate completion, then verify we can create a new job

    # Since we can't easily trigger the background task in test,
    # let's test the service method directly which has the duplicate logic
    from app.services.reel import ReelService
    from app.database import SessionLocal
    from app.database import Base, engine

    # Create a fresh database for this specific test
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestingSessionLocal()

    try:
        service = ReelService(db)

        # Create a reel directly via repository
        from app.repositories.reel import ReelRepository
        from app.schemas.reel import ReelItemCreate
        reel_repo = ReelRepository(db)
        reel_in = ReelItemCreate(
            source="Test",
            title="Test Reel",
            url="https://example.com/test-service-dup"
        )
        reel = reel_repo.create(reel_in)

        # Create first job
        job1 = service.create_job(reel.id, JobType.RENDER)
        assert job1 is not None
        assert job1.status == JobStatus.PENDING

        # Try to create second job while first is pending - should return existing
        job2 = service.create_job(reel.id, JobType.RENDER)
        assert job2 is not None
        assert job2.id == job1.id  # Same job returned

        # Update first job to completed
        from app.schemas.job import JobUpdate
        job_update = JobUpdate(status=JobStatus.COMPLETED, progress=100)
        completed_job = service.update_job(job1.id, job_update)
        assert completed_job.status == JobStatus.COMPLETED

        # Now create a new job - should succeed
        job3 = service.create_job(reel.id, JobType.RENDER)
        assert job3 is not None
        assert job3.id != job1.id  # New job created
        assert job3.status == JobStatus.PENDING

    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


def test_job_processing_success(client, mock_make_video):
    """Test successful job processing updates reel to ready state."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-process-success",
        "hook": "Test hook",
        "duration": 30
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create a job
    job_response = client.post(f"/api/reels/{reel_id}/render")
    job_id = job_response.json()["id"]

    # Process the job (this would normally happen in background task)
    # We'll call the processing function directly for testing
    from app.main import process_reel_job
    process_reel_job(job_id, reel_id)

    # Check that job is completed
    job_response = client.get(f"/api/jobs/{job_id}")
    job_data = job_response.json()
    assert job_data["status"] == "COMPLETED"
    assert job_data["progress"] == 100
    assert "processed successfully" in job_data["result"]

    # Check that reel is updated to ready state
    reel_response = client.get(f"/api/reel/{reel_id}")
    reel_data = reel_response.json()
    assert reel_data["status"] == "READY_TO_PUBLISH"
    assert reel_data["video_path"] is not None
    assert reel_data["qa_score"] == 95.0


def test_job_processing_failure(client):
    """Test job failure handling."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-process-fail"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create a job
    job_response = client.post(f"/api/reels/{reel_id}/render")
    job_id = job_response.json()["id"]

    # Mock the video generation to fail
    with patch('app.services.reel.ReelService.make_video') as mock_make_video:
        mock_make_video.side_effect = Exception("FFmpeg failed")

        # Process the job
        from app.main import process_reel_job
        process_reel_job(job_id, reel_id)

    # Check that job is failed
    job_response = client.get(f"/api/jobs/{job_id}")
    job_data = job_response.json()
    assert job_data["status"] == "FAILED"
    assert "FFmpeg failed" in job_data["error"]

    # Check that reel is updated to failed state
    reel_response = client.get(f"/api/reel/{reel_id}")
    reel_data = reel_response.json()
    assert reel_data["status"] == "FAILED"


def test_job_retry_after_failure(client, mock_make_video):
    """Test that a new job can be created after a previous job fails."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-retry"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]

    # Create first job and make it fail
    job1_response = client.post(f"/api/reels/{reel_id}/render")
    job1_id = job1_response.json()["id"]

    with patch('app.services.reel.ReelService.make_video') as mock_make_video:
        mock_make_video.side_effect = Exception("FFmpeg failed")
        from app.main import process_reel_job
        process_reel_job(job1_id, reel_id)

    # Verify first job is failed
    job1_response = client.get(f"/api/jobs/{job1_id}")
    job1_data = job1_response.json()
    assert job1_data["status"] == "FAILED"

    # Create second job - should succeed
    job2_response = client.post(f"/api/reels/{reel_id}/render")
    assert job2_response.status_code == 200
    job2_data = job2_response.json()
    assert job2_data["id"] != job1_id  # Different job ID
    assert job2_data["status"] == "PENDING"


def test_per_reel_isolation(client):
    """Test that jobs are properly isolated per reel."""
    # Create two reels
    reel_a_data = {
        "source": "Source A",
        "title": "Reel A",
        "url": "https://example.com/reel-a"
    }
    reel_b_data = {
        "source": "Source B",
        "title": "Reel B",
        "url": "https://example.com/reel-b"
    }

    reel_a_response = client.post("/api/reels", json=reel_a_data)
    reel_b_response = client.post("/api/reels", json=reel_b_data)

    reel_a_id = reel_a_response.json()["id"]
    reel_b_id = reel_b_response.json()["id"]

    # Create job for reel A
    job_a_response = client.post(f"/api/reels/{reel_a_id}/render")
    job_a_data = job_a_response.json()

    # Create job for reel B
    job_b_response = client.post(f"/api/reels/{reel_b_id}/render")
    job_b_data = job_b_response.json()

    # Verify isolation
    assert job_a_data["reel_id"] == reel_a_id
    assert job_b_data["reel_id"] == reel_b_id
    assert job_a_data["id"] != job_b_data["id"]

    # Verify retrieving jobs by reel ID works correctly
    # Get job for reel A
    job_a_get = client.get(f"/api/jobs/{job_a_data['id']}").json()
    assert job_a_get["reel_id"] == reel_a_id

    # Get job for reel B
    job_b_get = client.get(f"/api/jobs/{job_b_data['id']}").json()
    assert job_b_get["reel_id"] == reel_b_id

    # Verify that reel B is not affected by reel A's job processing
    # (This is more of a logical check - the databases are separate)