import pytest
from app.security.rbac import RoleBasedAccessControl
from app.security.session_manager import EnterpriseSessionManager
from app.security.file_validator import FileValidationGuard

def test_rbac_hierarchy():
    class DummyUser:
        def __init__(self, role):
            self.role = role

    admin_user = DummyUser("admin")
    editor_user = DummyUser("editor")
    viewer_user = DummyUser("viewer")

    # Admin check
    check_admin = RoleBasedAccessControl.require_role("admin")
    assert check_admin(admin_user) == admin_user

    with pytest.raises(Exception):
        check_admin(editor_user)

    # Viewer check
    check_viewer = RoleBasedAccessControl.require_role("viewer")
    assert check_viewer(admin_user) == admin_user
    assert check_viewer(editor_user) == editor_user
    assert check_viewer(viewer_user) == viewer_user

def test_session_manager():
    sm = EnterpriseSessionManager()
    session_id = sm.create_session(user_id=42, device_info="Test Client")
    assert session_id is not None
    sess = sm.validate_session(session_id)
    assert sess["user_id"] == 42

    api_key = sm.generate_api_key(user_id=42, key_name="Test Key")
    assert api_key.startswith("a3_live_")
    assert sm.validate_api_key(api_key) == 42

def test_file_validator():
    ok, msg = FileValidationGuard.validate_file("sales_data.csv", 1024 * 1024)
    assert ok is True

    ok, msg = FileValidationGuard.validate_file("malicious.exe", 1024)
    assert ok is False
