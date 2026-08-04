from typing import List, Callable
from fastapi import HTTPException, status
from app.db.models import User

class RoleBasedAccessControl:
    """
    Enforces Role-Based Access Control (RBAC) across Enterprise endpoints.
    Roles:
    - 'admin': Full access to settings, user management, and workspace configuration.
    - 'editor': Access to upload datasets, create notebooks, edit workflows, run ML.
    - 'viewer': Read-only access to dashboards, reports, and dataset previews.
    """

    ROLE_HIERARCHY = {
        "admin": ["admin", "editor", "viewer"],
        "editor": ["editor", "viewer"],
        "viewer": ["viewer"],
    }

    @classmethod
    def require_role(cls, required_role: str) -> Callable:
        def check_role(current_user: User) -> User:
            user_role = getattr(current_user, "role", "viewer")
            allowed_roles = cls.ROLE_HIERARCHY.get(user_role, [user_role])
            if required_role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access forbidden: Required role '{required_role}', user possesses '{user_role}'."
                )
            return current_user
        return check_role
