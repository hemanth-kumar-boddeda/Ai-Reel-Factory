from typing import List, Optional
from sqlalchemy.orm import Session
from enum import Enum
from app.models.job import JobItem, JobStatus, JobType
from app.models.reel import ReelItem
from app.schemas.job import JobCreate, JobUpdate  # We'll create this schema next

class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, id: int) -> Optional[JobItem]:
        return self.db.query(JobItem).filter(JobItem.id == id).first()

    def get_by_id_and_user(self, id: int, user_id: int) -> Optional[JobItem]:
        return self.db.query(JobItem).filter(JobItem.id == id, JobItem.user_id == user_id).first()

    def get_by_reel_id(self, reel_id: int) -> List[JobItem]:
        return self.db.query(JobItem).filter(JobItem.reel_id == reel_id).all()

    def get_by_reel_id_and_user(self, reel_id: int, user_id: int) -> List[JobItem]:
        return self.db.query(JobItem).filter(JobItem.reel_id == reel_id).join(ReelItem).filter(ReelItem.user_id == user_id).all()

    def get_by_user(self, user_id: int, skip: int = 0, limit: int = 100) -> List[JobItem]:
        return self.db.query(JobItem).filter(JobItem.user_id == user_id).offset(skip).limit(limit).all()

    def create(self, obj_in: JobCreate) -> JobItem:
        db_obj = JobItem(
            reel_id=obj_in.reel_id,
            type=obj_in.type.value if hasattr(obj_in.type, 'value') else obj_in.type,
            status=obj_in.status.value if hasattr(obj_in.status, 'value') else obj_in.status,
            progress=obj_in.progress,
            result=obj_in.result,
            error=obj_in.error,
            user_id=obj_in.user_id,
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: JobItem, obj_in: JobUpdate) -> JobItem:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                # Handle enum conversion if needed
                if field in ['type', 'status'] and isinstance(value, Enum):
                    value = value.value
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: int) -> Optional[JobItem]:
        obj = self.db.query(JobItem).filter(JobItem.id == id).first()
        if obj:
            self.db.delete(obj)
            self.db.commit()
        return obj