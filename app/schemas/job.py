from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.models.job import JobStatus, JobType
from datetime import datetime

class JobBase(BaseModel):
    reel_id: Optional[int] = None
    type: JobType
    status: JobStatus
    progress: int = 0
    result: Optional[str] = None
    error: Optional[str] = None
    user_id: int

    model_config = ConfigDict(from_attributes=True)

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    type: Optional[JobType] = None
    status: Optional[JobStatus] = None
    progress: Optional[int] = None
    result: Optional[str] = None
    error: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class JobInDBBase(JobBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class JobInDB(JobInDBBase):
    pass

class Job(JobInDBBase):
    pass