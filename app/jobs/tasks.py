from app.jobs.processor import process_reel_job
from app.services.instagram.service import InstagramService
from app.database import SessionLocal
from app.models.schedule import ScheduleItem, ScheduleItemStatus
from app.models.reel import ReelItem, ReelStatus
from app.models.instagram_publishing import PublishingStatus
from app.schemas.job import JobUpdate
from app.models.job import JobStatus
import logging

logger = logging.getLogger(__name__)

def process_reel_task(job_id: int):
    """
    RQ worker task to process a reel render job.
    This function delegates to the worker-safe process_reel_job function
    to ensure identical behavior between different execution mechanisms.
    The function derives the reel_id from the persistent JobItem.
    """
    process_reel_job(job_id)


def process_scheduled_publish(schedule_id: int) -> None:
    """
    Process a scheduled publish by its ID.

    This function is worker-safe: it creates its own database session,
    does not depend on request context, and handles its own transactions.

    Args:
        schedule_id: The ID of the ScheduleItem to process

    Returns:
        None
    """
    logger.info(f"Starting processing for scheduled publish {schedule_id}")

    with SessionLocal() as db:
        # Load the schedule to check current state
        schedule = db.query(ScheduleItem).filter(ScheduleItem.id == schedule_id).first()
        if not schedule:
            logger.error(f"Schedule {schedule_id} not found")
            return

        # Idempotency check: don't process if already finished or processing
        if schedule.status in [ScheduleItemStatus.COMPLETED.value, ScheduleItemStatus.FAILED.value]:
            logger.info(f"Schedule {schedule_id} already finished with status {schedule.status}")
            return

        if schedule.status == ScheduleItemStatus.PROCESSING.value:
            logger.warning(f"Schedule {schedule_id} is already being processed")
            return

        # Only SCHEDULED schedules should be processed by workers
        if schedule.status != ScheduleItemStatus.SCHEDULED.value:
            logger.error(f"Schedule {schedule_id} has unexpected status {schedule.status} for processing")
            return

        # Get reel to obtain user_id and check status
        reel = schedule.reel  # thanks to relationship
        if not reel:
            logger.error(f"Reel {schedule.reel_id} not found for schedule {schedule_id}")
            return
        user_id = schedule.user_id

        # Verify ownership - reel should belong to the same user as the schedule
        if reel.user_id != user_id:
            logger.error(f"Ownership mismatch for schedule {schedule_id}: reel user {reel.user_id} != schedule user {user_id}")
            schedule.status = ScheduleItemStatus.FAILED.value
            schedule.error_message = "Ownership mismatch"
            db.add(schedule)
            db.commit()
            return

        # Check reel status is READY_TO_PUBLISH
        if reel.status != ReelStatus.READY_TO_PUBLISH.value:
            logger.error(f"Reel {reel.id} is not READY_TO_PUBLISH for schedule {schedule_id}")
            # Update schedule to failed
            schedule.status = ScheduleItemStatus.FAILED.value
            schedule.error_message = f"Reel is not READY_TO_PUBLISH (current status: {reel.status})"
            db.add(schedule)
            db.commit()
            return

        # Check final video exists
        if not reel.video_path:
            logger.error(f"No video file found for reel {reel.id}")
            schedule.status = ScheduleItemStatus.FAILED.value
            schedule.error_message = "No video file found"
            db.add(schedule)
            db.commit()
            return

        # Validate the final video (reuse ReelService validation)
        from app.services.reel import ReelService
        reel_service = ReelService(db)
        validation_result = reel_service.validate_final_reel(reel.video_path)
        if not validation_result["valid"]:
            error_msg = "; ".join(validation_result["errors"])
            logger.error(f"Invalid video for reel {reel.id}: {error_msg}")
            schedule.status = ScheduleItemStatus.FAILED.value
            schedule.error_message = f"Invalid video: {error_msg}"
            db.add(schedule)
            db.commit()
            return

        # Check active Instagram connection and account match
        from app.services.instagram.service import InstagramService
        insta_service = InstagramService(db)
        connection = insta_service.get_active_connection(user_id)
        if not connection:
            logger.error(f"No active Instagram connection for user {user_id}")
            schedule.status = ScheduleItemStatus.FAILED.value
            schedule.error_message = "No active Instagram connection"
            db.add(schedule)
            db.commit()
            return

        if connection.instagram_account_id != schedule.instagram_account_id:
            logger.error(f"Instagram account mismatch for schedule {schedule_id}")
            schedule.status = ScheduleItemStatus.FAILED.value
            schedule.error_message = "Instagram account has changed"
            db.add(schedule)
            db.commit()
            return

        # Check video hash matches
        if schedule.video_hash:
            # Compute hash of current video
            import hashlib
            hash_sha256 = hashlib.sha256()
            try:
                with open(reel.video_path, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        hash_sha256.update(chunk)
            except FileNotFoundError:
                logger.error(f"Video file not found for reel {reel.id} during hash check")
                schedule.status = ScheduleItemStatus.FAILED.value
                schedule.error_message = "Video file not found"
                db.add(schedule)
                db.commit()
                return
            current_hash = hash_sha256.hexdigest()
            if current_hash != schedule.video_hash:
                logger.error(f"Video hash mismatch for schedule {schedule_id}")
                schedule.status = ScheduleItemStatus.FAILED.value
                schedule.error_message = "Video has been regenerated or changed"
                db.add(schedule)
                db.commit()
                return

        # All checks passed, now create the publishing record and job
        # We'll use the InstagramService's helper to create the publishing record and job
        publishing, job = insta_service._create_publishing_record_and_job(reel.id, user_id)
        if publishing is None or job is None:
            # Helper already logged the reason
            schedule.status = ScheduleItemStatus.FAILED.value
            schedule.error_message = "Failed to create publishing record and job"
            db.add(schedule)
            db.commit()
            return

        # Set the schedule_id on the publishing record
        publishing.schedule_id = schedule.id
        db.add(publishing)
        db.commit()

        # Update schedule to PROCESSING and store the job ID for tracking
        schedule.status = ScheduleItemStatus.PROCESSING.value
        schedule.job_id = job.id
        db.add(schedule)
        db.commit()

        # Enqueue the job for actual publishing
        try:
            import app.jobs.queue
            queue = app.jobs.queue.get_queue()
            queue.enqueue(
                'app.jobs.processor:process_instagram_publish_job',
                job.id,
                job_timeout='10m'
            )
            logger.info(f"Scheduled publish {schedule_id} enqueued publishing job {job.id}")
        except Exception as e:
            logger.error(f"Failed to enqueue publishing job for schedule {schedule_id}: {e}")
            # Update schedule and job and publishing to failed
            schedule.status = ScheduleItemStatus.FAILED.value
            schedule.error_message = f"Failed to enqueue job: {str(e)}"
            # Update job to failed
            insta_service.reel_service.update_job(job.id, JobUpdate(
                status=JobStatus.FAILED,
                error=f"Failed to enqueue job: {str(e)}"
            ), user_id)
            # Update publishing to failed
            publishing.status = PublishingStatus.FAILED.value
            publishing.error_message = f"Failed to enqueue job: {str(e)}"
            db.add(schedule)
            db.add(publishing)
            db.commit()
            return

        logger.info(f"Scheduled publish {schedule_id} processed successfully, job {job.id} enqueued")