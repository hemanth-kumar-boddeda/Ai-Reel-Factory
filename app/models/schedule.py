"""
Schedule Model
Tracks scheduled publishing operations for reels.
"""
from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.reel import ReelItem
from app.models.user import UserItem


class ScheduleItemStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ScheduleItem(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    reel_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    instagram_account_id = Column(String, nullable=False, index=True)  # Instagram professional account ID
    scheduled_at = Column(DateTime, nullable=False, index=True)  # timezone-aware datetime
    timezone = Column(String, nullable=True)  # e.g., 'UTC', 'America/New_York'
    status = Column(String, nullable=False, index=True)  # SCHEDULED, PROCESSING, COMPLETED, FAILED, CANCELLED
    video_hash = Column(String, nullable=True)  # SHA256 of the video at scheduling time, for version check
    error_message = Column(String, nullable=True)  # Error message if scheduling failed
    scheduler_job_id = Column(String, nullable=True)  # RQ scheduled job ID
    job_id = Column(Integer, nullable=True)  # RQ job ID for the actual publishing job
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reel = relationship("ReelItem")
    user = relationship("UserItem")