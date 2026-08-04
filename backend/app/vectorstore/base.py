from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    metadata: Dict[str, Any] = {}
    score: Optional[float] = None

class BaseVectorStore(ABC):
    """Abstract interface for local vector store and RAG retrieval."""

    @abstractmethod
    def add_chunks(self, chunks: List[DocumentChunk]) -> bool:
        """Stores document embeddings locally."""
        pass

    @abstractmethod
    def search(self, query: str, top_k: int = 5, filters: Optional[Dict[str, Any]] = None) -> List[DocumentChunk]:
        """Performs local vector semantic search."""
        pass

    @abstractmethod
    def delete_document(self, document_id: str) -> bool:
        """Deletes all vector chunks associated with a document."""
        pass
