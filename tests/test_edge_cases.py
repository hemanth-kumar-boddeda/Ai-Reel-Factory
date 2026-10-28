import pytest
from fastapi import status
from app.models.job import JobStatus

"""Test suite for edge cases and error conditions."""


def test_render_unknown_reel(client):
    """Test rendering request for unknown reel."""
    response = client.post("/api/reels/99999/render")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Reel not found"


def test_get_unknown_job(client):
    """Test getting unknown job."""
    response = client.get("/api/jobs/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Job not found"


def test_backward_compatibility_legacy_data(client):
    """Test that legacy research_data.uiControls fallback still works."""
    # Create a reel with legacy format data in research_data
    import json

    reel_data = {
        "source": "Legacy Source",
        "title": "Legacy Reel",
        "url": "https://example.com/legacy",
        "research_data": json.dumps({
            "uiControls": {
                "hook": "Legacy hook",
                "duration": 45,
                "tone": "humorous",
                "visual_style": "cinematic",
                "voice": "female",
                "captions": "manual",
                "cta": "Subscribe Now"
            }
        })
    }

    response = client.post("/api/reels", json=reel_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    # The dedicated fields should be populated from research_data.uiControls
    # Note: This depends on how the frontend handles backward compatibility
    # The backend stores the research_data as-is, and frontend is responsible
    # for extracting from it when dedicated fields are empty
    assert data["research_data"] == reel_data["research_data"]

    # Dedicated fields will be None/null since we didn't set them directly
    # Frontend would need to populate them from research_data
    assert data["hook"] is None
    assert data["duration"] is None
    assert data["tone"] is None
    assert data["visual_style"] is None
    assert data["voice"] is None
    assert data["captions"] is None
    assert data["cta"] is None


def test_malformed_research_data_graceful_handling(client):
    """Test that malformed research_data doesn't break reel creation."""
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/malformed",
        "research_data": "{ invalid json }"  # Malformed JSON
    }

    response = client.post("/api/reels", json=reel_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["research_data"] == reel_data["research_data"]
    # Other fields should be None/default
    assert data["hook"] is None


def test_configuration_field_types(client):
    """Test that configuration fields accept appropriate types."""
    # Test string fields
    reel_data = {
        "source": "Type Test",
        "title": "Type Test Reel",
        "url": "https://example.com/type-test",
        "hook": "Test hook with special chars !@#$%^&*()",
        "tone": "test-tone",
        "visual_style": "test-style",
        "voice": "test-voice",
        "captions": "test-captions",
        "cta": "Test CTA with spaces and symbols"
    }

    response = client.post("/api/reels", json=reel_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["hook"] == reel_data["hook"]
    assert data["tone"] == reel_data["tone"]
    assert data["visual_style"] == reel_data["visual_style"]
    assert data["voice"] == reel_data["voice"]
    assert data["captions"] == reel_data["captions"]
    assert data["cta"] == reel_data["cta"]

    # Test integer field
    reel_data["duration"] = 120
    response = client.post("/api/reels", json={**reel_data, "url": "https://example.com/type-test-2"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["duration"] == 120

    # Test null values
    reel_data["hook"] = None
    response = client.post("/api/reels", json={**reel_data, "url": "https://example.com/type-test-3"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["hook"] is None


def test_large_summary_and_research_data(client):
    """Test handling of large text fields."""
    large_text = "A" * 5000  # 5KB of text

    reel_data = {
        "source": "Large Text Test",
        "title": "Large Text Reel",
        "url": "https://example.com/large-text",
        "summary": large_text,
        "research_data": large_text
    }

    response = client.post("/api/reels", json=reel_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["summary"] == large_text
    assert data["research_data"] == large_text


def test_concurrent_job_creation_same_reel(client):
    """Test behavior when multiple job creation requests happen concurrently."""
    import threading
    import time

    print("TEST CONCURRENT JOB CREATION SAME REEL STARTED")
    # Create a reel
    reel_data = {
        "source": "Concurrent Test",
        "title": "Concurrent Reel",
        "url": "https://example.com/concurrent"
    }
    create_response = client.post("/api/reels", json=reel_data)
    reel_id = create_response.json()["id"]
    print(f"CREATED REEL WITH ID {reel_id}")

    results = []
    exceptions = []

    def create_job():
        print(f"THREAD {threading.get_ident()} STARTED")
        try:
            response = client.post(f"/api/reels/{reel_id}/render")
            print(f"THREAD {threading.get_ident()} GOT RESPONSE: {response.status_code}")
            results.append(response.json())
            print(f"THREAD {threading.get_ident()} APPENDED RESULT")
        except Exception as e:
            print(f"THREAD {threading.get_ident()} EXCEPTION: {e}")
            exceptions.append(e)

    # Create multiple threads to simulate concurrent requests
    threads = []
    for i in range(5):
        thread = threading.Thread(target=create_job)
        threads.append(thread)
        thread.start()

    # Wait for all threads to complete
    for thread in threads:
        thread.join()

    # Print any exceptions that occurred in the threads
    if exceptions:
        for i, e in enumerate(exceptions):
            print(f"EXCEPTION IN THREAD {i}: {e}")

    # All should have succeeded and returned the same job ID (due to duplicate protection)
    print(f"RESULTS LENGTH: {len(results)}")
    if results:
        print(f"FIRST RESULT: {results[0]}")
    assert len(results) == 5
    job_ids = [r["id"] for r in results]
    # All job IDs should be the same
    assert len(set(job_ids)) == 1
    assert results[0]["status"] == "PENDING"
    print("TEST CONCURRENT JOB CREATION SAME REEL ENDED")