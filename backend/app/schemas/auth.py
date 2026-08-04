from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Za-z]", v) or not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one letter and one number.")
        return v

class UserLogin(UserBase):
    password: str
    remember_me: bool = False

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    llm_provider: str
    llm_model: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_keys: Optional[dict] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LLMSettingsUpdate(BaseModel):
    llm_provider: str = Field(..., description="LLM provider name: 'default', 'gemini', 'openai', 'ollama', 'mock', 'anthropic', 'deepseek', 'mistral'")
    llm_model: Optional[str] = Field(None, description="Model name")
    llm_api_key: Optional[str] = Field(None, description="API Key")
    llm_keys: Optional[dict] = Field(None, description="Dictionary of provider keys")

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class GoogleLoginRequest(BaseModel):
    access_token: Optional[str] = None
    id_token: Optional[str] = None
    credential: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Za-z]", v) or not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one letter and one number.")
        return v


