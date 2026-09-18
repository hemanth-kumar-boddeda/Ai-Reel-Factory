from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.reel import ReelItem, ReelStatus
from app.schemas.reel import ReelItemCreate, ReelItemUpdate

class ReelRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, id: int) -> Optional[ReelItem]:
        return self.db.query(ReelItem).filter(ReelItem.id == id).first()

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[ReelItem]:
        return self.db.query(ReelItem).offset(skip).limit(limit).all()

    def get_by_status(self, status: ReelStatus) -> List[ReelItem]:
        return self.db.query(ReelItem).filter(ReelItem.status == status.value).all()

    def get_by_url(self, url: str) -> Optional[ReelItem]:
        return self.db.query(ReelItem).filter(ReelItem.url == url).first()

    def create(self, obj_in: ReelItemCreate) -> ReelItem:
        db_obj = ReelItem(
            source=obj_in.source,
            title=obj_in.title,
            url=str(obj_in.url),
            summary=obj_in.summary,
            score=obj_in.score,
            status=ReelStatus.DISCOVERED.value
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: ReelItem, obj_in: ReelItemUpdate) -> ReelItem:
        update_data = obj_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: int) -> Optional[ReelItem]:
        obj = self.db.query(ReelItem).filter(ReelItem.id == id).first()
        if obj:
            self.db.delete(obj)
            self.db.commit()
        return obj

    def get_count_by_status(self) -> dict:
        from sqlalchemy import func
        result = self.db.query(
            ReelItem.status,
            func.count(ReelItem.id)
        ).group_by(ReelItem.status).all()

        counts = {status: 0 for status in ReelStatus}
        for status, count in result:
            counts[status] = count
        return counts