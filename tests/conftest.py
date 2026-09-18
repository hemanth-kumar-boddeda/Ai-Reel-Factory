import pytest
import tempfile
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from app.core.config import Settings
from unittest.mock import patch


# Override settings for testing
class TestSettings(Settings):
    DATABASE_URL: str = "sqlite:///:memory:"
    MOCK_MODE: bool = True  # Use mock mode to avoid FFmpeg dependencies


@pytest.fixture(scope="function")
def test_settings():
    return TestSettings()


@pytest.fixture(scope="function")
def test_engine(test_settings):
    """Create a fresh database engine for each test."""
    engine = create_engine(
        test_settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_engine):
    """Create a fresh database session for each test."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session, test_settings):
    """Create a test client with dependency overrides."""
    # Override the get_db dependency to use our test session
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    # Override settings
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[Settings] = lambda: test_settings

    with TestClient(app) as test_client:
        yield test_client

    # Clean up overrides
    app.dependency_overrides.clear()


@pytest.fixture
def mock_make_video():
    """Mock the make_video method to avoid FFmpeg calls."""
    with patch('app.services.reel.ReelService.make_video'):
        yield