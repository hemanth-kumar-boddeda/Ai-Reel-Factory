from pydantic import BaseModel, HttpUrl, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.reel import ReelStatus

class ReelItemBase(BaseModel):
    source: str
    title: str
    url: HttpUrl
    summary: Optional[str] = None
    score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ReelItemCreate(ReelItemBase):
    pass

class ReelItemUpdate(BaseModel):
    source: Optional[str] = None
    title: Optional[str] = None
    url: Optional[HttpUrl] = None
    summary: Optional[str] = None
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

class ReelItemInDB(ReelItemInDBBase):
    research_data: Optional[str] = None
    script: Optional[str] = None
    storyboard: Optional[str] = None
    assets_data: Optional[str] = None
    voice_data: Optional[str] = None
    qa_score: Optional[float] = None
    published_url: Optional[HttpUrl] = None

    model_config = ConfigDict(from_attributes=True)