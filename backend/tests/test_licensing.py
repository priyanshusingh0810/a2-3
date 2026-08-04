from app.security.licensing import EnterpriseLicensingEngine

def test_device_fingerprint():
    fp = EnterpriseLicensingEngine.generate_device_fingerprint()
    assert isinstance(fp, str)
    assert len(fp) == 32

def test_license_creation_and_validation():
    license_key = EnterpriseLicensingEngine.create_mock_signed_license(
        customer_email="enterprise_user@acme.com",
        plan_type="Enterprise",
        days_valid=30
    )
    assert license_key.startswith("A3LIC-")

    res = EnterpriseLicensingEngine.validate_license_key(license_key)
    assert res["valid"] is True
    assert res["customer"] == "enterprise_user@acme.com"
    assert res["plan"] == "Enterprise"

def test_license_invalid_key():
    res = EnterpriseLicensingEngine.validate_license_key("INVALID-KEY-12345")
    assert res["valid"] is False
