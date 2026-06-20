from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str # 'user' or 'assistant'
    content: str
    chart: Optional[Dict[str, Any]] = None # Plotly JSON schema
    timestamp: Optional[datetime] = None

class ChatQueryRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None # If null, create a new conversation

class ChatResponse(BaseModel):
    answer: str
    chart: Optional[Dict[str, Any]] = None
    conversation_id: str
    messages: List[ChatMessage]

class ConversationResponse(BaseModel):
    id: str
    dataset_id: str
    title: str
    messages: List[ChatMessage]
    created_at: datetime

    class Config:
        from_attributes = True
