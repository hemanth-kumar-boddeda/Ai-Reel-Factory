import pytest
import threading
from app.core.config import Settings
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app as fastapi_app
from app.database import Base, get_db
from app.models.reel import ReelItem, ReelStatus
from app.models.job import JobItem, JobStatus, JobType
from app.models.user import UserItem, UserRole


class TestSettings(Settings):
    DATABASE_URL: str = "sqlite:///:memory:"
    MOCK_MODE: bool = True  # Use mock mode to avoid FFmpeg dependencies
    INSTAGRAM_DEV_MODE: bool = True  # Enable dev mode for Instagram connection


@pytest.fixture(scope="function")
def test_settings():
    with open("./test.log", "a") as f:
        f.write(f"TEST_SETTINGS FIXTURE SET UP: thread={threading.get_ident()}\n")
    return TestSettings()


@pytest.fixture(scope="function")
def test_engine(test_settings):
    """Create a fresh database engine for each test."""
    with open("./test.log", "a") as f:
        f.write(f"TEST_ENGINE FIXTURE SET UP: thread={threading.get_ident()}\n")
    engine = create_engine(
        test_settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    print("Tables created:", list(Base.metadata.tables.keys()))
    yield engine
    with open("./test.log", "a") as f:
        f.write(f"TEST_ENGINE FIXTURE TEAR DOWN: thread={threading.get_ident()}\n")
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(test_engine):
    """Create a fresh database session for each test."""
    with open("./test.log", "a") as f:
        f.write(f"DB_SESSION FIXTURE SET UP: thread={threading.get_ident()}\n")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
    with open("./test.log", "a") as f:
        f.write(f"DB_SESSION FIXTURE TEAR DOWN: thread={threading.get_ident()}\n")


@pytest.fixture(autouse=True)
def patch_dependencies(test_engine, test_settings):
    """Patch dependencies to use test database."""
    # Patch the database sessionmaker in app.database
    import app.database
    original_session_local = app.database.SessionLocal
    app.database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # ALSO patch it in app.jobs.processor where process_reel_job is defined
    import app.jobs.processor
    if hasattr(app.jobs.processor, 'SessionLocal'):
        original_processor_session_local = app.jobs.processor.SessionLocal
    else:
        original_processor_session_local = None

    app.jobs.processor.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Also patch in app.jobs.tasks
    import app.jobs.tasks
    if hasattr(app.jobs.tasks, 'SessionLocal'):
        original_tasks_session_local = app.jobs.tasks.SessionLocal
    else:
        original_tasks_session_local = None
    app.jobs.tasks.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Patch the get_db dependency
    def override_get_db():
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    # Override authentication to return a test user
    from app.models.user import UserItem, UserRole
    from app.core.security import get_current_active_user
    test_user = UserItem(id=1, email="test@example.com", hashed_password="dummy", is_active=True, role=UserRole.USER)
    fastapi_app.dependency_overrides[get_current_active_user] = lambda: test_user

    # Patch the settings object in place to affect already imported modules
    import app.core.config
    for key, value in test_settings.model_dump().items():
        setattr(app.core.config.settings, key, value)

    yield

    # Restore original state
    app.database.SessionLocal = original_session_local
    if original_processor_session_local is not None:
        app.jobs.processor.SessionLocal = original_processor_session_local
    elif hasattr(app.jobs.processor, 'SessionLocal'):
        delattr(app.jobs.processor, 'SessionLocal')
    if original_tasks_session_local is not None:
        app.jobs.tasks.SessionLocal = original_tasks_session_local
    elif hasattr(app.jobs.tasks, 'SessionLocal'):
        delattr(app.jobs.tasks, 'SessionLocal')

    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client(test_engine):
    """Create a test client."""
    with open("./test.log", "a") as f:
        f.write(f"CLIENT FIXTURE SET UP: thread={threading.get_ident()}\n")
    with TestClient(fastapi_app) as test_client:
        yield test_client
    with open("./test.log", "a") as f:
        f.write(f"CLIENT FIXTURE TEAR DOWN: thread={threading.get_ident()}\n")


@pytest.fixture
def mock_make_video():
    """Mock the make_video method to avoid FFmpeg calls."""
    with open("./test.log", "a") as f:
        f.write(f"MOCK_MAKE_VIDEO FIXTURE SET UP: thread={threading.get_ident()}\n")
    with patch('app.services.reel.ReelService.make_video'):
        yield
    with open("./test.log", "a") as f:
        f.write(f"MOCK_MAKE_VIDEO FIXTURE TEAR DOWN: thread={threading.get_ident()}\n")


@pytest.fixture(autouse=True)
def patch_redis():
    """Patch Redis to use fakeredis for tests."""
    import fakeredis
    # Patch the get_redis_connection function in app.jobs.queue to return a fakeredis instance
    import app.jobs.queue
    original_get_redis_connection = app.jobs.queue.get_redis_connection
    def mock_get_redis_connection():
        return fakeredis.FakeRedis()
    app.jobs.queue.get_redis_connection = mock_get_redis_connection
    # Also reset the cached connection and queue to avoid using the old one
    app.jobs.queue._redis_connection = None
    app.jobs.queue._rq_queue = None
    yield
    # Restore
    app.jobs.queue.get_redis_connection = original_get_redis_connection
