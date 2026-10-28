from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

class IdentityAsset(Base):
    __tablename__ = "identity_assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    storage_key = Column(String, nullable=False)  # Path relative to storage root
    original_filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("UserItem", back_populates="identity_assets")