from typing import List, Dict, Any
import uuid
from app.vectorstore.base import DocumentChunk

class DocumentChunker:
    """
    Recursively breaks raw text into overlapping windows for semantic indexing.
    """

    @staticmethod
    def chunk_text(
        text: str,
        document_id: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        metadata: Dict[str, Any] = {}
    ) -> List[DocumentChunk]:
        if not text:
            return []

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk_content = text[start:end].strip()

            if chunk_content:
                chunk_obj = DocumentChunk(
                    chunk_id=str(uuid.uuid4()),
                    document_id=document_id,
                    content=chunk_content,
                    metadata=dict(metadata)
                )
                chunks.append(chunk_obj)

            if end == text_len:
                break
            start += (chunk_size - chunk_overlap)

        return chunks
