import logging
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import AuditLog

logger = logging.getLogger("a3.security.audit")

class EnterpriseAuditLogger:
    """
    Records immutable security & operational audit logs for compliance.
    """

    @staticmethod
    def log_action(
        db: Session,
        user_id: int,
        action: str,
        target_type: str,
        target_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        try:
            entry = AuditLog(
                user_id=user_id,
                action=action,
                target_type=target_type,
                target_id=target_id,
                details=details or {},
                timestamp=datetime.datetime.utcnow()
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            logger.info(f"AUDIT LOG: User {user_id} performed '{action}' on {target_type} ({target_id})")
            return entry
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")
            db.rollback()
            return None
