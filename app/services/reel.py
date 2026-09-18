from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.reel import ReelRepository
from app.repositories.job import JobRepository
from app.models.reel import ReelItem, ReelStatus
from app.schemas.reel import ReelItemCreate, ReelItemUpdate
from app.models.job import JobItem, JobStatus, JobType
from app.schemas.job import JobCreate, JobUpdate
from app.core.config import settings
import subprocess
import os
from pathlib import Path
import xml.etree.ElementTree as ET
import urllib.request
import json
import time
import hashlib
import re
import html
from datetime import datetime, timezone

class ReelService:
    def __init__(self, db: Session):
        self.repository = ReelRepository(db)
        self.job_repository = JobRepository(db)
        self.db = db

    def get_reels(self, skip: int = 0, limit: int = 100) -> List[ReelItem]:
        return self.repository.get_multi(skip=skip, limit=limit)

    def get_reel(self, id: int) -> Optional[ReelItem]:
        return self.repository.get(id)

    def create_reel(self, reel_in: ReelItemCreate) -> ReelItem:
        return self.repository.create(reel_in)

    def update_reel(self, reel_id: int, reel_in: ReelItemUpdate) -> Optional[ReelItem]:
        db_reel = self.repository.get(reel_id)
        if db_reel:
            return self.repository.update(db_reel, reel_in)
        return None

    def delete_reel(self, id: int) -> Optional[ReelItem]:
        return self.repository.delete(id)

    def get_reel_stats(self) -> dict:
        return self.repository.get_count_by_status()

    def clean_text(self, text: str) -> str:
        text = html.unescape(re.sub('<[^>]+>',' ',text))
        return re.sub(r'\s+',' ',text).strip()

    def score_item(self, title: str, summary: str) -> int:
        t = (title + ' ' + summary).lower()
        keys = ['ai','agent','model','claude','gemini','openai','anthropic','automation','chatgpt','video','coding','computer']
        return min(100, 20 + sum(8 for k in keys if k in t))

    def fetch_rss(self, url: str) -> bytes:
        req = urllib.request.Request(url, headers={'User-Agent':'AI-Reel-Factory/2.0'})
        return urllib.request.urlopen(req, timeout=15).read()

    def get_rss_items(self) -> List[tuple]:
        rows = []
        for source, url in settings.RSS_SOURCES.items():
            try:
                root = ET.fromstring(self.fetch_rss(url))
                for it in root.findall('.//item')[:settings.MAX_RSS_ITEMS_PER_SOURCE]:
                    title = (it.findtext('title') or '').strip()
                    link = (it.findtext('link') or '').strip()
                    desc = (it.findtext('description') or '').strip()
                    if title and link:
                        rows.append((source, title, link, desc))
            except Exception as e:
                print(f'RSS error for {source}: {e}')
        return rows

    def make_video(self, title: str, summary: str, out_path: Path):
        if settings.MOCK_MODE:
            # Create a mock video file for development
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, 'w') as f:
                f.write(f"MOCK VIDEO: {title}\n{summary}")
            return

        # Real FFmpeg implementation
        safe_title = title.replace(':',' -').replace("'","\\'").replace('"','')
        safe_sum = summary[:260].replace(':',' -').replace("'","\\'").replace('"','')

        vf = (
            f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:"
            f"text='{safe_title}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=600:"
            "box=1:boxcolor=black@0.55:boxborderw=30,"
            f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='{safe_sum}':"
            "fontcolor=white:fontsize=38:line_spacing=16:x=100:y=900:box=1:boxcolor=black@0.4:boxborderw=25,"
            f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='AI REEL FACTORY':"
            "fontcolor=white:fontsize=30:x=60:y=80"
        )

        cmd = [
            'ffmpeg', '-y', '-f', 'lavfi', '-i',
            f'color=c=0x111111:s={settings.VIDEO_WIDTH}x{settings.VIDEO_HEIGHT}:d={settings.VIDEO_DURATION}:r={settings.VIDEO_FPS}',
            '-vf', vf,
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            str(out_path)
        ]

        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:
            raise Exception(f"FFmpeg failed: {result.stderr}")

    def process_pipeline(self) -> Optional[int]:
        """Main pipeline processing function (global, processes highest-scoring discovered reel)"""
        # Ensure tables exist
        from app.database import Base, engine
        Base.metadata.create_all(bind=engine)

        # Process RSS items
        for source, title, url, desc in self.get_rss_items():
            try:
                cleaned_desc = self.clean_text(desc)
                score_val = self.score_item(title, cleaned_desc)

                # Check if item already exists
                existing = self.repository.get_by_url(url)
                if not existing:
                    reel_in = ReelItemCreate(
                        source=source,
                        title=title,
                        url=url,
                        summary=cleaned_desc,
                        score=score_val
                    )
                    self.repository.create(reel_in)
            except Exception as e:
                print(f'Error processing RSS item: {e}')

        self.db.commit()

        # Get highest scoring discovered item
        row = self.db.query(ReelItem).filter(
            ReelItem.status == ReelStatus.DISCOVERED.value
        ).order_by(
            ReelItem.score.desc(),
            ReelItem.id.desc()
        ).first()
        print(f"DEBUG: Found row id={row.id if row else None}, status={row.status if row else None}")

        if not row:
            return None

        # Process the reel through the pipeline
        out_path = Path('./data/output') / f"reel_{row.id}.mp4"

        try:
            # Update status to researching
            self.repository.update(row, ReelItemUpdate(status=ReelStatus.RESEARCHING.value))

            # Simulate research phase
            time.sleep(1)
            self.repository.update(row, ReelItemUpdate(
                status=ReelStatus.SCRIPTING.value,
                research_data='{"topic": "AI Research", "key_points": ["Point 1", "Point 2"]}'
            ))

            # Simulate scripting phase
            time.sleep(1)
            self.repository.update(row, ReelItemUpdate(
                status=ReelStatus.STORYBOARDING.value,
                script='This is a sample script for the AI Reel Factory. It demonstrates the pipeline capabilities.'
            ))

            # Simulate storyboard phase
            time.sleep(1)
            self.repository.update(row, ReelItemUpdate(
                status=ReelStatus.ASSET_GENERATION.value,
                storyboard='[Scene 1: Introduction][Scene 2: Main Content][Scene 3: Conclusion]'
            ))

            # Simulate asset generation
            time.sleep(1)
            self.repository.update(row, ReelItemUpdate(
                status=ReelStatus.VOICE_GENERATION.value,
                assets_data='{"images": ["img1.jpg", "img2.jpg"], "background music": "ambient.mp3"}'
            ))

            # Simulate voice generation
            time.sleep(1)
            self.repository.update(row, ReelItemUpdate(
                status=ReelStatus.RENDERING.value,
                voice_data='{"voice": "neutral", "text": "Sample voiceover text"}'
            ))

            # Generate video
            self.make_video(row.title, row.summary, out_path)

            # Simulate QA
            time.sleep(1)
            self.repository.update(row, ReelItemUpdate(
                status=ReelStatus.QA.value,
                qa_score=95.0
            ))

            # Mark as ready to publish
            self.repository.update(row, ReelItemUpdate(
                status=ReelStatus.READY_TO_PUBLISH.value,
                video_path=str(out_path)
            ))

            self.db.commit()
            return row.id

        except Exception as e:
            print(f'Pipeline error: {e}')
            self.repository.update(row, ReelItemUpdate(status=ReelStatus.FAILED.value))
            self.db.commit()
            return None

    def process_reel_by_id(self, reel_id: int) -> Optional[int]:
        """Process a specific reel by ID through the pipeline."""
        # Ensure tables exist
        from app.database import Base, engine
        Base.metadata.create_all(bind=engine)

        # Get the reel by ID
        reel = self.repository.get(reel_id)
        if not reel:
            return None

        # Optionally, check if the reel is in a state that can be processed (e.g., DISCOVERED or configured)
        # We'll allow any status, but the pipeline expects to start from researching.
        # We'll reset the reel to RESEARCHING and proceed.

        out_path = Path('./data/output') / f"reel_{reel.id}.mp4"

        try:
            # Update status to researching
            self.repository.update(reel, ReelItemUpdate(status=ReelStatus.RESEARCHING.value))

            # Simulate research phase
            time.sleep(1)
            self.repository.update(reel, ReelItemUpdate(
                status=ReelStatus.SCRIPTING.value,
                research_data='{"topic": "AI Research", "key_points": ["Point 1", "Point 2"]}'
            ))

            # Simulate scripting phase
            time.sleep(1)
            self.repository.update(reel, ReelItemUpdate(
                status=ReelStatus.STORYBOARDING.value,
                script='This is a sample script for the AI Reel Factory. It demonstrates the pipeline capabilities.'
            ))

            # Simulate storyboard phase
            time.sleep(1)
            self.repository.update(reel, ReelItemUpdate(
                status=ReelStatus.ASSET_GENERATION.value,
                storyboard='[Scene 1: Introduction][Scene 2: Main Content][Scene 3: Conclusion]'
            ))

            # Simulate asset generation
            time.sleep(1)
            self.repository.update(reel, ReelItemUpdate(
                status=ReelStatus.VOICE_GENERATION.value,
                assets_data='{"images": ["img1.jpg", "img2.jpg"], "background music": "ambient.mp3"}'
            ))

            # Simulate voice generation
            time.sleep(1)
            self.repository.update(reel, ReelItemUpdate(
                status=ReelStatus.RENDERING.value,
                voice_data='{"voice": "neutral", "text": "Sample voiceover text"}'
            ))

            # Generate video
            self.make_video(reel.title, reel.summary, out_path)

            # Simulate QA
            time.sleep(1)
            self.repository.update(reel, ReelItemUpdate(
                status=ReelStatus.QA.value,
                qa_score=95.0
            ))

            # Mark as ready to publish
            self.repository.update(reel, ReelItemUpdate(
                status=ReelStatus.READY_TO_PUBLISH.value,
                video_path=str(out_path)
            ))

            self.db.commit()
            return reel.id

        except Exception as e:
            print(f'Pipeline error for reel {reel.id}: {e}')
            self.repository.update(reel, ReelItemUpdate(status=ReelStatus.FAILED.value))
            self.db.commit()
            return None

    # Job-related methods
    def create_job(self, reel_id: int, job_type: JobType) -> Optional[JobItem]:
        """Create a new job for a reel."""
        # Check if the reel exists
        reel = self.repository.get(reel_id)
        if not reel:
            return None

        # Check if there is already a pending or processing job for this reel
        existing_jobs = self.job_repository.get_by_reel_id(reel_id)
        for job in existing_jobs:
            if job.status in [JobStatus.PENDING.value, JobStatus.PROCESSING.value]:
                # Return the existing job to prevent duplicate processing
                return job

        # Create a new job
        job_in = JobCreate(
            reel_id=reel_id,
            type=job_type,
            status=JobStatus.PENDING,
            progress=0,
            result=None,
            error=None
        )
        return self.job_repository.create(job_in)

    def update_job(self, job_id: int, job_update: JobUpdate) -> Optional[JobItem]:
        """Update a job."""
        job = self.job_repository.get(job_id)
        if not job:
            return None
        return self.job_repository.update(job, job_update)

    def get_job(self, job_id: int) -> Optional[JobItem]:
        """Get a job by ID."""
        return self.job_repository.get(job_id)

    def get_jobs_by_reel_id(self, reel_id: int) -> List[JobItem]:
        """Get all jobs for a reel."""
        return self.job_repository.get_by_reel_id(reel_id)