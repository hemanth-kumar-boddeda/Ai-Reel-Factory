import pytest
from fastapi import status
from unittest.mock import patch, MagicMock

from app.core.config import settings
from app.models.job import JobStatus


def test_background_backend_remains_functional(client):
    """Test that the background backend still works as before."""
    with patch.object(settings, "JOB_QUEUE_BACKEND", "background"):
        # Create a reel
        reel_data = {
            "source": "Test Source",
            "title": "Test Reel",
            "url": "https://example.com/test",
            "hook": "Test hook",
            "duration": 30
        }
        response = client.post("/api/reels", json=reel_data)
        assert response.status_code == status.HTTP_200_OK
        reel_id = response.json()["id"]

        # Mock background_tasks to capture the task
        with patch('fastapi.BackgroundTasks.add_task') as mock_add_task:
            response = client.post(f"/api/reels/{reel_id}/render")
            assert response.status_code == status.HTTP_200_OK
            job_data = response.json()
            assert job_data["reel_id"] == reel_id
            assert job_data["status"] == JobStatus.QUEUED.value

            # Verify that a background task was added
            mock_add_task.assert_called_once()
            # Check that the task is process_reel_job with the correct args
            args, kwargs = mock_add_task.call_args
            assert args[0].__name__ == 'process_reel_job'  # The function
            assert args[1] == job_data["id"]  # job_id (positional argument)
            # Note: reel_id is no longer passed as a separate argument; it's derived from the JobItem in the processor

def test_rq_backend_enqueues_to_queue(client):
    """Test that the RQ backend enqueues a job to the RQ queue."""
    with patch.object(settings, "JOB_QUEUE_BACKEND", "rq"):
        # Create a reel
        reel_data = {
            "source": "Test Source",
            "title": "Test Reel",
            "url": "https://example.com/test-rq",
            "hook": "Test hook",
            "duration": 30
        }
        response = client.post("/api/reels", json=reel_data)
        assert response.status_code == status.HTTP_200_OK
        reel_id = response.json()["id"]

        # Mock the RQ queue and its enqueue method
        with patch('app.jobs.queue.get_queue') as mock_get_queue:
            mock_queue = MagicMock()
            mock_get_queue.return_value = mock_queue

            # Also mock background_tasks to ensure it's not used
            with patch('fastapi.BackgroundTasks.add_task') as mock_add_task:
                response = client.post(f"/api/reels/{reel_id}/render")
                assert response.status_code == status.HTTP_200_OK
                job_data = response.json()
                assert job_data["reel_id"] == reel_id
                assert job_data["status"] == JobStatus.QUEUED.value

                # Verify that the RQ queue's enqueue method was called
                mock_get_queue.assert_called_once()
                mock_queue.enqueue.assert_called_once()
                # Check that the enqueued function is the correct one
                args, kwargs = mock_queue.enqueue.call_args
                assert args[0] == 'app.jobs.processor:process_reel_job'
                assert args[1] == job_data["id"]  # job_id
                # Note: reel_id is no longer passed as a separate argument; it's derived from the JobItem in the processor

                # Verify that background_tasks was NOT used
                mock_add_task.assert_not_called()

def test_rq_backend_does_not_also_schedule_background_tasks(client):
    """Test that when using RQ backend, we do not also schedule a BackgroundTask."""
    with patch.object(settings, "JOB_QUEUE_BACKEND", "rq"):
        # Create a reel
        reel_data = {
            "source": "Test Source",
            "title": "Test Reel",
            "url": "https://example.com/test-no-dup",
            "hook": "Test hook",
            "duration": 30
        }
        response = client.post("/api/reels", json=reel_data)
        assert response.status_code == status.HTTP_200_OK
        reel_id = response.json()["id"]

        with patch('app.jobs.queue.get_queue') as mock_get_queue:
            mock_get_queue.return_value = MagicMock()
            with patch('fastapi.BackgroundTasks.add_task') as mock_add_task:
                response = client.post(f"/api/reels/{reel_id}/render")
                assert response.status_code == status.HTTP_200_OK
                # Ensure no background task was added
                mock_add_task.assert_not_called()

def test_rq_backend_redis_unavailable(client):
    """Test that when Redis is unavailable, the RQ backend fails gracefully."""
    with patch.object(settings, "JOB_QUEUE_BACKEND", "rq"):
        # Create a reel
        reel_data = {
            "source": "Test Source",
            "title": "Test Reel",
            "url": "https://example.com/test-redis-fail",
            "hook": "Test hook",
            "duration": 30
        }
        response = client.post("/api/reels", json=reel_data)
        assert response.status_code == status.HTTP_200_OK
        reel_id = response.json()["id"]

        # Mock get_queue to return a mock queue whose enqueue method raises an exception
        with patch('app.jobs.queue.get_queue') as mock_get_queue:
            mock_queue = MagicMock()
            mock_get_queue.return_value = mock_queue
            mock_queue.enqueue.side_effect = Exception("Redis connection failed")

            response = client.post(f"/api/reels/{reel_id}/render")
            # Should return a 500 error
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert "Failed to enqueue job" in response.json()["detail"]

def test_queue_configuration_loads_correctly():
    """Test that the queue configuration loads from settings."""
    # Test default values
    assert settings.REDIS_URL == "redis://localhost:6379/0"
    assert settings.RQ_QUEUE_NAME == "reel-render"
    assert settings.JOB_QUEUE_BACKEND == "background"

def test_api_contract_unchanged(client):
    """Test that the API contract (response shape and status codes) is unchanged."""
    # Create a reel
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-contract",
        "hook": "Test hook",
        "duration": 30
    }
    response = client.post("/api/reels", json=reel_data)
    assert response.status_code == status.HTTP_200_OK
    reel_id = response.json()["id"]

    # Test with background backend (default)
    with patch.object(settings, "JOB_QUEUE_BACKEND", "background"):
        response = client.post(f"/api/reels/{reel_id}/render")
        assert response.status_code == status.HTTP_200_OK
        job_data = response.json()
        # Check that the response has the expected fields
        assert "id" in job_data
        assert "reel_id" in job_data
        assert "type" in job_data
        assert "status" in job_data
        assert "progress" in job_data
        assert "result" in job_data
        assert "error" in job_data
        assert "created_at" in job_data
        assert "updated_at" in job_data
        assert job_data["reel_id"] == reel_id
        assert job_data["type"] == "RENDER"
        assert job_data["status"] == JobStatus.QUEUED.value
        assert job_data["progress"] == 0
        assert job_data["result"] is None
        assert job_data["error"] is None

    # Test with RQ backend (when successful)
    with patch.object(settings, "JOB_QUEUE_BACKEND", "rq"):
        with patch('app.jobs.queue.get_queue') as mock_get_queue:
            mock_queue = MagicMock()
            mock_get_queue.return_value = mock_queue
            response = client.post(f"/api/reels/{reel_id}/render")
            assert response.status_code == status.HTTP_200_OK
            job_data = response.json()
            # Same checks as above
            assert "id" in job_data
            assert "reel_id" in job_data
            assert "type" in job_data
            assert "status" in job_data
            assert "progress" in job_data
            assert "result" in job_data
            assert "error" in job_data
            assert "created_at" in job_data
            assert "updated_at" in job_data
            assert job_data["reel_id"] == reel_id
            assert job_data["type"] == "RENDER"
            assert job_data["status"] == JobStatus.QUEUED.value
            assert job_data["progress"] == 0
            assert job_data["result"] is None
            assert job_data["error"] is None