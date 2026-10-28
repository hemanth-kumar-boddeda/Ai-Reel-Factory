"""
Worker-safe reel processing entry point.
This function is designed to be called by RQ workers or other background processing systems.
It creates its own database session and does not depend on FastAPI request context.
"""
from app.database import SessionLocal
from app.services.reel import ReelService
from app.models.job import JobStatus
from app.schemas.job import JobUpdate
from app.models.schedule import ScheduleItem, ScheduleItemStatus
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def process_reel_job(job_id: int) -> None:
    """
    Process a reel render job by its ID.

    This function is worker-safe: it creates its own database session,
    does not depend on request context, and handles its own transactions.

    Args:
        job_id: The ID of the JobItem to process

    Returns:
        None
    """
    logger.info(f"Starting processing for job {job_id}")

    with SessionLocal() as db:
        service = ReelService(db)

        # Load the job to check current state
        job = service.job_repository.get(job_id)  # get without user check
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Get reel to obtain user_id for ownership checks
        reel = service.repository.get(job.reel_id)
        if not reel:
            logger.error(f"Reel {job.reel_id} not found for job {job_id}")
            return
        user_id = reel.user_id

        # Idempotency check: don't process if already finished or processing
        if job.status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
            logger.info(f"Job {job_id} already finished with status {job.status}")
            return

        if job.status == JobStatus.PROCESSING.value:
            logger.warning(f"Job {job_id} is already being processed")
            return

        # Only QUEUED jobs should be processed by workers
        if job.status != JobStatus.QUEUED.value:
            logger.error(f"Job {job_id} has unexpected status {job.status} for processing")
            return

        # Atomically transition from QUEUED to PROCESSING
        try:
            # Update job to processing state
            job_update = JobUpdate(
                status=JobStatus.PROCESSING,
                progress=10
            )
            updated_job = service.update_job(job_id, job_update)
            if not updated_job:
                logger.error(f"Failed to update job {job_id} to processing state")
                return

            logger.info(f"Job {job_id} transitioned to PROCESSING state")

        except Exception as e:
            logger.error(f"Failed to transition job {job_id} to processing: {e}")
            # Try to mark as failed
            try:
                service.update_job(job_id, JobUpdate(
                    status=JobStatus.FAILED,
                    error=f"Failed to start processing: {str(e)}"
                ))
            except Exception as update_error:
                logger.error(f"Also failed to mark job {job_id} as failed: {update_error}")
            return

        # Process the reel
        try:
            logger.info(f"Processing reel for job {job_id}")
            processed_reel_id = service.process_reel_by_id(job.reel_id, user_id)

            if processed_reel_id:
                # Update job to completed
                service.update_job(job_id, JobUpdate(
                    status=JobStatus.COMPLETED,
                    progress=100,
                    result=f"Reel {processed_reel_id} processed successfully"
                ))
                logger.info(f"Job {job_id} completed successfully for reel {processed_reel_id}")
            else:
                # Update job to failed
                error_message = "Failed to process reel"
                try:
                    # Try to get detailed error information from the reel
                    failed_reel = service.repository.get(job.reel_id)
                    if failed_reel and failed_reel.research_data:
                        import json
                        error_data = json.loads(failed_reel.research_data)
                        if isinstance(error_data, dict) and "error_type" in error_data and "error_message" in error_data:
                            error_message = f"{error_data['error_type']}: {error_data['error_message']}"
                except Exception:
                    # If we can't get/error parsing the error data, use the generic message
                    pass
                service.update_job(job_id, JobUpdate(
                    status=JobStatus.FAILED,
                    error=error_message
                ))
                logger.error(f"Job {job_id} failed to process reel {job.reel_id}")

        except Exception as e:
            logger.error(f"Error processing job {job_id}: {e}", exc_info=True)
            print(f"EXCEPTION IN PROCESS_REEL_JOB: {e}")  # Debug print
            import traceback
            print(f"TRACEBACK: {traceback.format_exc()}")  # Debug print
            # Update job to failed with error details
            try:
                service.update_job(job_id, JobUpdate(
                    status=JobStatus.FAILED,
                    error=str(e)
                ))
            except Exception as update_error:
                logger.error(f"Failed to update job {job_id} as failed: {update_error}")
            return

