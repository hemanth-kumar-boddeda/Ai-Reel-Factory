"""Test suite for Analytics endpoint."""
import pytest
from fastapi import status
from datetime import datetime, timezone, timedelta
from app.models.reel import ReelItem, ReelStatus
from app.models.job import JobItem, JobStatus, JobType
from app.models.user import UserItem, UserRole


def test_analytics_empty_account(db_session, client):
    """Analytics for a user with no reels or jobs."""
    response = client.get("/api/analytics")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Reel stats: all zero
    expected_reel_stats = {status.value: 0 for status in ReelStatus}
    assert data["reel_stats"] == expected_reel_stats

    # Job stats: all zero
    expected_job_stats = {status.value: 0 for status in JobStatus}
    assert data["job_stats"] == expected_job_stats

    assert data["total_reels"] == 0
    # Rendering success rate: 0 when no finished jobs
    assert data["rendering_success_rate"] == 0.0

    # Trends: 7 days of zero counts
    today = datetime.now(timezone.utc).date()
    seven_days_ago = today - timedelta(days=6)  # inclusive range of 7 days
    expected_trend_length = 7
    assert len(data["reel_creation_trend"]) == expected_trend_length
    assert len(data["job_creation_trend"]) == expected_trend_length
    for i, day_entry in enumerate(data["reel_creation_trend"]):
        expected_date = (seven_days_ago + timedelta(days=i)).isoformat()
        assert day_entry["date"] == expected_date
        assert day_entry["count"] == 0
    for i, day_entry in enumerate(data["job_creation_trend"]):
        expected_date = (seven_days_ago + timedelta(days=i)).isoformat()
        assert day_entry["date"] == expected_date
        assert day_entry["count"] == 0


