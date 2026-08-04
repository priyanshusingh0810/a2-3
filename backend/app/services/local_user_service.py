import datetime
from sqlalchemy.orm import Session
from app.db import models
from app.services import security

class LocalUserService:
    """
    Manages local user credentials, bcrypt password hashing, and optional password protection.
    """

    @classmethod
    def get_or_create_local_user(cls, db: Session, email: str = "local@a3-enterprise.internal", password: str = "localpass123") -> models.User:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            hashed_pwd = security.get_password_hash(password)
            user = models.User(
                email=email,
                hashed_password=hashed_pwd,
                role="admin",
                is_active=True,
                created_at=datetime.datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
