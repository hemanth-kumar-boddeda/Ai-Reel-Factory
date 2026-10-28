from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.review import ReviewItem
from app.schemas.review import ReviewItemCreate, ReviewItemUpdate

class ReviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, id: int) -> Optional[ReviewItem]:
        return self.db.query(ReviewItem).filter(ReviewItem.id == id).first()

    def get_by_reel_id(self, reel_id: int) -> List[ReviewItem]:
        return self.db.query(ReviewItem).filter(ReviewItem.reel_id == reel_id).order_by(ReviewItem.timestamp_seconds).all()

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[ReviewItem]:
        return self.db.query(ReviewItem).offset(skip).limit(limit).all()

    def create(self, obj_in: ReviewItemCreate, user_id: int) -> ReviewItem:
        db_obj = ReviewItem(
            reel_id=obj_in.reel_id,
            user_id=user_id,
            timestamp_seconds=obj_in.timestamp_seconds,
            comment_text=obj_in.comment_text,
            resolved=obj_in.resolved,
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: ReviewItem, obj_in: ReviewItemUpdate) -> ReviewItem:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: int) -> Optional[ReviewItem]:
        obj = self.db.query(ReviewItem).filter(ReviewItem.id == id).first()
        if obj:
            self.db.delete(obj)
            self.db.commit()
        return obj