import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from app.main import app as fastapi_app
from app.database import Base, get_db
from app.core.config import Settings

@pytest.fixture(scope="function")
def test_settings():
    return Settings(DATABASE_URL="sqlite:///:memory:", MOCK_MODE=True, SECRET_KEY="test-secret-key")

@pytest.fixture(scope="function")
def test_engine(test_settings):
    engine = create_engine(
        test_settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(test_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(autouse=True)
def patch_dependencies(test_engine):
    import app.database
    original_session_local = app.database.SessionLocal
    app.database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    import app.jobs.processor
    if hasattr(app.jobs.processor, 'SessionLocal'):
        original_processor_session_local = app.jobs.processor.SessionLocal
    else:
        original_processor_session_local = None

    app.jobs.processor.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    def override_get_db():
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db

    yield

    app.database.SessionLocal = original_session_local
    if original_processor_session_local is not None:
        app.jobs.processor.SessionLocal = original_processor_session_local
    elif hasattr(app.jobs.processor, 'SessionLocal'):
        delattr(app.jobs.processor, 'SessionLocal')

    fastapi_app.dependency_overrides.clear()

@pytest.fixture
def client(test_engine):
    with TestClient(fastapi_app) as test_client:
        yield test_client

def test_register(client):
    response = client.post(
        "/auth/register",
        json={"email": "test@example.com", "password": "secret123", "is_active": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_duplicate_register(client):
    # First register
    client.post("/auth/register", json={"email": "test2@example.com", "password": "secret123", "is_active": True})
    response = client.post(
        "/auth/register",
        json={"email": "test2@example.com", "password": "secret456", "is_active": True}
    )
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_login(client):
    client.post("/auth/register", json={"email": "test3@example.com", "password": "secret123", "is_active": True})
    response = client.post(
        "/auth/login",
        data={"username": "test3@example.com", "password": "secret123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    return data["access_token"]

def test_wrong_password(client):
    client.post("/auth/register", json={"email": "test4@example.com", "password": "secret123", "is_active": True})
    response = client.post(
        "/auth/login",
        data={"username": "test4@example.com", "password": "wrong"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_protected_endpoint(client):
    token = test_login(client)
    response = client.get(
        "/api/reels",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

def test_invalid_token(client):
    response = client.get(
        "/api/reels",
        headers={"Authorization": "Bearer invalidtoken"}
    )
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

def test_ownership(client):
    # User A
    client.post("/auth/register", json={"email": "usera@example.com", "password": "secretA1", "is_active": True})
    # User B
    client.post("/auth/register", json={"email": "userb@example.com", "password": "secretB2", "is_active": True})
    
    # Login as A
    resp = client.post("/auth/login", data={"username": "usera@example.com", "password": "secretA1"})
    token_a = resp.json()["access_token"]
    # Login as B
    resp = client.post("/auth/login", data={"username": "userb@example.com", "password": "secretB2"})
    token_b = resp.json()["access_token"]
    
    # User A creates a reel
    resp = client.post(
        "/api/reels",
        json={"source": "test", "title": "Reel A", "url": "http://example.com/a", "summary": "summary"},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp.status_code == 200
    reel_a = resp.json()
    reel_id = reel_a["id"]
    
    # User A can get their reel
    resp = client.get(
        f"/api/reel/{reel_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp.status_code == 200
    
    # User B attempts to access reel A -> 404 (not found due to user_id filter)
    resp = client.get(
        f"/api/reel/{reel_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 404
    
    # User B attempts to update reel A -> 404
    resp = client.put(
        f"/api/reel/{reel_id}",
        json={"title": "Hacked"},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 404
    
    # User B attempts to delete -> 404 or 405 (if endpoint missing)
    resp = client.delete(
        f"/api/reel/{reel_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code in (404, 405)
    
    # User B attempts to render -> 404
    resp = client.post(
        f"/api/reels/{reel_id}/render",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 404
    
    # Job ownership: User A creates a job for their reel
    resp = client.post(
        f"/api/reels/{reel_id}/render",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    # Accept 200 or 500 (if enqueue fails) but not 404
    assert resp.status_code != 404
    if resp.status_code == 200:
        job_data = resp.json()
        job_id = job_data["id"]
        # User B attempts to get job -> 404
        resp = client.get(
            f"/api/jobs/{job_id}",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert resp.status_code == 404

if __name__ == "__main__":
    # Allow running as script for debugging
    pytest.main([__file__, "-v"])
