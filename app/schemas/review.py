from pydantic import BaseModel, ConfigDict, Field, validator
from typing import Optional
from datetime import datetime

class ReviewItemBase(BaseModel):
    timestamp_seconds: float = Field(..., ge=0, description="Timestamp in seconds from the start of the video")
    comment_text: str = Field(..., min_length=1, description="Comment text")
    resolved: Optional[bool] = Field(False, description="Whether the comment has been resolved")

    model_config = ConfigDict(from_attributes=True)

class ReviewItemCreate(ReviewItemBase):
    pass

class ReviewItemUpdate(BaseModel):
    timestamp_seconds: Optional[float] = Field(None, ge=0)
    comment_text: Optional[str] = Field(None, min_length=1)
    resolved: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

class ReviewItemInDBBase(ReviewItemBase):
    id: int
    reel_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReviewItem(ReviewItemInDBBase):
    pass

class ReviewItemInDB(ReviewItemInDBBase):
    pass

# Schemas for edit request and approval
class EditRequestCreate(BaseModel):
    # We might want to include a comment or reason for the edit request
    comment: Optional[str] = Field(None, description="Optional comment or reason for the edit request")
    model_config = ConfigDict(from_attributes=True)

class ApproveResponse(BaseModel):
    success: bool
    message: str
    reel_id: int
    new_status: str
    model_config = ConfigDict(from_attributes=True)