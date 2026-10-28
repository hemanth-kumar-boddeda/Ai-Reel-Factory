"""
Instagram Publishing Service
Handles the publishing workflow for reels to Instagram.
"""
import hashlib
from typing import Optional, List, Dict, Any
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.instagram import InstagramConnection, InstagramConnectionStatus
from app.models.instagram_publishing import InstagramPublishing, PublishingStatus
from app.models.instagram_publishing import InstagramPublishing, PublishingStatus, InstagramAnalytics
from app.models.reel import ReelItem, ReelStatus
from app.models.schedule import ScheduleItem
from app.services.reel import ReelService
from app.jobs import queue
from app.services.instagram.provider import InstagramProvider, InstagramAPIError
from app.models.job import JobItem, JobType, JobStatus
from app.schemas.job import JobUpdate, JobCreate
import logging

logger = logging.getLogger(__name__)

class InstagramService:
    def __init__(self, db: Session):
        self.db = db
        self.reel_service = ReelService(db)
        self.provider = InstagramProvider(db)

    def _get_video_hash(self, video_path: str) -> str:
        """Compute SHA256 hash of a video file."""
        hash_sha256 = hashlib.sha256()
        with open(video_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    def _create_publishing_record_and_job(self, reel_id: int, user_id: int) -> tuple[Optional[InstagramPublishing], Optional[JobItem]]:
        """Create a publishing record and job for Instagram publishing.
        Does not enqueue the job. Returns (publishing, job) or (None, None) if cannot publish.
        """
        can_publish, reason = self.can_publish(reel_id, user_id)
        if not can_publish:
            logger.warning(f"Cannot publish reel {reel_id} for user {user_id}: {reason}")
            return None, None

        # Get active connection
        connection = self.get_active_connection(user_id)
        if not connection:
            # Should not happen because we already checked
            return None, None

        reel = self.reel_service.get_reel(reel_id)
        if not reel:
            logger.error(f"Reel {reel_id} not found")
            return None, None

        # Create publishing record
        publishing = InstagramPublishing(
            reel_id=reel_id,
            user_id=user_id,
            instagram_account_id=connection.instagram_account_id,
            status=PublishingStatus.PENDING.value,
            caption_used=reel.captions  # Assuming captions field holds the caption
        )
        self.db.add(publishing)
        self.db.commit()
        self.db.refresh(publishing)

        # Create a job for publishing
        job_in = JobCreate(
            reel_id=reel_id,
            user_id=user_id,
            type=JobType.INSTAGRAM_PUBLISH,
            status=JobStatus.QUEUED,
            progress=0,
            result=None,
            error=None
        )
        job = self.reel_service.job_repository.create(job_in)
        if not job:
            logger.error(f"Failed to create publishing job for reel {reel_id}")
            # Update publishing record to failed?
            publishing.status = PublishingStatus.FAILED.value
            publishing.error_message = "Failed to create publishing job"
            self.db.commit()
            return publishing, None

        return publishing, job

    def get_active_connection(self, user_id: int) -> Optional[InstagramConnection]:
        """Return the active Instagram connection for the user."""
        connection = self.db.query(InstagramConnection).filter(
            InstagramConnection.user_id == user_id,
            InstagramConnection.status == InstagramConnectionStatus.ACTIVE.value
        ).first()
        return connection

    def can_publish(self, reel_id: int, user_id: int) -> tuple[bool, str]:
        """Check if a reel can be published to Instagram.
        Returns (True, "") if allowed, else (False, reason).
        """
        # Check reel exists and user owns it
        reel = self.reel_service.get_reel(reel_id)
        if not reel or reel.user_id != user_id:
            return False, "Reel not found or access denied"
        # Check reel status is READY_TO_PUBLISH
        if reel.status != ReelStatus.READY_TO_PUBLISH.value:
            return False, f"Reel is not ready for publishing (current status: {reel.status})"
        # Check final video exists
        if not reel.video_path:
            return False, "No video file found"
        # Validate the final video (reuse ReelService validation)
        validation_result = self.reel_service.validate_final_reel(reel.video_path)
        if not validation_result["valid"]:
            error_msg = "; ".join(validation_result["errors"])
            return False, f"Invalid video: {error_msg}"
        # Check active Instagram connection
        connection = self.get_active_connection(user_id)
        if not connection:
            return False, "No active Instagram connection"
        # Check if there is already an active publishing job for this reel
        # We'll check the InstagramPublishing record for pending/queued/processing
        # For simplicity, we can also check the JobItem for INSTAGRAM_PUBLISH type
        # We'll do both.
        active_publish = self.db.query(InstagramPublishing).filter(
            InstagramPublishing.reel_id == reel_id,
            InstagramPublishing.user_id == user_id,
            InstagramPublishing.status.in_([PublishingStatus.PENDING.value, PublishingStatus.QUEUED.value, PublishingStatus.PROCESSING.value])
        ).first()
        if active_publish:
            return False, "A publishing job is already in progress for this reel"
        # Also check for active job of type INSTAGRAM_PUBLISH
        active_job = self.db.query(JobItem).filter(
            JobItem.reel_id == reel_id,
            JobItem.user_id == user_id,
            JobItem.type == JobType.INSTAGRAM_PUBLISH.value,
            JobItem.status.in_([JobStatus.PENDING.value, JobStatus.QUEUED.value, JobStatus.PROCESSING.value])
        ).first()
        if active_job:
            return False, "A publishing job is already in progress for this reel"
        return True, ""

    def publish_reel(self, reel_id: int, user_id: int) -> Optional[InstagramPublishing]:
        """Create a publishing record and enqueue a publishing job.
        Returns the InstagramPublishing record if successful, None if cannot publish.
        Also triggers initial analytics collection after publishing.
        """
        publishing, job = self._create_publishing_record_and_job(reel_id, user_id)
        if publishing is None or job is None:
            return None

        # Enqueue the job
        try:
            q = queue.get_queue()
            q.enqueue(
                'app.jobs.processor:process_instagram_publish_job',
                job.id,
                job_timeout='10m'
            )
        except Exception as e:
            logger.error(f"Failed to enqueue publishing job for reel {reel_id}: {e}")
            # Update job to failed
            self.reel_service.update_job(job.id, JobUpdate(
                status=JobStatus.FAILED,
                error=f"Failed to enqueue job: {str(e)}"
            ), user_id)
            # Update publishing record to failed
            publishing.status = PublishingStatus.FAILED.value
            publishing.error_message = f"Failed to enqueue job: {str(e)}"
            self.db.add(publishing)
            self.db.commit()
            return publishing

        # Update publishing record with job ID? We don't have a field for job ID.
        # We could add one, but we can also find the job via reel_id and type later.
        # For now, we'll leave it.

        # Trigger initial analytics collection after successful publication
        # Note: We don't wait for this to complete - it's fire-and-forget
        try:
            # Give the publishing job a moment to complete, then schedule analytics
            # In a real implementation, we might want to chain these or use a callback
            # For now, we'll just trigger it immediately - the analytics job will fail
            # if the publishing hasn't completed yet, which is acceptable
            self.refresh_analytics(reel_id, user_id)
        except Exception as e:
            # Don't let analytics failure affect publishing success
            logger.warning(f"Failed to trigger initial analytics for reel {reel_id}: {e}")

        return publishing

    def get_analytics_record(self, reel_id: int, user_id: int) -> Optional[List[InstagramAnalytics]]:
        """Get all analytics records for a reel, ordered by timestamp descending."""
        return self.db.query(InstagramAnalytics).filter(
            InstagramAnalytics.reel_id == reel_id,
            InstagramAnalytics.user_id == user_id
        ).order_by(InstagramAnalytics.metric_timestamp.desc()).all()

    def get_latest_analytics(self, reel_id: int, user_id: int) -> Optional[InstagramAnalytics]:
        """Get the most recent analytics record for a reel."""
        return self.db.query(InstagramAnalytics).filter(
            InstagramAnalytics.reel_id == reel_id,
            InstagramAnalytics.user_id == user_id
        ).order_by(InstagramAnalytics.metric_timestamp.desc()).first()

    def create_analytics_snapshot(self, publishing: InstagramPublishing, metrics_data: Dict[str, Any]) -> InstagramAnalytics:
        """
        Create an analytics snapshot from publishing record and metrics data.
        Does not commit to DB - caller should handle that.
        """
        analytics = InstagramAnalytics(
            user_id=publishing.user_id,
            reel_id=publishing.reel_id,
            instagram_publishing_id=publishing.id,
            instagram_media_id=publishing.published_media_id or "",
            metric_timestamp=datetime.utcnow(),  # Using current time as approximation
            metrics=metrics_data,
            api_version="v12.0"  # Matching our BASE_URL version
        )
        self.db.add(analytics)
        return analytics

    def refresh_analytics(self, reel_id: int, user_id: int) -> Optional[JobItem]:
        """
        Trigger an analytics refresh for a reel by creating and enqueuing a job.
        Returns the job if successful, None if cannot refresh.
        """
        # Check if reel exists and user owns it
        reel = self.reel_service.get_reel(reel_id)
        if not reel or reel.user_id != user_id:
            logger.warning(f"Cannot refresh analytics for reel {reel_id}: not found or access denied")
            return None
            
        # Check if reel is published
        if reel.status != ReelStatus.PUBLISHED.value:
            logger.warning(f"Cannot refresh analytics for reel {reel_id}: not published")
            return None
            
        # Get the most recent publishing record
        publishing = self.get_publishing_record(reel_id, user_id)
        if not publishing or not publishing.published_media_id:
            logger.warning(f"Cannot refresh analytics for reel {reel_id}: no published media")
            return None
            
        # Check if there's already an active analytics job for this reel
        active_job = self.db.query(JobItem).filter(
            JobItem.reel_id == reel_id,
            JobItem.user_id == user_id,
            JobItem.type == JobType.INSTAGRAM_ANALYTICS.value,
            JobItem.status.in_([JobStatus.PENDING.value, JobStatus.QUEUED.value, JobStatus.PROCESSING.value])
        ).first()
        if active_job:
            logger.warning(f"An analytics job is already in progress for reel {reel_id}")
            return active_job
            
        # Create analytics job
        job_in = JobCreate(
            reel_id=reel_id,
            user_id=user_id,
            type=JobType.INSTAGRAM_ANALYTICS,
            status=JobStatus.QUEUED,
            progress=0,
            result=None,
            error=None
        )
        job = self.reel_service.job_repository.create(job_in)
        if not job:
            logger.error(f"Failed to create analytics job for reel {reel_id}")
            return None

        # Enqueue the job
        try:
            q = queue.get_queue()
            q.enqueue(
                'app.jobs.processor:process_instagram_analytics_job',
                job.id,
                job_timeout='10m'
            )
        except Exception as e:
            logger.error(f"Failed to enqueue analytics job for reel {reel_id}: {e}")
            # Update job to failed
            self.reel_service.update_job(job.id, JobUpdate(
                status=JobStatus.FAILED,
                error=f"Failed to enqueue job: {str(e)}"
            ), user_id)
            return job

        return job

    def get_publishing_record(self, reel_id: int, user_id: int) -> Optional[InstagramPublishing]:
        """Get the most recent publishing record for a reel."""
        return self.db.query(InstagramPublishing).filter(
            InstagramPublishing.reel_id == reel_id,
            InstagramPublishing.user_id == user_id
        ).order_by(InstagramPublishing.id.desc()).first()

    def get_analytics_record(self, reel_id: int, user_id: int) -> Optional[List[InstagramAnalytics]]:
        """Get all analytics records for a reel, ordered by timestamp descending."""
        return self.db.query(InstagramAnalytics).filter(
            InstagramAnalytics.reel_id == reel_id,
            InstagramAnalytics.user_id == user_id
        ).order_by(InstagramAnalytics.metric_timestamp.desc()).all()

    def get_latest_analytics(self, reel_id: int, user_id: int) -> Optional[InstagramAnalytics]:
        """Get the most recent analytics record for a reel."""
        return self.db.query(InstagramAnalytics).filter(
            InstagramAnalytics.reel_id == reel_id,
            InstagramAnalytics.user_id == user_id
        ).order_by(InstagramAnalytics.metric_timestamp.desc()).first()

    def create_analytics_snapshot(self, publishing: InstagramPublishing, metrics_data: Dict[str, Any]) -> InstagramAnalytics:
        """
        Create an analytics snapshot from publishing record and metrics data.
        Does not commit to DB - caller should handle that.
        """
        analytics = InstagramAnalytics(
            user_id=publishing.user_id,
            reel_id=publishing.reel_id,
            instagram_publishing_id=publishing.id,
            instagram_media_id=publishing.published_media_id or "",
            metric_timestamp=datetime.utcnow(),  # Using current time as approximation
            metrics=metrics_data,
            api_version="v12.0"  # Matching our BASE_URL version
        )
        self.db.add(analytics)
        return analytics

    def refresh_analytics(self, reel_id: int, user_id: int) -> Optional[JobItem]:
        """
        Trigger an analytics refresh for a reel by creating and enqueuing a job.
        Returns the job if successful, None if cannot refresh.
        """
        # Check if reel exists and user owns it
        reel = self.reel_service.get_reel(reel_id)
        if not reel or reel.user_id != user_id:
            logger.warning(f"Cannot refresh analytics for reel {reel_id}: not found or access denied")
            return None
            
        # Check if reel is published
        if reel.status != ReelStatus.PUBLISHED.value:
            logger.warning(f"Cannot refresh analytics for reel {reel_id}: not published")
            return None
            
        # Get the most recent publishing record
        publishing = self.get_publishing_record(reel_id, user_id)
        if not publishing or not publishing.published_media_id:
            logger.warning(f"Cannot refresh analytics for reel {reel_id}: no published media")
            return None
            
        # Check if there's already an active analytics job for this reel
        active_job = self.db.query(JobItem).filter(
            JobItem.reel_id == reel_id,
            JobItem.user_id == user_id,
            JobItem.type == JobType.INSTAGRAM_ANALYTICS.value,
            JobItem.status.in_([JobStatus.PENDING.value, JobStatus.QUEUED.value, JobStatus.PROCESSING.value])
        ).first()
        if active_job:
            logger.warning(f"An analytics job is already in progress for reel {reel_id}")
            return active_job
            
        # Create analytics job
        job_in = JobCreate(
            reel_id=reel_id,
            user_id=user_id,
            type=JobType.INSTAGRAM_ANALYTICS,
            status=JobStatus.QUEUED,
            progress=0,
            result=None,
            error=None
        )
        job = self.reel_service.job_repository.create(job_in)
        if not job:
            logger.error(f"Failed to create analytics job for reel {reel_id}")
            return None

        # Enqueue the job
        try:
            q = queue.get_queue()
            q.enqueue(
                'app.jobs.processor:process_instagram_analytics_job',
                job.id,
                job_timeout='10m'
            )
        except Exception as e:
            logger.error(f"Failed to enqueue analytics job for reel {reel_id}: {e}")
            # Update job to failed
            self.reel_service.update_job(job.id, JobUpdate(
                status=JobStatus.FAILED,
                error=f"Failed to enqueue job: {str(e)}"
            ), user_id)
            return job

        return job

    def publish_reel(self, reel_id: int, user_id: int) -> Optional[InstagramPublishing]:
        """Create a publishing record and enqueue a publishing job.
        Returns the InstagramPublishing record if successful, None if cannot publish.
        Also triggers initial analytics collection after publishing.
        """
        publishing, job = self._create_publishing_record_and_job(reel_id, user_id)
        if publishing is None or job is None:
            return None

        # Enqueue the job
        try:
            q = queue.get_queue()
            q.enqueue(
                'app.jobs.processor:process_instagram_publish_job',
                job.id,
                job_timeout='10m'
            )
        except Exception as e:
            logger.error(f"Failed to enqueue publishing job for reel {reel_id}: {e}")
            # Update job to failed
            self.reel_service.update_job(job.id, JobUpdate(
                status=JobStatus.FAILED,
                error=f"Failed to enqueue job: {str(e)}"
            ), user_id)
            # Update publishing record to failed
            publishing.status = PublishingStatus.FAILED.value
            publishing.error_message = f"Failed to enqueue job: {str(e)}"
            self.db.add(publishing)
            self.db.commit()
            return publishing

        # Update publishing record with job ID? We don't have a field for job ID.
        # We could add one, but we can also find the job via reel_id and type later.
        # For now, we'll leave it.

        # Trigger initial analytics collection after successful publication
        # Note: We don't wait for this to complete - it's fire-and-forget
        try:
            # Give the publishing job a moment to complete, then schedule analytics
            # In a real implementation, we might want to chain these or use a callback
            # For now, we'll just trigger it immediately - the analytics job will fail
            # if the publishing hasn't completed yet, which is acceptable
            self.refresh_analytics(reel_id, user_id)
        except Exception as e:
            # Don't let analytics failure affect publishing success
            logger.warning(f"Failed to trigger initial analytics for reel {reel_id}: {e}")

        return publishing
