from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"

class UserItem(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default=UserRole.USER.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reels = relationship("ReelItem", back_populates="owner")
    jobs = relationship("JobItem", back_populates="owner")
    instagram_connections = relationship("InstagramConnection", back_populates="owner")
    identity_assets = relationship("IdentityAsset", back_populates="user")
    reviews = relationship("ReviewItem", back_populates="user")