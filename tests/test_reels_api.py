"""Test suite for Reel API endpoints."""
import pytest
from fastapi import status
from app.models.reel import ReelStatus


def test_create_reel_success(client):
    """Test successful reel creation with all configuration fields."""
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test",
        "summary": "A test reel summary",
        "score": 85,
        "hook": "Test hook",
        "duration": 30,
        "tone": "informative",
        "visual_style": "modern",
        "voice": "neutral",
        "captions": "on",
        "cta": "Learn More"
    }

    response = client.post("/api/reels", json=reel_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["source"] == reel_data["source"]
    assert data["title"] == reel_data["title"]
    assert data["url"] == reel_data["url"]
    assert data["summary"] == reel_data["summary"]
    assert data["score"] == reel_data["score"]
    assert data["hook"] == reel_data["hook"]
    assert data["duration"] == reel_data["duration"]
    assert data["tone"] == reel_data["tone"]
    assert data["visual_style"] == reel_data["visual_style"]
    assert data["voice"] == reel_data["voice"]
    assert data["captions"] == reel_data["captions"]
    assert data["cta"] == reel_data["cta"]
    assert data["status"] == ReelStatus.DISCOVERED.value
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_reel_minimal_fields(client):
    """Test reel creation with minimal required fields."""
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-minimal"
    }

    response = client.post("/api/reels", json=reel_data)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["source"] == reel_data["source"]
    assert data["title"] == reel_data["title"]
    assert data["url"] == reel_data["url"]
    assert data["summary"] is None
    assert data["score"] is None
    assert data["hook"] is None
    assert data["duration"] is None
    assert data["tone"] is None
    assert data["visual_style"] is None
    assert data["voice"] is None
    assert data["captions"] is None
    assert data["cta"] is None
    assert data["status"] == ReelStatus.DISCOVERED.value


def test_get_reel_success(client):
    """Test successful reel retrieval."""
    # First create a reel
    create_data = {
        "source": "Test Source",
        "title": "Test Reel",
        "url": "https://example.com/test-get",
        "hook": "Test hook",
        "duration": 25,
        "tone": "exciting"
    }

    create_response = client.post("/api/reels", json=create_data)
    assert create_response.status_code == status.HTTP_200_OK
    created_reel = create_response.json()
    reel_id = created_reel["id"]

    # Then retrieve it
    response = client.get(f"/api/reel/{reel_id}")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["id"] == reel_id
    assert data["source"] == create_data["source"]
    assert data["title"] == create_data["title"]
    assert data["url"] == create_data["url"]
    assert data["hook"] == create_data["hook"]
    assert data["duration"] == create_data["duration"]
    assert data["tone"] == create_data["tone"]


def test_get_reel_not_found(client):
    """Test retrieval of non-existent reel."""
    response = client.get("/api/reel/99999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Reel not found"


def test_create_reel_duplicate_url(client):
    """Test that duplicate URLs are rejected."""
    reel_data = {
        "source": "Test Source",
        "title": "Test Reel 1",
        "url": "https://example.com/duplicate",
        "hook": "Hook 1"
    }

    # First creation should succeed
    response1 = client.post("/api/reels", json=reel_data)
    assert response1.status_code == status.HTTP_200_OK

    # Second creation with same URL should fail
    reel_data["title"] = "Test Reel 2"
    response2 = client.post("/api/reels", json=reel_data)
    assert response2.status_code == status.HTTP_400_BAD_REQUEST