from pydantic import BaseModel
from typing import Optional

class ScheduleCreate(BaseModel):
    scheduled_at: str
    timezone: Optional[str] = None

class ScheduleUpdate(BaseModel):
    scheduled_at: Optional[str] = None
    timezone: Optional[str] = None