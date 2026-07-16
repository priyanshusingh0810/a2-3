import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import models
from app.db.session import get_db
from app.api import deps

router = APIRouter()
logger = logging.getLogger("a3.api.collaboration")

# --- SCHEMAS ---
class WorkspaceCreate(BaseModel):
    name: str

class InviteMember(BaseModel):
    email: str
    role: str = "viewer" # 'admin', 'editor', 'viewer'

class CommentCreate(BaseModel):
    dataset_id: str
    text: str

# --- ENDPOINTS ---

@router.post("/workspaces", status_code=status.HTTP_201_CREATED)
def create_workspace(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Creates a new workspace and sets the creator as owner."""
    workspace_id = str(uuid.uuid4())
    workspace = models.Workspace(
        id=workspace_id,
        name=workspace_in.name,
        owner_id=current_user.id
    )
    db.add(workspace)
    db.commit()
    
    # Auto-add creator as owner member
    member = models.WorkspaceMember(
        workspace_id=workspace_id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(member)
    db.commit()
    
    db.refresh(workspace)
    return {
        "id": workspace.id,
        "name": workspace.name,
        "owner_id": workspace.owner_id,
        "created_at": workspace.created_at
    }

@router.get("/workspaces", response_model=List[dict])
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Lists workspaces the user owns or is a member of."""
    memberships = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.user_id == current_user.id).all()
    workspace_ids = [m.workspace_id for m in memberships]
    
    workspaces = db.query(models.Workspace).filter(models.Workspace.id.in_(workspace_ids)).all()
    
    res = []
    for w in workspaces:
        # Find user role
        role = next((m.role for m in memberships if m.workspace_id == w.id), "viewer")
        res.append({
            "id": w.id,
            "name": w.name,
            "owner_id": w.owner_id,
            "user_role": role,
            "created_at": w.created_at
        })
    return res

@router.post("/workspaces/{id}/invite", status_code=status.HTTP_201_CREATED)
def invite_user_to_workspace(
    id: str,
    invite: InviteMember,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Invites a user by email to join a workspace."""
    # Check permissions (must be owner or admin)
    member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    
    if not member or member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners or admins can invite new members."
        )
        
    # Find invited user
    target_user = db.query(models.User).filter(models.User.email == invite.email).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email {invite.email} is not registered on A3."
        )
        
    # Check duplicate membership
    dup = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == id,
        models.WorkspaceMember.user_id == target_user.id
    ).first()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this workspace."
        )
        
    new_member = models.WorkspaceMember(
        workspace_id=id,
        user_id=target_user.id,
        role=invite.role
    )
    db.add(new_member)
    db.commit()
    return {"detail": f"User {invite.email} added successfully to workspace."}

@router.get("/workspaces/{id}/members", response_model=List[dict])
def list_workspace_members(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Lists all members of a workspace."""
    # Verify current user membership
    membership = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Access denied")
        
    members = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == id).all()
    res = []
    for m in members:
        user = db.query(models.User).filter(models.User.id == m.user_id).first()
        res.append({
            "user_id": m.user_id,
            "email": user.email if user else "Unknown",
            "role": m.role,
            "joined_at": m.created_at
        })
    return res

@router.post("/comments", status_code=status.HTTP_201_CREATED)
def post_comment(
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Posts a discussion comment on a dataset."""
    # Verify dataset access
    dataset = db.query(models.Dataset).filter(models.Dataset.id == comment_in.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # If dataset belongs to a workspace, verify user membership
    if dataset.workspace_id:
        member = db.query(models.WorkspaceMember).filter(
            models.WorkspaceMember.workspace_id == dataset.workspace_id,
            models.WorkspaceMember.user_id == current_user.id
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Access denied to shared workspace dataset")
    else:
        # Personal dataset
        if dataset.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    comment = models.Comment(
        id=str(uuid.uuid4()),
        dataset_id=comment_in.dataset_id,
        user_id=current_user.id,
        text=comment_in.text
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "text": comment.text,
        "user_email": current_user.email,
        "created_at": comment.created_at
    }

@router.get("/comments/{dataset_id}", response_model=List[dict])
def list_comments(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Lists discussion comments posted on a dataset."""
    # Verify access
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.workspace_id:
        member = db.query(models.WorkspaceMember).filter(
            models.WorkspaceMember.workspace_id == dataset.workspace_id,
            models.WorkspaceMember.user_id == current_user.id
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        if dataset.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    comments = db.query(models.Comment).filter(models.Comment.dataset_id == dataset_id).order_by(models.Comment.created_at.asc()).all()
    res = []
    for c in comments:
        user = db.query(models.User).filter(models.User.id == c.user_id).first()
        res.append({
            "id": c.id,
            "text": c.text,
            "user_email": user.email if user else "Unknown",
            "created_at": c.created_at
        })
    return res
