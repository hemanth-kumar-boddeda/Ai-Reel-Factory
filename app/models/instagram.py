from datetime import datetime
from enum import Enum
from app.database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

class InstagramConnectionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"

class InstagramConnection(Base):
    __tablename__ = "instagram_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    instagram_account_id = Column(String, nullable=False, unique=True, index=True)  # Instagram professional account ID
    account_username = Column(String, nullable=True)  # Instagram handle
    account_name = Column(String, nullable=True)  # Display name
    access_token_encrypted = Column(Text, nullable=False)  # Encrypted access token
    token_type = Column(String, nullable=True)  # e.g., Bearer
    expires_at = Column(DateTime, nullable=True)  # Token expiration time
    status = Column(String, default=InstagramConnectionStatus.ACTIVE.value, index=True)
    provider = Column(String, default="instagram", index=True)  # Could be extended for other providers
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to User
    owner = relationship("UserItem", back_populates="instagram_connections")
