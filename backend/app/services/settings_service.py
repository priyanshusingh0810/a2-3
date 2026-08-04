import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.db import models

class SettingsManagerService:
    """
    Manages local workspace preferences, hardware limits, theme, and AI model selection.
    """

    @classmethod
    def get_settings(cls, db: Session) -> models.LocalSettingsRecord:
        rec = db.query(models.LocalSettingsRecord).first()
        if not rec:
            rec = models.LocalSettingsRecord(
                workspace_name="My Company Analytics",
                user_name="John",
                theme="dark",
                storage_location="./data",
                selected_model="llama3:latest",
                password_enabled=False,
                setup_completed=False,
                updated_at=datetime.datetime.utcnow()
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
        return rec

    @classmethod
    def update_settings(cls, db: Session, updates: Dict[str, Any]) -> models.LocalSettingsRecord:
        rec = cls.get_settings(db)
        for k, v in updates.items():
            if hasattr(rec, k) and v is not None:
                setattr(rec, k, v)
        rec.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(rec)
        return rec