def process_pipeline_job(job_id: int) -> None:
    """
    Process a pipeline job by its ID.

    This function is worker-safe: it creates its own database session,
    does not depend on request context, and handles its own transactions.

    Args:
        job_id: The ID of the JobItem to process (pipeline job)

    Returns:
        None
    """
    logger.info(f"Starting processing for pipeline job {job_id}")

    with SessionLocal() as db:
        service = ReelService(db)

        # Load the job to check current state
        job = service.job_repository.get(job_id)  # get without user check
        if not job:
            logger.error(f"Pipeline job {job_id} not found")
            return

        # For pipeline jobs, reel_id is None, so we get user_id from the job directly
        user_id = job.user_id

        # Idempotency check: don't process if already finished or processing
        if job.status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
            logger.info(f"Pipeline job {job_id} already finished with status {job.status}")
            return

        if job.status == JobStatus.PROCESSING.value:
            logger.warning(f"Pipeline job {job_id} is already being processed")
            return

        # Only QUEUED jobs should be processed by workers
        if job.status != JobStatus.QUEUED.value:
            logger.error(f"Pipeline job {job_id} has unexpected status {job.status} for processing")
            return

        # Atomically transition from QUEUED to PROCESSING
        try:
            # Update job to processing state
            job_update = JobUpdate(
                status=JobStatus.PROCESSING,
                progress=10
            )
            updated_job = service.update_job(job_id, job_update)
            if not updated_job:
                logger.error(f"Failed to update pipeline job {job_id} to processing state")
                return

            logger.info(f"Pipeline job {job_id} transitioned to PROCESSING state")

        except Exception as e:
            logger.error(f"Failed to transition pipeline job {job_id} to processing: {e}")
            try:
                service.update_job(job_id, JobUpdate(status=JobStatus.FAILED, error=f"Failed to start processing: {str(e)}"))
            except Exception as update_error:
                logger.error(f"Also failed to mark pipeline job {job_id} as failed: {update_error}")
            return

        # Process the pipeline
        try:
            logger.info(f"Processing pipeline for job {job_id} (user_id={user_id})")
            processed_reel_id = service.process_pipeline(user_id)

            if processed_reel_id is not None:
                # Update job to completed
                service.update_job(job_id, JobUpdate(status=JobStatus.COMPLETED, progress=100, result=f"Pipeline processed successfully, reel {processed_reel_id} was generated"))
                logger.info(f"Pipeline job {job_id} completed successfully for user {user_id}")
            else:
                # Update job to completed with no work
                service.update_job(job_id, JobUpdate(status=JobStatus.COMPLETED, progress=100, result="No discovered reel to process"))
                logger.info(f"Pipeline job {job_id} completed with no work (no discovered reel)")

        except Exception as e:
            # Update job to failed with error details
            logger.error(f"Error processing pipeline job {job_id}: {e}", exc_info=True)
            try:
                service.update_job(job_id, JobUpdate(status=JobStatus.FAILED, error=str(e)))
            except Exception as update_error:
                logger.error(f"Failed to update pipeline job {job_id} as failed: {update_error}")
                return
            except Exception as update_error:
                logger.error(f"Failed to update pipeline job {job_id} as failed: {update_error}")
            return


