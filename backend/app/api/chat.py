import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import models
from app.db.session import get_db
from app.schemas import chat as schemas
from app.api import deps
from app.services.data_service import DataService
from app.agents.query import QueryAgent

router = APIRouter()
logger = logging.getLogger("a3.api.chat")

@router.post("/query", response_model=schemas.ChatResponse)
async def query_dataset(
    req: schemas.ChatQueryRequest,
    dataset_id: str, # passed as query param or header
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Answers a user natural language query about a dataset using sandboxed execution."""
    # 1. Fetch and validate dataset
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id, models.Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # 2. Get or create conversation
    conversation_id = req.conversation_id
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        conversation = models.ChatConversation(
            id=conversation_id,
            dataset_id=dataset_id,
            user_id=current_user.id,
            title=f"Chat - {req.question[:25]}..."
        )
        db.add(conversation)
        db.commit()
    else:
        conversation = db.query(models.ChatConversation).filter(
            models.ChatConversation.id == conversation_id,
            models.ChatConversation.user_id == current_user.id
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation session not found")

    # 3. Load dataset into memory
    try:
        df = DataService.load_df(dataset.file_path, dataset.file_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")

    # 4. Trigger Query Agent
    logger.info(f"Running query: '{req.question}' on dataset {dataset_id}")
    answer, chart = await QueryAgent.run_query(df, dataset.columns_metadata or {}, req.question)

    # 5. Append messages to history
    user_msg = {
        "role": "user",
        "content": req.question,
        "timestamp": str(uuid.uuid4()) # simple ID placeholder for rendering keys
    }
    ai_msg = {
        "role": "assistant",
        "content": answer,
        "chart": chart,
        "timestamp": str(uuid.uuid4())
    }
    
    # SQLite lists/JSON column appends
    messages = list(conversation.messages or [])
    messages.append(user_msg)
    messages.append(ai_msg)
    conversation.messages = messages
    
    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        action="RUN_QUERY",
        target_type="query",
        target_id=conversation_id,
        details={"question": req.question, "has_chart": chart is not None}
    )
    db.add(audit)
    db.commit()
    db.refresh(conversation)

    # Map message list to schemas
    mapped_msgs = []
    for msg in conversation.messages:
        mapped_msgs.append(schemas.ChatMessage(
            role=msg["role"],
            content=msg["content"],
            chart=msg.get("chart")
        ))

    return {
        "answer": answer,
        "chart": chart,
        "conversation_id": conversation_id,
        "messages": mapped_msgs
    }

@router.get("/conversations", response_model=List[schemas.ConversationResponse])
def list_conversations(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Lists past conversation threads for a given dataset."""
    return db.query(models.ChatConversation).filter(
        models.ChatConversation.dataset_id == dataset_id,
        models.ChatConversation.user_id == current_user.id
    ).order_by(models.ChatConversation.created_at.desc()).all()

@router.get("/conversations/{id}", response_model=schemas.ConversationResponse)
def get_conversation(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Retrieves message logs for a specific conversation session."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == id,
        models.ChatConversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    return conversation
