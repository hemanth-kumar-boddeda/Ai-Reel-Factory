"""
Instagram Publishing Record
Tracks the publishing status of a reel to Instagram.
"""
from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.reel import ReelItem
from app.models.user import UserItem

class PublishingStatus(str, Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class InstagramPublishing(Base):
    __tablename__ = "instagram_publishings"

    id = Column(Integer, primary_key=True, index=True)
    reel_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    instagram_account_id = Column(String, nullable=False, index=True)
    container_id = Column(String, nullable=True)
    container_status = Column(String, nullable=True)  # e.g., 'FINISHED', 'ERROR'
    published_media_id = Column(String, nullable=True)  # Not unique because we keep history
    caption_used = Column(Text, nullable=True)
    # Provider response metadata (we can store as JSON)
    response_metadata = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    # Version identity: hash of the video file and captions to prevent publishing same version twice
    video_hash = Column(String, nullable=True)  # SHA256 of the video file
    # When the publication was successfully completed
    published_at = Column(DateTime, nullable=True)
    # Number of retry attempts for this publication
    retry_count = Column(Integer, nullable=False, default=0)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)
    status = Column(String, default=PublishingStatus.PENDING.value, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reel = relationship("ReelItem")
    user = relationship("UserItem")

"""
Instagram Analytics Model
Tracks analytics snapshots for published Instagram media.
"""
from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from app.models.reel import ReelItem
from app.models.user import UserItem
from app.models.instagram_publishing import InstagramPublishing

class InstagramAnalytics(Base):
    __tablename__ = "instagram_analytics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reel_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    instagram_publishing_id = Column(Integer, ForeignKey("instagram_publishings.id"), nullable=False, index=True)
    instagram_media_id = Column(String, nullable=False, index=True)  # The Instagram media ID
    metric_timestamp = Column(DateTime, nullable=False)  # When the metrics were measured (from API insights)
    # Store the raw metrics as JSON for flexibility
    metrics = Column(JSON, nullable=False)  # Raw metrics from Instagram API
    # Optional: store API version for reference
    api_version = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("UserItem")
    reel = relationship("ReelItem")
    publishing = relationship("InstagramPublishing")

    def __repr__(self):
        return f"<InstagramAnalytics(id={self.id}, media_id='{self.instagram_media_id}', timestamp='{self.metric_timestamp}')>"