def process_instagram_publish_job(job_id: int) -> None:
    """
    Process an Instagram publishing job by its ID.

    This function is worker-safe: it creates its own database session,
    does not depend on request context, and handles its own transactions.

    Args:
        job_id: The ID of the JobItem to process

    Returns:
        None
    """
    logger.info(f"Starting processing for Instagram publish job {job_id}")

    from app.services.instagram.service import InstagramService
    from app.models.job import JobStatus
    from app.schemas.job import JobUpdate
    from app.models.instagram_publishing import PublishingStatus

    with SessionLocal() as db:
        service = InstagramService(db)

        # Load the job to check current state
        job = service.reel_service.job_repository.get(job_id)  # get without user check
        if not job:
            logger.error(f"Instagram publish job {job_id} not found")
            return

        # Get reel to obtain user_id for ownership checks
        reel = service.reel_service.repository.get(job.reel_id)
        if not reel:
            logger.error(f"Reel {job.reel_id} not found for Instagram publish job {job_id}")
            return
        user_id = reel.user_id

        # Idempotency check: don't process if already finished or processing
        if job.status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
            logger.info(f"Instagram publish job {job_id} already finished with status {job.status}")
            return

        if job.status == JobStatus.PROCESSING.value:
            logger.warning(f"Instagram publish job {job_id} is already being processed")
            return

        # Only QUEUED jobs should be processed by workers
        if job.status != JobStatus.QUEUED.value:
            logger.error(f"Instagram publish job {job_id} has unexpected status {job.status} for processing")
            return

        # Atomically transition from QUEUED to PROCESSING
        try:
            # Update job to processing state
            job_update = JobUpdate(
                status=JobStatus.PROCESSING,
                progress=10
            )
            updated_job = service.reel_service.update_job(job_id, job_update)
            if not updated_job:
                logger.error(f"Failed to update Instagram publish job {job_id} to processing state")
                return

            logger.info(f"Instagram publish job {job_id} transitioned to PROCESSING state")

        except Exception as e:
            logger.error(f"Failed to transition Instagram publish job {job_id} to processing: {e}")
            # Try to mark as failed
            try:
                service.reel_service.update_job(job_id, JobUpdate(
                    status=JobStatus.FAILED,
                    error=f"Failed to start processing: {str(e)}"
                ))
            except Exception as update_error:
                logger.error(f"Also failed to mark job {job_id} as failed: {update_error}")
            return

        # Process the Instagram publishing
        try:
            logger.info(f"Starting Instagram publish for job {job_id}")
            # Get active Instagram connection for the user
            connection = service.get_active_connection(user_id)
            if not connection:
                raise Exception("No active Instagram connection")

            # Get the most recent publishing record for this reel/user
            publishing = service.get_publishing_record(job.reel_id, user_id)
            if not publishing:
                raise Exception("No publishing record found for this reel")

            # Update publishing record status to PROCESSING
            publishing.status = PublishingStatus.PROCESSING.value
            db.add(publishing)
            db.commit()

            # Get the reel's video path and captions
            if not reel.video_path:
                raise Exception("No video file found")
            # Validate the final video (reuse ReelService validation)
            validation_result = service.reel_service.validate_final_reel(reel.video_path)
            if not validation_result["valid"]:
                error_msg = "; ".join(validation_result["errors"])
                raise Exception(f"Invalid video: {error_msg}")

            # Get publishable video URL
            publishable_url = service.reel_service.get_publishable_video_url(reel)
            if not publishable_url:
                raise Exception("Cannot determine publishable video URL")

            # Create container
            container_id = service.provider.create_reel_container(
                connection=connection,
                video_url=publishable_url,
                caption=reel.captions or ""
            )
            # Update publishing record with container ID
            publishing.container_id = container_id
            db.add(publishing)
            db.commit()

            # Poll container status
            max_attempts = 30
            attempt = 0
            while attempt < max_attempts:
                status_info = service.provider.get_container_status(connection, container_id)
                container_status = status_info.get('status_code')
                if container_status == 'FINISHED':
                    break
                elif container_status == 'ERROR':
                    raise Exception(f"Container error: {status_info.get('error')}")
                # else: still IN_PROGRESS or undefined
                import time
                time.sleep(5)  # wait 5 seconds
                attempt += 1
            else:
                raise Exception("Container preparation timed out")

            # Update publishing record with container status
            publishing.container_status = container_status
            db.add(publishing)
            db.commit()

            # Publish container
            media_id = service.provider.publish_container(connection, container_id)
            publishing.published_media_id = media_id
            publishing.status = PublishingStatus.COMPLETED.value
            publishing.updated_at = datetime.utcnow()
            db.add(publishing)
            db.commit()

            # Update reel status to PUBLISHED
            service.reel_service.repository.update(reel, ReelItemUpdate(status=ReelStatus.PUBLISHED.value))
            db.commit()

            # Update job to completed
            service.reel_service.update_job(job_id, JobUpdate(
                status=JobStatus.COMPLETED,
                progress=100,
                result=f"Reel {reel.id} published to Instagram with media ID {media_id}"
            ))

            # Update schedule to COMPLETED if this publishing was triggered by a schedule
            if publishing.schedule_id:
                schedule = db.query(ScheduleItem).filter(ScheduleItem.id == publishing.schedule_id).first()
                if schedule:
                    schedule.status = ScheduleItemStatus.COMPLETED.value
                    schedule.updated_at = datetime.utcnow()
                    db.add(schedule)
                    db.commit()

            logger.info(f"Instagram publish job {job_id} completed successfully for reel {reel.id}")

        except Exception as e:
            # Update job to failed with error details
            logger.error(f"Error processing Instagram publish job {job_id}: {e}", exc_info=True)
            try:
                service.reel_service.update_job(job_id, JobUpdate(
                    status=JobStatus.FAILED,
                    error=str(e)
                ))
            except Exception as update_error:
                logger.error(f"Failed to update job {job_id} as failed: {update_error}")
            # Update publishing record to failed if we have it
            if 'publishing' in locals():
                publishing.status = PublishingStatus.FAILED.value
                publishing.error_message = str(e)
                publishing.updated_at = datetime.utcnow()
                db.add(publishing)
                db.commit()

                # Update schedule to FAILED if this publishing was triggered by a schedule
                if publishing.schedule_id:
                    schedule = db.query(ScheduleItem).filter(ScheduleItem.id == publishing.schedule_id).first()
                    if schedule:
                        schedule.status = ScheduleItemStatus.FAILED.value
                        schedule.error_message = str(e)
                        schedule.updated_at = datetime.utcnow()
                        db.add(schedule)
                        db.commit()
            return


