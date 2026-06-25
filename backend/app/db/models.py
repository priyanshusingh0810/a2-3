import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON, Text, LargeBinary
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user") # 'user' or 'admin'
    is_active = Column(Boolean, default=True)
    llm_provider = Column(String, default="default")
    llm_model = Column(String, nullable=True)
    llm_api_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    chats = relationship("ChatConversation", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, index=True) # UUID string
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # 'csv', 'xlsx', 'json'
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    file_size = Column(Integer, default=0)
    business_domain = Column(String, nullable=True) # e.g. "e-commerce", "finance"
    summary = Column(Text, nullable=True)
    columns_metadata = Column(JSON, nullable=True) # dict of column_name -> properties
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_content = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="datasets")
    analysis_jobs = relationship("AnalysisJob", back_populates="dataset", cascade="all, delete-orphan")
    chats = relationship("ChatConversation", back_populates="dataset", cascade="all, delete-orphan")
    dashboards = relationship("Dashboard", back_populates="dataset", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="dataset", cascade="all, delete-orphan")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    status = Column(String, default="pending") # 'pending', 'running', 'completed', 'failed'
    quality_score = Column(Float, nullable=True)
    quality_report = Column(JSON, nullable=True) # quality, duplicates, issues
    insights = Column(JSON, nullable=True) # structured insights
    anomalies = Column(JSON, nullable=True) # detected anomalies
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    dataset = relationship("Dataset", back_populates="analysis_jobs")


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(String, primary_key=True, index=True) # UUID
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="New Conversation")
    messages = Column(JSON, default=list) # List of chat messages (user prompt, ai reply, plotly chart config)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="chats")
    user = relationship("User", back_populates="chats")


class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(String, primary_key=True, index=True) # UUID
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    title = Column(String, default="Analytics Dashboard")
    layout = Column(JSON, nullable=True) # dashboard widgets layout (metrics, charts configuration)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="dashboards")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    format = Column(String, nullable=False) # 'pdf', 'pptx'
    file_content = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="reports")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False) # e.g., "UPLOAD_DATASET", "RUN_QUERY", "CLEAN_DATASET"
    target_type = Column(String, nullable=False) # e.g., "dataset", "query"
    target_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True) # detailed logs like query asked, or options used
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


class TokenBlocklist(Base):
    """Stores revoked JWT token identifiers (jti) to enforce server-side logout."""
    __tablename__ = "token_blocklist"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String, unique=True, index=True, nullable=False)  # JWT ID claim
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    revoked_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)  # for periodic cleanup
