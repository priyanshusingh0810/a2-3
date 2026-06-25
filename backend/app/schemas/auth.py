from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    llm_provider: str
    llm_model: Optional[str] = None
    llm_api_key: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LLMSettingsUpdate(BaseModel):
    llm_provider: str = Field(..., description="LLM provider name: 'default', 'gemini', 'openai', 'ollama', 'mock'")
    llm_model: Optional[str] = Field(None, description="Model name")
    llm_api_key: Optional[str] = Field(None, description="API Key (provide raw key to update, masked key to keep current, or empty to clear)")

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: str | None = None
    role: str | None = None

class TokenRefreshRequest(BaseModel):
    refresh_token: str
