import os
import sqlite3
import hashlib
import json
import time
import subprocess
import textwrap
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import Base, engine, get_db
from app.models.reel import ReelItem, ReelStatus
from app.schemas.reel import ReelItemCreate, ReelItemUpdate, ReelItem
from app.services.reel import ReelService
from app.schemas.job import JobCreate, JobUpdate, Job
from app.models.job import JobType, JobStatus
from app.core.security import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    encrypt_token,
    hash_password,
)
from app.models.user import UserItem, UserRole
from app.schemas.user import Token, User, UserCreate
from app.services.instagram.service import InstagramService
from app.models.instagram import InstagramConnection, InstagramConnectionStatus
from app.models.instagram_publishing import PublishingStatus, InstagramPublishing
from app.models.schedule import ScheduleItem, ScheduleItemStatus
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate
from app.jobs import queue
import logging

logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title='AI Reel Factory')

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5177",
        "http://127.0.0.1:5177",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

def get_reel_service(db: Session = Depends(get_db)) -> ReelService:
    return ReelService(db)


def get_instagram_service(db: Session = Depends(get_db)) -> InstagramService:
    return InstagramService(db)


@app.post("/auth/register", response_model=User)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    email = user_in.email.strip().lower()
    existing_user = db.query(UserItem).filter(UserItem.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = UserItem(
        email=email,
        hashed_password=hash_password(user_in.password),
        is_active=True,
        role=UserRole.USER.value,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username.strip().lower(), form_data.password)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": user.email, "user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=User)
def get_authenticated_user(current_user: UserItem = Depends(get_current_active_user)):
    return current_user


@app.get("/", response_class=HTMLResponse)
def home(service: ReelService = Depends(get_reel_service)):
    reels = service.get_reels(limit=30)
    cards = ''.join(
        f"<tr><td>{r.id}</td><td>{r.source}</td><td>{r.title}</td><td>{r.status}</td><td>{('<a href=/video/'+str(r.id)+'>video</a>') if r.video_path else ''}</td></tr>"
        for r in reels
    )
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Reel Factory</title>
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <div class="container">
        <header class="hero">
            <h1>AI Reel Factory</h1>
            <p>Your AI content engine is running.</p>
        </header>

        <div class="metrics-bar">
            <div class="metric">
                <h3>Reels Generated</h3>
                <p id="reels-generated">0</p>
            </div>
            <div class="metric">
                <h3>Published</h4>
                <p id="reels-published">0</p>
            </div>
            <div class="metric">
                <h3>QA Pass Rate</h3>
                <p id="qa-pass-rate">0%</p>
            </div>
            <div class="metric">
                <h3>Queue</h3>
                <p id="reels-queue">0</p>
            </div>
            <div class="metric">
                <h3>Generation Cost</h3>
                <p id="generation-cost">$0.00</p>
            </div>
        </div>

        <div class="action-bar">
            <form method="post" action="/run" class="run-form">
                <button type="submit">Run pipeline now</button>
            </form>
        </div>

        <table class="reels-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Source</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Output</th>
                </tr>
            </thead>
            <tbody>
                {cards}
            </tbody>
        </table>
    </div>
    <script src="/static/js/main.js"></script>