def process_instagram_analytics_job(job_id: int) -> None:
    """
    Process an Instagram analytics job by its ID.

    This function is worker-safe: it creates its own database session,
    does not depend on request context, and handles its own transactions.

    Args:
        job_id: The ID of the JobItem to process

    Returns:
        None
    """
    logger.info(f"Starting processing for Instagram analytics job {job_id}")

    from app.services.instagram.service import InstagramService
    from app.models.job import JobStatus
    from app.schemas.job import JobUpdate
    from app.models.instagram_publishing import InstagramPublishing

    with SessionLocal() as db:
        service = InstagramService(db)

        # Load the job to check current state
        job = service.reel_service.job_repository.get(job_id)  # get without user check
        if not job:
            logger.error(f"Instagram analytics job {job_id} not found")
            return

        # Get reel to obtain user_id for ownership checks
        reel = service.reel_service.repository.get(job.reel_id)
        if not reel:
            logger.error(f"Reel {job.reel_id} not found for Instagram analytics job {job_id}")
            return
        user_id = reel.user_id

        # Idempotency check: don't process if already finished or processing
        if job.status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
            logger.info(f"Instagram analytics job {job_id} already finished with status {job.status}")
            return

        if job.status == JobStatus.PROCESSING.value:
            logger.warning(f"Instagram analytics job {job_id} is already being processed")
            return

        # Only QUEUED jobs should be processed by workers
        if job.status != JobStatus.QUEUED.value:
            logger.error(f"Instagram analytics job has unexpected status {job.status} for processing")
            return

        # Atomically transition from QUEUED to PROCESSING
        try:
            # Update job to processing state
            job_update = JobUpdate(
                status=JobStatus.PROCESSING,
                progress=10
            )
            updated_job = service.reel_service.update_job(job_id, job_update)
            if not updated_job:
                logger.error(f"Failed to update Instagram analytics job {job_id} to processing state")
                return

            logger.info(f"Instagram analytics job {job_id} transitioned to PROCESSING state")

        except Exception as e:
            logger.error(f"Failed to transition Instagram analytics job {job_id} to processing: {e}")
            # Try to mark as failed
            try:
                service.reel_service.update_job(job_id, JobUpdate(
                    status=JobStatus.FAILED,
                    error=f"Failed to start processing: {str(e)}"
                ))
            except Exception as update_error:
                logger.error(f"Also failed to mark job {job_id} as failed: {update_error}")
            return

        # Process the Instagram analytics
        try:
            logger.info(f"Starting Instagram analytics collection for job {job_id}")
            # Get active Instagram connection for the user
            connection = service.get_active_connection(user_id)
            if not connection:
                raise Exception("No active Instagram connection")

            # Get the most recent publishing record for this reel/user
            publishing = service.get_publishing_record(job.reel_id, user_id)
            if not publishing:
                raise Exception("No publishing record found for this reel")

            if not publishing.published_media_id:
                raise Exception("No published media ID found for this reel")

            # Get media insights from Instagram
            insights_response = service.provider.get_media_insights(connection, publishing.published_media_id)
            
            # Normalize the insights
            normalized_insights = service.provider.normalize_media_insights(insights_response)
            
            # Create analytics snapshot
            analytics = service.create_analytics_snapshot(publishing, normalized_insights)
            
            # Commit the analytics record
            db.commit()

            # Update job to completed
            service.reel_service.update_job(job_id, JobUpdate(
                status=JobStatus.COMPLETED,
                progress=100,
                result=f"Analytics collected for reel {reel.id}, media {publishing.published_media_id}"
            ))

            logger.info(f"Instagram analytics job {job_id} completed successfully for reel {reel.id}")

        except Exception as e:
            # Update job to failed with error details
            logger.error(f"Error processing Instagram analytics job {job_id}: {e}", exc_info=True)
            try:
                service.reel_service.update_job(job_id, JobUpdate(
                    status=JobStatus.FAILED,
                    error=str(e)
                ))
            except Exception as update_error:
                logger.error(f"Failed to update job {job_id} as failed: {update_error}")
            return
