import secrets
import datetime
from typing import Dict, Any, Optional

class EnterpriseSessionManager:
    """
    Manages active desktop/browser user sessions and local API keys securely.
    """

    def __init__(self):
        self._active_sessions: Dict[str, Dict[str, Any]] = {}
        self._api_keys: Dict[str, Dict[str, Any]] = {}

    def create_session(self, user_id: int, device_info: str = "Local Desktop Client") -> str:
        session_id = secrets.token_hex(32)
        self._active_sessions[session_id] = {
            "user_id": user_id,
            "device_info": device_info,
            "created_at": datetime.datetime.utcnow().isoformat(),
            "last_active": datetime.datetime.utcnow().isoformat()
        }
        return session_id

    def validate_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        sess = self._active_sessions.get(session_id)
        if sess:
            sess["last_active"] = datetime.datetime.utcnow().isoformat()
        return sess

    def revoke_session(self, session_id: str) -> bool:
        if session_id in self._active_sessions:
            del self._active_sessions[session_id]
            return True
        return False

    def generate_api_key(self, user_id: int, key_name: str) -> str:
        api_key = f"a3_live_{secrets.token_urlsafe(32)}"
        self._api_keys[api_key] = {
            "user_id": user_id,
            "name": key_name,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        return api_key

    def validate_api_key(self, api_key: str) -> Optional[int]:
        entry = self._api_keys.get(api_key)
        if entry:
            return entry["user_id"]
        return None
