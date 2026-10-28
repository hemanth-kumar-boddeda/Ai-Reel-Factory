from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.identity import IdentityAsset

class ReelStatus(str, Enum):
    DISCOVERED = "DISCOVERED"
    RESEARCHING = "RESEARCHING"
    SCRIPTING = "SCRIPTING"
    STORYBOARDING = "STORYBOARDING"
    ASSET_GENERATION = "ASSET_GENERATION"
    VOICE_GENERATION = "VOICE_GENERATION"
    RENDERING = "RENDERING"
    QA = "QA"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    EDIT_REQUESTED = "EDIT_REQUESTED"
    READY_TO_PUBLISH = "READY_TO_PUBLISH"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"

class ReelItem(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    source = Column(String, index=True)
    title = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    summary = Column(Text)
    score = Column(Integer)
    status = Column(String, default=ReelStatus.DISCOVERED.value, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    video_path = Column(String, nullable=True)
    identity_asset_id = Column(Integer, ForeignKey("identity_assets.id"), nullable=True)

    # Additional fields for extended pipeline
    research_data = Column(Text, nullable=True)
    script = Column(Text, nullable=True)
    storyboard = Column(Text, nullable=True)
    assets_data = Column(Text, nullable=True)
    voice_data = Column(Text, nullable=True)
    qa_score = Column(Float, nullable=True)
    published_url = Column(String, nullable=True)

    # User configuration fields
    hook = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)  # in seconds
    tone = Column(String, nullable=True)
    visual_style = Column(String, nullable=True)
    voice = Column(String, nullable=True)
    captions = Column(String, nullable=True)
    cta = Column(String, nullable=True)

    identity_asset = relationship("IdentityAsset")

    # Relationship to jobs
    jobs = relationship("JobItem", back_populates="reel")
    owner = relationship("UserItem", back_populates="reels")
    # Relationship to reviews
    reviews = relationship("ReviewItem", back_populates="reel", cascade="all, delete-orphan")