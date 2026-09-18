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
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import Base, engine, get_db
from app.models.reel import ReelItem, ReelStatus
from app.schemas.reel import ReelItemCreate, ReelItemUpdate, ReelItem
from app.services.reel import ReelService
from app.schemas.job import JobCreate, JobUpdate, Job
from app.models.job import JobType, JobStatus

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title='AI Reel Factory')

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

def get_reel_service(db: Session = Depends(get_db)) -> ReelService:
    return ReelService(db)

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
def get_reels(skip: int = 0, limit: int = 100, service: ReelService = Depends(get_reel_service)):
    """Get a list of reels."""
    reels = service.get_reels(skip=skip, limit=limit)
    return reels


@app.post("/api/reels", response_model=ReelItem)
def create_reel(reel_in: ReelItemCreate, service: ReelService = Depends(get_reel_service)):
    """Create a new reel."""
    return service.create_reel(reel_in)


@app.put("/api/reel/{reel_id}", response_model=ReelItem)
def update_reel(reel_id: int, reel_in: ReelItemUpdate, service: ReelService = Depends(get_reel_service)):
    """Update an existing reel."""
    updated_reel = service.update_reel(reel_id, reel_in)
    if not updated_reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    return updated_reel

@app.get("/api/stats")
def get_stats(service: ReelService = Depends(get_reel_service)):
    """Get reel statistics."""
    stats = service.get_reel_stats()
    # Convert enum keys to strings for JSON serialization
    return {str(k): v for k, v in stats.items()}

@app.get("/api/reel/{reel_id}", response_model=ReelItem)
def get_reel(reel_id: int, service: ReelService = Depends(get_reel_service)):
    """Get a single reel by ID."""
    reel = service.get_reel(reel_id)
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
def render_reel(reel_id: int, background_tasks: BackgroundTasks, service: ReelService = Depends(get_reel_service)):
    """Trigger rendering for a specific reel."""
    # Check if reel exists
    reel = service.get_reel(reel_id)
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    # Create a job for rendering
    job = service.create_job(reel_id, JobType.RENDER)
    # Add background task to process the reel
    background_tasks.add_task(process_reel_job, job_id=job.id, reel_id=reel_id)
    return job

@app.get("/api/jobs/{job_id}", response_model=Job)
def get_job(job_id: int, service: ReelService = Depends(get_reel_service)):
    """Get a job by ID."""
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
