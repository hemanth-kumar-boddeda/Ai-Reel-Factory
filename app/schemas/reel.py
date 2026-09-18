from pydantic import BaseModel, HttpUrl, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.reel import ReelStatus

class ReelItemBase(BaseModel):
    source: str
    title: str
    url: HttpUrl
    summary: Optional[str] = None
    identity_reference_path: Optional[str] = None
    score: Optional[int] = None
    # Configuration fields (optional for create, but we can include them as optional)
    hook: Optional[str] = None
    duration: Optional[int] = None  # in seconds
    tone: Optional[str] = None
    visual_style: Optional[str] = None
    voice: Optional[str] = None
    captions: Optional[str] = None
    cta: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReelItemCreate(ReelItemBase):
    pass

class ReelItemUpdate(BaseModel):
    source: Optional[str] = None
    title: Optional[str] = None
    url: Optional[HttpUrl] = None
    summary: Optional[str] = None
    identity_reference_path: Optional[str] = None
    score: Optional[int] = None
    status: Optional[ReelStatus] = None
    video_path: Optional[str] = None
    research_data: Optional[str] = None
    script: Optional[str] = None
    storyboard: Optional[str] = None
    assets_data: Optional[str] = None
    voice_data: Optional[str] = None
    qa_score: Optional[float] = None
    published_url: Optional[HttpUrl] = None
    # Configuration fields
    hook: Optional[str] = None
    duration: Optional[int] = None
    tone: Optional[str] = None
    visual_style: Optional[str] = None
    voice: Optional[str] = None
    captions: Optional[str] = None
    cta: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReelItemInDBBase(ReelItemBase):
    id: int
    status: ReelStatus
    created_at: datetime
    updated_at: datetime
    video_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReelItem(ReelItemInDBBase):
    research_data: Optional[str] = None
    script: Optional[str] = None
    storyboard: Optional[str] = None
    assets_data: Optional[str] = None
    voice_data: Optional[str] = None
    qa_score: Optional[float] = None
    published_url: Optional[HttpUrl] = None
    identity_reference_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReelItemInDB(ReelItemInDBBase):
    research_data: Optional[str] = None
    script: Optional[str] = None
    storyboard: Optional[str] = None
    assets_data: Optional[str] = None
    voice_data: Optional[str] = None
    qa_score: Optional[float] = None
    published_url: Optional[HttpUrl] = None
    identity_reference_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)