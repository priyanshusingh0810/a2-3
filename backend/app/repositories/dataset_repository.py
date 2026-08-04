from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import Dataset
from app.repositories.base import BaseRepository

class DatasetRepository(BaseRepository[Dataset]):
    """Dataset data access repository."""

    def __init__(self, db: Session):
        super().__init__(Dataset, db)

    def get_by_owner(self, owner_id: int, limit: int = 100) -> List[Dataset]:
        return self.db.query(Dataset).filter(Dataset.owner_id == owner_id).order_by(Dataset.created_at.desc()).limit(limit).all()

    def get_by_workspace(self, workspace_id: str) -> List[Dataset]:
        return self.db.query(Dataset).filter(Dataset.workspace_id == workspace_id).order_by(Dataset.created_at.desc()).all()
