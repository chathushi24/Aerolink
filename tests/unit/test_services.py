import sys
import os
import pytest
from datetime import datetime, timezone

# Add service paths to scope to allow loading local modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../services/auth-service')))

from auth_utils import hash_password, verify_password, create_access_token, decode_access_token

def test_password_hashing():
    """Assert password hashing generates correct bcrypt verification matches."""
    raw_pwd = "my-secure-password"
    hashed = hash_password(raw_pwd)
    
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("wrong-password", hashed) is False

def test_jwt_generation_and_decoding():
    """Assert JWT utility creates decipherable, role-encoded signed tokens."""
    payload = {
        "sub": "user-uuid-101",
        "email": "test@aerolink.com",
        "role": "PASSENGER"
    }
    
    token = create_access_token(data=payload)
    assert isinstance(token, str)
    
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == payload["sub"]
    assert decoded["role"] == payload["role"]
    assert decoded["email"] == payload["email"]

def test_expired_jwt_handling():
    """Assert invalid JWT signatures decode to None."""
    invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature"
    decoded = decode_access_token(invalid_token)
    assert decoded is None
