from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import User
from app.repositories.base import BaseRepository

class UserRepository(BaseRepository[User]):
    """User data access repository."""

    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()
