from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.reel import ReelItem

class JobStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class JobType(str, Enum):
    RENDER = "RENDER"
    # Future types can be added here
    # SCRIPT_GENERATION = "SCRIPT_GENERATION"
    # ASSET_GENERATION = "ASSET_GENERATION"
    # VOICE_GENERATION = "VOICE_GENERATION"

class JobItem(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    reel_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # could use Enum but String is fine for now
    status = Column(String, default=JobStatus.PENDING.value)
    progress = Column(Integer, default=0)  # 0-100
    result = Column(Text, nullable=True)  # JSON string or text
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to ReelItem
    reel = relationship("ReelItem", back_populates="jobs")