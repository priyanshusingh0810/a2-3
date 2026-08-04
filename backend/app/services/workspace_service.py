import os
import datetime
import uuid
from sqlalchemy.orm import Session
from app.db import models

class WorkspaceManagerService:
    """
    Manages local-first workspace directory structures, local SQLite projects, and storage paths.
    """

    @staticmethod
    def get_or_create_default_workspace(db: Session, workspace_name: str = "My Company Analytics", user_id: int = 1) -> models.Workspace:
        ws = db.query(models.Workspace).first()
        if not ws:
            ws = models.Workspace(
                id=str(uuid.uuid4()),
                name=workspace_name,
                owner_id=user_id,
                created_at=datetime.datetime.utcnow()
            )
            db.add(ws)
            db.commit()
            db.refresh(ws)
        return ws

    @staticmethod
    def initialize_local_storage_dirs(base_path: str = "./data"):
        os.makedirs(os.path.join(base_path, "datasets"), exist_ok=True)
        os.makedirs(os.path.join(base_path, "reports"), exist_ok=True)
        os.makedirs(os.path.join(base_path, "vector_db"), exist_ok=True)
        os.makedirs(os.path.join(base_path, "workflows"), exist_ok=True)
