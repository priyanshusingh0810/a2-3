from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session
from app.db.session import Base

T = TypeVar("T", bound=Base)

class BaseRepository(Generic[T]):
    """Generic repository providing clean CRUD data access."""

    def __init__(self, model_cls: Type[T], db: Session):
        self.model_cls = model_cls
        self.db = db

    def get_by_id(self, id_val: Any) -> Optional[T]:
        return self.db.query(self.model_cls).filter(self.model_cls.id == id_val).first()

    def get_all(self, limit: int = 100, skip: int = 0) -> List[T]:
        return self.db.query(self.model_cls).offset(skip).limit(limit).all()

    def add(self, entity: T) -> T:
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def update(self, entity: T) -> T:
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, entity: T) -> None:
        self.db.delete(entity)
        self.db.commit()
