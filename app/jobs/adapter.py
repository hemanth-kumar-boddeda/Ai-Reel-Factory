"""
Queue abstraction layer for job enqueuing.
Provides a unified interface for enqueuing jobs regardless of the underlying
queue implementation (BackgroundTasks, RQ, etc.).
"""
import logging
from typing import Optional
from fastapi import BackgroundTasks

from rq import Retry
logger = logging.getLogger(__name__)

class JobQueueAdapter:
    """
    Adapter for job queue operations.
    Supports BackgroundTasks (default) and can be extended for RQ.
    """

    def __init__(self, background_tasks: Optional[BackgroundTasks] = None, use_rq: bool = False):
        """
        Initialize the queue adapter.

        Args:
            background_tasks: FastAPI BackgroundTasks instance (for API context)
                            None when used outside API context (e.g., tests, workers)
            use_rq: If True, use RQ for queuing; otherwise use BackgroundTasks
        """
        self.background_tasks = background_tasks
        self.use_rq = use_rq
        self._tasks = []  # Track tasks for testing/visibility when not using real queue

    def enqueue_job(self, job_id: int, reel_id: int) -> bool:
        """
        Enqueue a job for processing.

        Args:
            job_id: The ID of the JobItem to process
            reel_id: The ID of the ReelItem to process

        Returns:
            bool: True if job was successfully queued, False otherwise
        """
        try:
            if self.use_rq:
                # Use RQ for queuing
                return self._enqueue_to_rq(job_id, reel_id)
            else:
                # Use BackgroundTasks for queuing (default for backward compatibility)
                return self._enqueue_to_background_tasks(job_id, reel_id)

        except Exception as e:
            logger.error(f"Failed to enqueue job {job_id}: {e}", exc_info=True)
            return False

    def _enqueue_to_rq(self, job_id: int, reel_id: int) -> bool:
        """
        Enqueue job to RQ queue.

        Args:
            job_id: The ID of the JobItem to process
            reel_id: The ID of the ReelItem to process

        Returns:
            bool: True if job was successfully queued, False otherwise
        """
        try:
            import app.jobs.queue
            queue = app.jobs.queue.get_queue()
            # Enqueue the worker-safe function that takes only job_id
            queue.enqueue("app.jobs.processor:process_reel_job", job_id, job_timeout=1800, retry=Retry(max=3))
            logger.debug(f"Enqueued job {job_id} for reel {reel_id} via RQ")
            return True
        except Exception as e:
            logger.error(f"Failed to enqueue job {job_id} to RQ: {e}", exc_info=True)
            return False

    def _enqueue_to_background_tasks(self, job_id: int, reel_id: int) -> bool:
        """
        Enqueue job to BackgroundTasks.

        Args:
            job_id: The ID of the JobItem to process
            reel_id: The ID of the ReelItem to process

        Returns:
            bool: True if job was successfully queued, False otherwise
        """
        try:
            if self.background_tasks is not None:
                # API context: use BackgroundTasks
                from app.jobs.processor import process_reel_job
                self.background_tasks.add_task(process_reel_job, job_id)
                logger.debug(f"Enqueued job {job_id} for reel {reel_id} via BackgroundTasks")
                return True
            else:
                # Non-API context: for testing or alternative implementations
                # Execute immediately for testability
                logger.info(f"Processing job {job_id} for reel {reel_id} immediately (non-API context)")
                from app.jobs.processor import process_reel_job
                process_reel_job(job_id)
                return True

        except Exception as e:
            logger.error(f"Failed to enqueue job {job_id} to BackgroundTasks: {e}", exc_info=True)
            return False

    def get_queued_tasks_count(self) -> int:
        """
        Get the number of tasks queued (mainly for testing/visibility).

        Returns:
            int: Number of tasks queued
        """
        if self.background_tasks is not None and not self.use_rq:
            # BackgroundTasks doesn't expose queued count easily
            return len(self.background_tasks.tasks) if hasattr(self.background_tasks, 'tasks') else -1
        else:
            # For RQ or non-BackgroundTasks contexts, return tracked count
            return len(self._tasks)