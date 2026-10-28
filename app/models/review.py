from datetime import datetime
from app.database import Base
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

class ReviewItem(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    reel_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    timestamp_seconds = Column(Float, nullable=False)
    comment_text = Column(Text, nullable=False)
    resolved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    reel = relationship("ReelItem", back_populates="reviews")
    user = relationship("UserItem", back_populates="reviews")