def test_analytics_with_data(db_session, client):
    """Analytics with a mix of reels and jobs."""
    # Override the get_db dependency to use the test's db_session
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    from app.main import app
    from app.database import get_db
    app.dependency_overrides[get_db] = override_get_db
    try:
        # Create a user (the test user from conftest has id=1)
        user_id = 1

        # Create reels with various statuses
        reel_statuses = [
            ReelStatus.DISCOVERED,
            ReelStatus.SCRIPTING,
            ReelStatus.STORYBOARDING,
            ReelStatus.ASSET_GENERATION,
            ReelStatus.VOICE_GENERATION,
            ReelStatus.RENDERING,
            ReelStatus.QA,
            ReelStatus.READY_TO_PUBLISH,
            ReelStatus.PUBLISHED,
            ReelStatus.FAILED,
        ]
        for i, reel_status in enumerate(reel_statuses):
            reel = ReelItem(
                source=f"source{i}",
                title=f"title{i}",
                url=f"http://example.com/{i}",
                summary=f"summary{i}",
                score=50,
                status=reel_status.value,
                user_id=user_id,
            )
            db_session.add(reel)
        db_session.commit()

        # Debug: check what we have in the database by writing to test.log
        from sqlalchemy import func
        reel_counts = db_session.query(ReelItem.status, func.count(ReelItem.id)).filter(ReelItem.user_id == user_id).group_by(ReelItem.status).all()
        with open("./test.log", "a") as f:
            f.write(f"Reel counts from db_session: {reel_counts}\\n")
        job_counts = db_session.query(JobItem.status, func.count(JobItem.id)).filter(JobItem.user_id == user_id).group_by(JobItem.status).all()
        with open("./test.log", "a") as f:
            f.write(f"Job counts from db_session: {job_counts}\\n")

        # Create jobs with various statuses
        job_statuses = [
            JobStatus.PENDING,
            JobStatus.PROCESSING,
            JobStatus.COMPLETED,
            JobStatus.FAILED,
        ]
        for i, job_status in enumerate(job_statuses):
            job = JobItem(
                reel_id=i + 1,  # assume reel IDs are 1..10
                user_id=user_id,
                type=JobType.RENDER.value,
                status=job_status.value,
            )
            db_session.add(job)
        db_session.commit()

        # Debug after jobs
        reel_counts_after = db_session.query(ReelItem.status, func.count(ReelItem.id)).filter(ReelItem.user_id == user_id).group_by(ReelItem.status).all()
        with open("./test.log", "a") as f:
            f.write(f"Reel counts after jobs: {reel_counts_after}\\n")
        job_counts_after = db_session.query(JobItem.status, func.count(JobItem.id)).filter(JobItem.user_id == user_id).group_by(JobItem.status).all()
        with open("./test.log", "a") as f:
            f.write(f"Job counts after jobs: {job_counts_after}\\n")

        # Request analytics
        response = client.get("/api/analytics")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify reel stats counts - only the statuses we created should have count 1
        for reel_status in reel_statuses:
            assert data["reel_stats"][reel_status.value] == 1  # one per created status

        # Verify that other statuses have count 0
        for reel_status in ReelStatus:
            if reel_status not in reel_statuses:
                assert data["reel_stats"][reel_status.value] == 0  # zero for non-created statuses

        # Verify job stats counts - only the statuses we created should have count 1
        for job_status in job_statuses:
            assert data["job_stats"][job_status.value] == 1  # one per created status

        # Verify that other job statuses have count 0
        for job_status in JobStatus:
            if job_status not in job_statuses:
                assert data["job_stats"][job_status.value] == 0  # zero for non-created statuses

        # Total reels = number of reel statuses
        assert data["total_reels"] == len(reel_statuses)

        # Rendering success rate: completed jobs / (completed + failed)
        completed_jobs = data["job_stats"].get(JobStatus.COMPLETED.value, 0)
        failed_jobs = data["job_stats"].get(JobStatus.FAILED.value, 0)
        total_finished = completed_jobs + failed_jobs
        expected_success_rate = (
            (completed_jobs / total_finished * 100) if total_finished > 0 else 0.0
        )
        assert data["rendering_success_rate"] == round(expected_success_rate, 2)

        # Verify trends have 7 days with appropriate counts (our created items have today's timestamp)
        # Since we just created them, they should appear in today's count.
        today = datetime.now(timezone.utc).date()
        seven_days_ago = today - timedelta(days=6)

        # Debug: print the trend data
        with open("./test.log", "a") as f:
            f.write(f"Today: {today}\\n")
            f.write(f"Seven days ago: {seven_days_ago}\\n")
            f.write(f"Reel trend: {data['reel_creation_trend']}\\n")
            f.write(f"Job trend: {data['job_creation_trend']}\\n")

        # Reel trend: today should have count = number of reels (10), other days 0
        reel_trend = data["reel_creation_trend"]
        assert len(reel_trend) == 7
        for i, day_entry in enumerate(reel_trend):
            expected_date = (seven_days_ago + timedelta(days=i)).isoformat()
            assert day_entry["date"] == expected_date
            if day_entry["date"] == today.isoformat():
                assert day_entry["count"] == len(reel_statuses), f"Expected {len(reel_statuses)} reels for today {today}, got {day_entry['count']}"
            else:
                assert day_entry["count"] == 0, f"Expected 0 reels for {day_entry['date']}, got {day_entry['count']}"

        # Job trend: today should have count = number of jobs (4), other days 0
        job_trend = data["job_creation_trend"]
        assert len(job_trend) == 7
        for i, day_entry in enumerate(job_trend):
            expected_date = (seven_days_ago + timedelta(days=i)).isoformat()
            assert day_entry["date"] == expected_date
            if day_entry["date"] == today.isoformat():
                assert day_entry["count"] == len(job_statuses), f"Expected {len(job_statuses)} jobs for today {today}, got {day_entry['count']}"
            else:
                assert day_entry["count"] == 0, f"Expected 0 jobs for {day_entry['date']}, got {day_entry['count']}"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_analytics_user_isolation(db_session, client):
    """Ensure a user cannot see another user's analytics."""
    # Override the get_db dependency to use the test's db_session
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    from app.main import app
    from app.database import get_db
    app.dependency_overrides[get_db] = override_get_db
    try:
        user_a_id = 1  # from conftest override
        user_b_id = 2

        # Create a reel and job for user B
        reel_b = ReelItem(
            source="userB",
            title="userB reel",
            url="http://example.com/userB",
            summary="summary",
            score=50,
            status=ReelStatus.PUBLISHED.value,
            user_id=user_b_id,
        )
        db_session.add(reel_b)
        db_session.commit()

        job_b = JobItem(
            reel_id=reel_b.id,
            user_id=user_b_id,
            type=JobType.RENDER.value,
            status=JobStatus.COMPLETED.value,
        )
        db_session.add(job_b)
        db_session.commit()

        # Now request analytics for user A (the overridden test user)
        response = client.get("/api/analytics")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # User A should have zero reels and zero jobs (since we didn't create any for user A)
        assert data["total_reels"] == 0
        assert data["rendering_success_rate"] == 0.0
        # All stats zero
        assert all(v == 0 for v in data["reel_stats"].values())
        assert all(v == 0 for v in data["job_stats"].values())
        # Trends should be all zero
        for entry in data["reel_creation_trend"]:
            assert entry["count"] == 0
        for entry in data["job_creation_trend"]:
            assert entry["count"] == 0
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_analytics_unauthenticated(client):
    """Unauthenticated requests should receive 401."""
    # Temporarily override the dependency to return None (simulating missing auth)
    from app.main import app
    from app.main import get_current_active_user

    # Save original override if any (but conftest already set it globally)
    # We'll set a new override that returns None
    app.dependency_overrides[get_current_active_user] = lambda: None
    try:
        response = client.get("/api/analytics")
        # The endpoint checks for current_user is None and raises HTTPException 401
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    finally:
        # Remove the override
        app.dependency_overrides.pop(get_current_active_user, None)