</body>
</html>'''

@app.post("/run")
def trigger_pipeline(service: ReelService = Depends(get_reel_service)):
    """Trigger the pipeline to process a new reel."""
    try:
        reel_id = service.process_pipeline()
        if reel_id:
            return JSONResponse(content={"status": "pipeline completed", "reel_id": reel_id}, status_code=200)
        else:
            return JSONResponse(content={"status": "pipeline did not process any item"}, status_code=200)
    except Exception as e:
        return JSONResponse(content={"status": "pipeline error", "detail": str(e)}, status_code=500)

@app.get("/video/{reel_id}")
def get_video(reel_id: int, service: ReelService = Depends(get_reel_service)):
    """Serve the generated video for a reel."""
    reel = service.get_reel(reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    if not reel.video_path:
        raise HTTPException(status_code=404, detail="Video not yet generated")
    video_path = Path(reel.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    return FileResponse(video_path, media_type="video/mp4")

@app.get("/api/reels", response_model=List[ReelItem])
def get_reels(
    skip: int = 0,
    limit: int = 100,
    service: ReelService = Depends(get_reel_service),
    current_user: UserItem = Depends(get_current_active_user),
):
    """Get the current user's reels."""
    reels = service.get_reels(skip=skip, limit=limit, user_id=current_user.id)
    return reels


@app.post("/api/reels", response_model=ReelItem)
def create_reel(reel_in: ReelItemCreate, service: ReelService = Depends(get_reel_service), current_user: UserItem = Depends(get_current_active_user)):
    """Create a new reel."""
    return service.create_reel(reel_in, current_user.id)


@app.put("/api/reel/{reel_id}", response_model=ReelItem)
def update_reel(
    reel_id: int,
    reel_in: ReelItemUpdate,
    service: ReelService = Depends(get_reel_service),
    current_user: UserItem = Depends(get_current_active_user),
):
    """Update one of the current user's reels."""
    if not service.get_reel(reel_id, current_user.id):
        raise HTTPException(status_code=404, detail="Reel not found")
    updated_reel = service.update_reel(reel_id, reel_in)
    if not updated_reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    return updated_reel

@app.get("/api/stats")
def get_stats(
    service: ReelService = Depends(get_reel_service),
    current_user: UserItem = Depends(get_current_active_user),
):
    """Get statistics for the current user's reels."""
    stats = service.get_reel_stats(user_id=current_user.id)
    # Convert enum keys to strings for JSON serialization
    return {str(k): v for k, v in stats.items()}

@app.get("/api/reel/{reel_id}", response_model=ReelItem)
def get_reel(
    reel_id: int,
    service: ReelService = Depends(get_reel_service),
    current_user: UserItem = Depends(get_current_active_user),
):
    """Get one of the current user's reels."""
    reel = service.get_reel(reel_id, current_user.id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    return reel

def process_reel_job(job_id: int, reel_id: int):
    # Create a new database session
    from app.database import SessionLocal
    with SessionLocal() as db:
        service = ReelService(db)
        try:
            # Update job to processing
            service.update_job(job_id, JobUpdate(status=JobStatus.PROCESSING, progress=10))
            # Process the reel
            processed_reel_id = service.process_reel_by_id(reel_id)
            if processed_reel_id:
                # Update job to completed
                service.update_job(job_id, JobUpdate(status=JobStatus.COMPLETED, progress=100, result=f"Reel {processed_reel_id} processed successfully"))
            else:
                service.update_job(job_id, JobUpdate(status=JobStatus.FAILED, error="Failed to process reel"))
        except Exception as e:
            service.update_job(job_id, JobUpdate(status=JobStatus.FAILED, error=str(e)))

@app.post("/api/reels/{reel_id}/render", response_model=Job)
def render_reel(
    reel_id: int,
    background_tasks: BackgroundTasks,
    service: ReelService = Depends(get_reel_service),
    current_user: UserItem = Depends(get_current_active_user),
):
    """Trigger rendering for one of the current user's reels."""
    reel = service.get_reel(reel_id, current_user.id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    # Create a job for rendering
    job = service.create_job(reel_id, JobType.RENDER, current_user.id)
    # Add background task to process the reel
    background_tasks.add_task(process_reel_job, job_id=job.id, reel_id=reel_id)
    return job

@app.get("/api/jobs/{job_id}", response_model=Job)
def get_job(
    job_id: int,
    service: ReelService = Depends(get_reel_service),
    current_user: UserItem = Depends(get_current_active_user),
):
    """Get one of the current user's jobs."""
    job = service.get_job(job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/instagram/connect")
def connect_instagram(current_user: UserItem = Depends(get_current_active_user), service: InstagramService = Depends(get_instagram_service)):
    """Initiate Instagram OAuth connection."""
    # For development, allow creating a test connection if INSTAGRAM_DEV_MODE is True
    if settings.INSTAGRAM_DEV_MODE:
        from app.models.instagram import InstagramConnection, InstagramConnectionStatus
        from app.core.security import encrypt_token
        # Check if already connected
        existing = service.db.query(InstagramConnection).filter(
            InstagramConnection.user_id == current_user.id,
            InstagramConnection.status == InstagramConnectionStatus.ACTIVE.value
        ).first()
        if existing:
            return {"message": "Already connected"}
        # Create a dummy connection with a dummy token
        dummy_token = "dummy_token_for_development"
        encrypted_token = encrypt_token(dummy_token)
        connection = InstagramConnection(
            user_id=current_user.id,
            instagram_account_id="1234567890",
            account_username="testdev",
            account_name="Test Dev User",
            access_token_encrypted=encrypted_token,
            status=InstagramConnectionStatus.ACTIVE.value
        )
        service.db.add(connection)
        service.db.commit()
        service.db.refresh(connection)
        return {"message": "Development Instagram connection created", "account_id": connection.instagram_account_id}
    else:
        raise HTTPException(
            status_code=501,
            detail="OAuth flow not implemented. Set INSTAGRAM_DEV_MODE=true for development or implement OAuth flow."
        )


@app.get("/reels/{reel_id}/schedule")
def get_schedule(reel_id: int, current_user: UserItem = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get the active schedule for a reel."""
    # Verify ownership and get active schedule
    schedule = db.query(ScheduleItem).filter(
        ScheduleItem.reel_id == reel_id,
        ScheduleItem.user_id == current_user.id,
        ScheduleItem.status.in_([ScheduleItemStatus.SCHEDULED.value, ScheduleItemStatus.PROCESSING.value])
    ).order_by(ScheduleItem.scheduled_at.desc()).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="No active schedule found for this reel")
    return {
        "id": schedule.id,
        "reel_id": schedule.reel_id,
        "user_id": schedule.user_id,
        "instagram_account_id": schedule.instagram_account_id,
        "scheduled_at": schedule.scheduled_at.isoformat() if schedule.scheduled_at else None,
        "timezone": schedule.timezone,
        "status": schedule.status,
        "video_hash": schedule.video_hash,
        "error_message": schedule.error_message,
        "scheduler_job_id": schedule.scheduler_job_id,
        "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
        "updated_at": schedule.updated_at.isoformat() if schedule.updated_at else None
    }


@app.post("/reels/{reel_id}/schedule")
def schedule_reel(
    reel_id: int,
    schedule_in: ScheduleCreate,
    current_user: UserItem = Depends(get_current_active_user),
    service: InstagramService = Depends(get_instagram_service),
    db: Session = Depends(get_db)
):
    """Schedule a reel for publishing."""
    # Get reel and check ownership
    reel = service.reel_service.get_reel(reel_id, current_user.id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    if reel.status != ReelStatus.READY_TO_PUBLISH.value:
        raise HTTPException(status_code=400, detail="Reel is not ready for publishing")

    # Get active Instagram connection
    connection = service.get_active_connection(current_user.id)
    if not connection:
        raise HTTPException(status_code=400, detail="No active Instagram connection")

    # Parse scheduled_at
    try:
        scheduled_at = datetime.fromisoformat(schedule_in.scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_at format. Expected ISO 8601 with timezone.")
    if scheduled_at.tzinfo is None:
        raise HTTPException(status_code=400, detail="Scheduled time must be timezone-aware")

    # Ensure scheduled_at is in the future
    now = datetime.now(timezone.utc)
    if scheduled_at <= now:
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

    # Check for overlapping active schedules
    overlapping = db.query(ScheduleItem).filter(
        ScheduleItem.reel_id == reel_id,
        ScheduleItem.user_id == current_user.id,
        ScheduleItem.status.in_([ScheduleItemStatus.SCHEDULED.value, ScheduleItemStatus.PROCESSING.value])
    ).first()
    if overlapping:
        raise HTTPException(status_code=409, detail="An active schedule already exists for this reel")

    # Compute video hash
    if not reel.video_path:
        raise HTTPException(status_code=400, detail="Video file not found")
    import hashlib
    hash_sha256 = hashlib.sha256()
    with open(reel.video_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    video_hash = hash_sha256.hexdigest()

    # Create schedule record
    db_schedule = ScheduleItem(
        reel_id=reel_id,
        user_id=current_user.id,
        instagram_account_id=connection.instagram_account_id,
        scheduled_at=scheduled_at,
        timezone=schedule_in.timezone,
        status=ScheduleItemStatus.SCHEDULED.value,
        video_hash=video_hash
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)

    # Enqueue the scheduled job
    try:
        q = queue.get_queue()
        job = q.enqueue_at(
            scheduled_at,
            'app.jobs.tasks:process_scheduled_publish',
            db_schedule.id
        )
    except Exception as e:
        db_schedule.status = ScheduleItemStatus.FAILED.value
        db_schedule.error_message = f"Failed to enqueue scheduled job: {str(e)}"
        db.add(db_schedule)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to enqueue scheduled job: {str(e)}")

    # Store the RQ job ID
    db_schedule.scheduler_job_id = job.id
    db.add(db_schedule)
    db.commit()

    return {
        "id": db_schedule.id,
        "reel_id": db_schedule.reel_id,
        "user_id": db_schedule.user_id,
        "instagram_account_id": db_schedule.instagram_account_id,
        "scheduled_at": db_schedule.scheduled_at.isoformat(),
        "timezone": db_schedule.timezone,
        "status": db_schedule.status,
        "video_hash": db_schedule.video_hash,
        "scheduler_job_id": db_schedule.scheduler_job_id,
        "created_at": db_schedule.created_at.isoformat(),
        "updated_at": db_schedule.updated_at.isoformat()
    }


@app.patch("/reels/{reel_id}/schedule")
def reschedule_reel(
    reel_id: int,
    schedule_in: ScheduleUpdate,
    current_user: UserItem = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    service: InstagramService = Depends(get_instagram_service)
):
    """Reschedule an existing schedule for a reel."""
    # Get the current active schedule (must be SCHEDULED to reschedule)
    schedule = db.query(ScheduleItem).filter(
        ScheduleItem.reel_id == reel_id,
        ScheduleItem.user_id == current_user.id,
        ScheduleItem.status == ScheduleItemStatus.SCHEDULED.value
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="No active schedule found for this reel to reschedule")

    # Parse new scheduled_at if provided
    new_scheduled_at = schedule.scheduled_at
    if schedule_in.scheduled_at is not None:
        try:
            new_scheduled_at = datetime.fromisoformat(schedule_in.scheduled_at)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scheduled_at format. Expected ISO 8601 with timezone.")
    if new_scheduled_at.tzinfo is None:
        raise HTTPException(status_code=400, detail="Scheduled time must be timezone-aware")

    # Ensure new scheduled_at is in the future
    now = datetime.now(timezone.utc)
    if new_scheduled_at <= now:
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

    # Check for overlapping active schedules (excluding the current schedule)
    overlapping = db.query(ScheduleItem).filter(
        ScheduleItem.reel_id == reel_id,
        ScheduleItem.user_id == current_user.id,
        ScheduleItem.id != schedule.id,
        ScheduleItem.status.in_([ScheduleItemStatus.SCHEDULED.value, ScheduleItemStatus.PROCESSING.value])
    ).first()
    if overlapping:
        raise HTTPException(status_code=409, detail="An active schedule already exists for this reel")

    # Get active Instagram connection
    connection = service.get_active_connection(current_user.id)
    if not connection:
        raise HTTPException(status_code=400, detail="No active Instagram connection")

    # Get reel and check ownership
    reel = service.reel_service.get_reel(schedule.reel_id, current_user.id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")

    # Check video hash matches (if schedule has video_hash)
    if schedule.video_hash:
        if not reel.video_path:
            raise HTTPException(status_code=400, detail="Video file not found")
        import hashlib
        hash_sha256 = hashlib.sha256()
        try:
            with open(reel.video_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
        except FileNotFoundError:
            raise HTTPException(status_code=400, detail="Video file not found")
        current_hash = hash_sha256.hexdigest()
        if current_hash != schedule.video_hash:
            raise HTTPException(status_code=400, detail="Video has been regenerated or changed")

    # Check Instagram account match
    if connection.instagram_account_id != schedule.instagram_account_id:
        raise HTTPException(status_code=400, detail="Instagram account has changed")

    # Cancel the existing scheduled job if it exists
    if schedule.scheduler_job_id:
        try:
            # Get the Redis connection from the queue
            redis_conn = queue.get_queue().connection
            from rq.job import Job as RQJob
            job = RQJob.fetch(schedule.scheduler_job_id, connection=redis_conn)
            if not (job.is_finished or job.is_failed):
                job.cancel()
        except Exception as e:
            logger.warning(f"Failed to cancel scheduled job {schedule.scheduler_job_id}: {e}")
            # We still proceed to reschedule

    # Update schedule fields
    schedule.scheduled_at = new_scheduled_at
    schedule.timezone = schedule_in.timezone
    # Note: we do not change video_hash or instagram_account_id here; they are rechecked at execution time

    # Enqueue the new scheduled job
    try:
        q = queue.get_queue()
        job = q.enqueue_at(
            new_scheduled_at,
            'app.jobs.tasks:process_scheduled_publish',
            schedule.id
        )
    except Exception as e:
        logger.error(f"Failed to enqueue rescheduled job: {e}")
        schedule.status = ScheduleItemStatus.FAILED.value
        schedule.error_message = f"Failed to enqueue rescheduled job: {str(e)}"
        db.add(schedule)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to enqueue rescheduled job: {str(e)}")

    # Store the new RQ job ID
    schedule.scheduler_job_id = job.id
    db.add(schedule)
    db.commit()

    return {
        "id": schedule.id,
        "reel_id": schedule.reel_id,
        "user_id": schedule.user_id,
        "instagram_account_id": schedule.instagram_account_id,
        "scheduled_at": schedule.scheduled_at.isoformat(),
        "timezone": schedule.timezone,
        "status": schedule.status,
        "video_hash": schedule.video_hash,
        "error_message": schedule.error_message,
        "scheduler_job_id": schedule.scheduler_job_id,
        "created_at": schedule.created_at.isoformat(),
        "updated_at": schedule.updated_at.isoformat()
    }


@app.post("/reels/{reel_id}/schedule/cancel")
def cancel_schedule(
    reel_id: int,
    current_user: UserItem = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    service: InstagramService = Depends(get_instagram_service)
):
    """Cancel an existing schedule for a reel."""
    # Get the schedule for the reel and user (any status)
    schedule = db.query(ScheduleItem).filter(
        ScheduleItem.reel_id == reel_id,
        ScheduleItem.user_id == current_user.id
    ).order_by(ScheduleItem.scheduled_at.desc()).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule found for this reel")

    # If the schedule is SCHEDULED, attempt to cancel the corresponding RQ job
    if schedule.status == ScheduleItemStatus.SCHEDULED.value:
        if schedule.scheduler_job_id:
            try:
                # Get the Redis connection from the queue
                redis_conn = queue.get_queue().connection
                from rq.job import Job as RQJob
                job = RQJob.fetch(schedule.scheduler_job_id, connection=redis_conn)
                if not (job.is_finished or job.is_failed):
                    job.cancel()
            except Exception as e:
                logger.warning(f"Failed to cancel scheduled job {schedule.scheduler_job_id}: {e}")
                # We still proceed to mark schedule as cancelled
        else:
            # No scheduler job ID but schedule is SCHEDULED - this shouldn't happen normally
            pass

        # Update schedule status to CANCELLED
        schedule.status = ScheduleItemStatus.CANCELLED.value
        # We keep the scheduler_job_id for historical reference
        db.add(schedule)
        db.commit()
    elif schedule.status == ScheduleItemStatus.PROCESSING.value:
        # If execution has already begun, return the actual state rather than claiming cancellation succeeded
        raise HTTPException(status_code=400, detail="Cannot cancel schedule - publishing is already in progress")

    # Return the schedule details (same as GET schedule)
    return {
        "id": schedule.id,
        "reel_id": schedule.reel_id,
        "user_id": schedule.user_id,
        "instagram_account_id": schedule.instagram_account_id,
        "scheduled_at": schedule.scheduled_at.isoformat() if schedule.scheduled_at else None,
        "timezone": schedule.timezone,
        "status": schedule.status,
        "video_hash": schedule.video_hash,
        "error_message": schedule.error_message,
        "scheduler_job_id": schedule.scheduler_job_id,
        "created_at": schedule.created_at.isoformat(),
        "updated_at": schedule.updated_at.isoformat()
    }

@app.get("/instagram/callback")
def instagram_callback(code: str = None, state: str = None):
    """Instagram OAuth callback endpoint.
    In development, this can be used to simulate a successful callback.
    """
    # For development, we can auto-create a connection if code is provided
    if settings.INSTAGRAM_DEV_MODE and code:
        # In a real implementation, we would exchange code for token
        # For now, we just acknowledge
        return {"message": "Callback received (development mode)"}
    # Redirect to frontend or return simple message
    return {"message": "Instagram callback endpoint"}


@app.delete("/instagram/disconnect")
def disconnect_instagram(current_user: UserItem = Depends(get_current_active_user), service: InstagramService = Depends(get_instagram_service)):
    """Disconnect the Instagram account."""
    connection = service.get_active_connection(current_user.id)
    if not connection:
        raise HTTPException(status_code=404, detail="No Instagram connection to disconnect")
    connection.status = InstagramConnectionStatus.REVOKED.value
    service.db.add(connection)
    service.db.commit()
    return {"message": "Disconnected"}


@app.post("/reels/{reel_id}/publish")
def publish_reel(reel_id: int, current_user: UserItem = Depends(get_current_active_user), service: InstagramService = Depends(get_instagram_service)):
    """Publish a reel to Instagram."""
    # Check if already published with confirmed media ID
    existing_publishing = service.get_publishing_record(reel_id, current_user.id)
    if existing_publishing and existing_publishing.status == PublishingStatus.COMPLETED.value and existing_publishing.published_media_id:
        return {
            "publishing_id": existing_publishing.id,
            "status": existing_publishing.status,
            "detail": "Already published",
            "already_published": True
        }

    publishing = service.publish_reel(reel_id, current_user.id)
    if not publishing:
        raise HTTPException(status_code=400, detail="Unable to publish reel")
    return {
        "publishing_id": publishing.id,
        "status": publishing.status,
        "detail": "Publishing job enqueued"
    }


@app.post("/reels/{reel_id}/publish/retry")
def retry_publish(
    reel_id: int,
    current_user: UserItem = Depends(get_current_active_user),
    service: InstagramService = Depends(get_instagram_service),
    db: Session = Depends(get_db)
):
    """Retry a failed publication for a reel."""
    # Get reel and check ownership
    reel = service.reel_service.get_reel(reel_id)
    if not reel or reel.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Reel not found or access denied")

    # Get the most recent publishing record
    last_publishing = db.query(InstagramPublishing).filter(
        InstagramPublishing.reel_id == reel_id,
        InstagramPublishing.user_id == current_user.id
    ).order_by(InstagramPublishing.id.desc()).first()

    # If already published with a confirmed media ID, return the existing record
    if last_publishing and last_publishing.status == PublishingStatus.COMPLETED.value and last_publishing.published_media_id:
        return {
            "id": last_publishing.id,
            "reel_id": last_publishing.reel_id,
            "user_id": last_publishing.user_id,
            "instagram_account_id": last_publishing.instagram_account_id,
            "status": last_publishing.status,
            "container_id": last_publishing.container_id,
            "container_status": last_publishing.container_status,
            "published_media_id": last_publishing.published_media_id,
            "caption_used": last_publishing.caption_used,
            "response_metadata": last_publishing.response_metadata,
            "error_message": last_publishing.error_message,
            "video_hash": last_publishing.video_hash,
            "published_at": last_publishing.published_at.isoformat() if last_publishing.published_at else None,
            "retry_count": last_publishing.retry_count,
            "created_at": last_publishing.created_at.isoformat(),
            "updated_at": last_publishing.updated_at.isoformat()
        }

    # Check eligibility (reel status, video, connection, etc.)
    can_publish, reason = service.can_publish(reel_id, current_user.id)
    if not can_publish:
        raise HTTPException(status_code=400, detail=reason)

    # Determine retry count for this attempt
    retry_count = 0
    if last_publishing:
        retry_count = last_publishing.retry_count + 1

    # Get active Instagram connection for the caption
    connection = service.get_active_connection(current_user.id)
    if not connection:
        # This should not happen because can_publish passed
        raise HTTPException(status_code=400, detail="No active Instagram connection")

    # Create publishing record
    publishing = InstagramPublishing(
        reel_id=reel_id,
        user_id=current_user.id,
        instagram_account_id=connection.instagram_account_id,
        status=PublishingStatus.PENDING.value,
        caption_used=reel.captions,  # Assuming captions field holds the caption
        retry_count=retry_count
    )
    # If retrying a failed attempt that was scheduled, preserve the schedule_id
    if last_publishing and last_publishing.schedule_id:
        publishing.schedule_id = last_publishing.schedule_id
    db.add(publishing)
    db.commit()
    db.refresh(publishing)

    # Create a job for publishing
    job_in = JobCreate(
        reel_id=reel_id,
        user_id=current_user.id,
        type=JobType.INSTAGRAM_PUBLISH,
        status=JobStatus.QUEUED,
        progress=0,
        result=None,
        error=None
    )
    job = service.reel_service.job_repository.create(job_in)
    if not job:
        logger.error(f"Failed to create publishing job for reel {reel_id}")
        publishing.status = PublishingStatus.FAILED.value
        publishing.error_message = "Failed to create publishing job"
        db.add(publishing)
        db.commit()
        return {
            "id": publishing.id,
            "reel_id": publishing.reel_id,
            "user_id": publishing.user_id,
            "instagram_account_id": publishing.instagram_account_id,
            "status": publishing.status,
            "container_id": publishing.container_id,
            "container_status": publishing.container_status,
            "published_media_id": publishing.published_media_id,
            "caption_used": publishing.caption_used,
            "response_metadata": publishing.response_metadata,
            "error_message": publishing.error_message,
            "video_hash": publishing.video_hash,
            "published_at": publishing.published_at.isoformat() if publishing.published_at else None,
            "retry_count": publishing.retry_count,
            "created_at": publishing.created_at.isoformat(),
            "updated_at": publishing.updated_at.isoformat()
        }

    # Enqueue the job
    try:
        rq_queue = queue.get_queue()
        rq_queue.enqueue(
            'app.jobs.processor:process_instagram_publish_job',
            job.id,
            job_timeout='10m'
        )
    except Exception as e:
        logger.error(f"Failed to enqueue publishing job for reel {reel_id}: {e}")
        # Update job to failed
        service.reel_service.update_job(job.id, JobUpdate(
            status=JobStatus.FAILED,
            error=f"Failed to enqueue job: {str(e)}"
        ))
        # Update publishing record to failed
        publishing.status = PublishingStatus.FAILED.value
        publishing.error_message = f"Failed to enqueue job: {str(e)}"
        db.add(publishing)
        db.commit()
        return {
            "id": publishing.id,
            "reel_id": publishing.reel_id,
            "user_id": publishing.user_id,
            "instagram_account_id": publishing.instagram_account_id,
            "status": publishing.status,
            "container_id": publishing.container_id,
            "container_status": publishing.container_status,
            "published_media_id": publishing.published_media_id,
            "caption_used": publishing.caption_used,
            "response_metadata": publishing.response_metadata,
            "error_message": publishing.error_message,
            "video_hash": publishing.video_hash,
            "published_at": publishing.published_at.isoformat() if publishing.published_at else None,
            "retry_count": publishing.retry_count,
            "created_at": publishing.created_at.isoformat(),
            "updated_at": publishing.updated_at.isoformat()
        }

    return {
        "id": publishing.id,
        "reel_id": publishing.reel_id,
        "user_id": publishing.user_id,
        "instagram_account_id": publishing.instagram_account_id,
        "status": publishing.status,
        "container_id": publishing.container_id,
        "container_status": publishing.container_status,
        "published_media_id": publishing.published_media_id,
        "caption_used": publishing.caption_used,
        "response_metadata": publishing.response_metadata,
        "error_message": publishing.error_message,
        "video_hash": publishing.video_hash,
        "published_at": publishing.published_at.isoformat() if publishing.published_at else None,
        "retry_count": publishing.retry_count,
        "created_at": publishing.created_at.isoformat(),
        "updated_at": publishing.updated_at.isoformat()
    }


@app.get("/reels/{reel_id}/publication")
def get_reel_publication(reel_id: int, current_user: UserItem = Depends(get_current_active_user), service: InstagramService = Depends(get_instagram_service)):
    """Get the publication record for a reel."""
    publishing = service.get_publishing_record(reel_id, current_user.id)
    if not publishing:
        raise HTTPException(status_code=404, detail="No publication found for this reel")
    return {
        "id": publishing.id,
        "reel_id": publishing.reel_id,
        "user_id": publishing.user_id,
        "instagram_account_id": publishing.instagram_account_id,
        "status": publishing.status,
        "container_id": publishing.container_id,
        "container_status": publishing.container_status,
        "published_media_id": publishing.published_media_id,
        "caption_used": publishing.caption_used,
        "response_metadata": publishing.response_metadata,
        "error_message": publishing.error_message,
        "video_hash": publishing.video_hash,
        "published_at": publishing.published_at.isoformat() if publishing.published_at else None,
        "retry_count": publishing.retry_count,
        "created_at": publishing.created_at.isoformat(),
        "updated_at": publishing.updated_at.isoformat()
    }


@app.get("/reels/{reel_id}/publications")
def get_publication_history(
    reel_id: int,
    current_user: UserItem = Depends(get_current_active_user),
    service: ReelService = Depends(get_reel_service),
    db: Session = Depends(get_db)
):
    """Get the publication history for a reel."""
    # Verify ownership
    reel = service.get_reel(reel_id)
    if not reel or reel.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Reel not found or access denied")

    # Get all publishing records for the reel, ordered by created_at ascending
    publications = db.query(InstagramPublishing).filter(
        InstagramPublishing.reel_id == reel_id,
        InstagramPublishing.user_id == current_user.id
    ).order_by(InstagramPublishing.created_at.asc()).all()

    # Debug: log the status of each publication
    for pub in publications:
        print(f"PUBLICATION DEBUG: ID={pub.id}, STATUS={pub.status}, ERROR='{pub.error_message}'")

    result = []
    for pub in publications:
        result.append({
            "id": pub.id,
            "status": pub.status,
            "instagram_account_id": pub.instagram_account_id,
            "requested_time": pub.created_at.isoformat(),
            "published_time": pub.published_at.isoformat() if pub.published_at else None,
            "container_id": pub.container_id,
            "media_id": pub.published_media_id,
            "retry_count": pub.retry_count,
            "error_message": pub.error_message
        })
    return result


@app.get("/reels/{reel_id}/analytics")
def get_reel_analytics(reel_id: int, current_user: UserItem = Depends(get_current_active_user), service: InstagramService = Depends(get_instagram_service)):
    """Get the latest analytics for a reel."""
    analytics = service.get_latest_analytics(reel_id, current_user.id)
    if not analytics:
        raise HTTPException(status_code=404, detail="No analytics found for this reel")
    return {
        "id": analytics.id,
        "reel_id": analytics.reel_id,
        "instagram_media_id": analytics.instagram_media_id,
        "metric_timestamp": analytics.metric_timestamp.isoformat() if analytics.metric_timestamp else None,
        "metrics": analytics.metrics,
        "api_version": analytics.api_version,
        "created_at": analytics.created_at.isoformat() if analytics.created_at else None,
        "updated_at": analytics.updated_at.isoformat() if analytics.updated_at else None
    }


@app.post("/reels/{reel_id}/analytics/refresh")
def refresh_reel_analytics(reel_id: int, current_user: UserItem = Depends(get_current_active_user), service: InstagramService = Depends(get_instagram_service)):
    """Trigger an analytics refresh for a reel."""
    job = service.refresh_analytics(reel_id, current_user.id)
    if not job:
        raise HTTPException(status_code=400, detail="Unable to trigger analytics refresh")
    return {
        "job_id": job.id,
        "status": job.status,
        "detail": "Analytics refresh job enqueued"
    }


@app.get("/reels/{reel_id}/analytics/history")
def get_reel_analytics_history(reel_id: int, current_user: UserItem = Depends(get_current_active_user), service: InstagramService = Depends(get_instagram_service)):
    """Get the analytics history for a reel."""
    analytics_list = service.get_analytics_record(reel_id, current_user.id)
    if not analytics_list:
        return []
    return [
        {
            "id": analytics.id,
            "reel_id": analytics.reel_id,
            "instagram_media_id": analytics.instagram_media_id,
            "metric_timestamp": analytics.metric_timestamp.isoformat() if analytics.metric_timestamp else None,
            "metrics": analytics.metrics,
            "api_version": analytics.api_version,
            "created_at": analytics.created_at.isoformat() if analytics.created_at else None,
            "updated_at": analytics.updated_at.isoformat() if analytics.updated_at else None
        }
        for analytics in analytics_list
    ]
