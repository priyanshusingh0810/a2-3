import platform
import hashlib
import json
import base64
import datetime
from typing import Dict, Any, Optional

class EnterpriseLicensingEngine:
    """
    Offline-First License & Device Binding Engine.
    Ensures license validity, device fingerprinting, and offline activation without uploading datasets.
    """

    @staticmethod
    def generate_device_fingerprint() -> str:
        """Computes a unique hardware fingerprint bound to this local machine."""
        raw_info = f"{platform.node()}-{platform.processor()}-{platform.system()}-{platform.machine()}"
        return hashlib.sha256(raw_info.encode()).hexdigest()[:32]

    @classmethod
    def create_mock_signed_license(
        cls,
        customer_email: str,
        plan_type: str = "Enterprise",
        days_valid: int = 365,
        bound_device: Optional[str] = None
    ) -> str:
        payload = {
            "iss": "A3 Cloud License Authority",
            "sub": customer_email,
            "plan": plan_type,
            "device_id": bound_device or cls.generate_device_fingerprint(),
            "iat": datetime.datetime.utcnow().isoformat(),
            "exp": (datetime.datetime.utcnow() + datetime.timedelta(days=days_valid)).isoformat(),
            "features": ["all_13_agents", "local_rag", "notebooks", "sandboxes", "workflows", "unlimited_local_data"]
        }
        encoded = base64.b64encode(json.dumps(payload).encode()).decode()
        signature = hashlib.sha256(f"{encoded}.a3_master_license_secret".encode()).hexdigest()[:16]
        return f"A3LIC-{encoded}.{signature}"

    @classmethod
    def validate_license_key(cls, license_key: str) -> Dict[str, Any]:
        if not license_key or not license_key.startswith("A3LIC-"):
            return {"valid": False, "reason": "Invalid license key format"}

        try:
            parts = license_key[6:].split(".")
            if len(parts) != 2:
                return {"valid": False, "reason": "Malformed license signature"}

            encoded_payload, signature = parts[0], parts[1]
            expected_sig = hashlib.sha256(f"{encoded_payload}.a3_master_license_secret".encode()).hexdigest()[:16]
            if signature != expected_sig:
                return {"valid": False, "reason": "License signature verification failed"}

            payload = json.loads(base64.b64decode(encoded_payload.encode()).decode())
            
            # Check expiration
            exp_date = datetime.datetime.fromisoformat(payload["exp"])
            if datetime.datetime.utcnow() > exp_date:
                return {"valid": False, "reason": f"License expired on {payload['exp']}"}

            # Check device binding
            current_device = cls.generate_device_fingerprint()
            if payload.get("device_id") and payload.get("device_id") != current_device:
                return {
                    "valid": True,  # Soft warning for multi-device seat licenses
                    "device_matched": False,
                    "plan": payload["plan"],
                    "customer": payload["sub"],
                    "expires": payload["exp"]
                }

            return {
                "valid": True,
                "device_matched": True,
                "plan": payload["plan"],
                "customer": payload["sub"],
                "expires": payload["exp"],
                "features": payload.get("features", [])
            }
        except Exception as e:
            return {"valid": False, "reason": f"License parsing error: {str(e)}"}
