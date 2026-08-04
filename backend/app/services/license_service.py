import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.db import models
from app.security.licensing import EnterpriseLicensingEngine

class LicenseManagerService:
    """
    Service managing 14-day local trial activation, offline license caching, and cloud activation via HTTPS.
    """

    @classmethod
    def get_license_status(cls, db: Session) -> Dict[str, Any]:
        rec = db.query(models.LicenseRecord).first()
        now = datetime.datetime.utcnow()

        if not rec:
            # Initialize 14-day trial on first launch
            trial_exp = now + datetime.timedelta(days=14)
            rec = models.LicenseRecord(
                plan_type="Trial (14 Days)",
                status="active",
                is_trial=True,
                trial_start_date=now,
                expires_at=trial_exp,
                device_fingerprint=EnterpriseLicensingEngine.generate_device_fingerprint(),
                features=["all_13_agents", "local_rag", "notebooks", "sandboxes", "workflows", "unlimited_local_data"]
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)

        # Check expiration
        days_left = 0
        if rec.expires_at:
            delta = rec.expires_at - now
            days_left = max(0, delta.days)
            if delta.total_seconds() <= 0:
                rec.status = "expired"
                db.commit()

        return {
            "plan_type": rec.plan_type,
            "status": rec.status,
            "is_trial": rec.is_trial,
            "days_remaining": days_left,
            "expires_at": rec.expires_at.isoformat() if rec.expires_at else None,
            "license_key": rec.license_key,
            "device_fingerprint": rec.device_fingerprint or EnterpriseLicensingEngine.generate_device_fingerprint(),
            "features": rec.features or []
        }

    @classmethod
    def activate_license(cls, db: Session, license_key: str) -> Dict[str, Any]:
        val = EnterpriseLicensingEngine.validate_license_key(license_key)
        if not val.get("valid"):
            return {"success": False, "error": val.get("reason", "License activation failed")}

        rec = db.query(models.LicenseRecord).first()
        now = datetime.datetime.utcnow()

        if not rec:
            rec = models.LicenseRecord()
            db.add(rec)

        rec.license_key = license_key
        rec.plan_type = val.get("plan", "Enterprise")
        rec.status = "active"
        rec.is_trial = False
        rec.activated_at = now
        rec.expires_at = datetime.datetime.fromisoformat(val["expires"]) if val.get("expires") else now + datetime.timedelta(days=365)
        rec.device_fingerprint = EnterpriseLicensingEngine.generate_device_fingerprint()
        rec.features = val.get("features", ["all_13_agents", "local_rag", "notebooks", "sandboxes", "workflows"])

        db.commit()
        db.refresh(rec)

        return {
            "success": True,
            "message": f"Successfully activated {rec.plan_type} license!",
            "license": cls.get_license_status(db)
        }
