import logging
from typing import List, Dict, Any, Optional
import numpy as np
from app.vectorstore.base import BaseVectorStore, DocumentChunk
from app.vectorstore.embeddings import LocalEmbeddingService

logger = logging.getLogger("a3.vectorstore.store")

class LocalVectorStore(BaseVectorStore):
    """
    In-memory / persistent local vector database implementing cosine similarity search.
    """

    def __init__(self):
        self.chunks: List[DocumentChunk] = []
        self.embedding_service = LocalEmbeddingService()
        self.vectors: Optional[np.ndarray] = None

    def add_chunks(self, chunks: List[DocumentChunk]) -> bool:
        if not chunks:
            return True

        self.chunks.extend(chunks)
        texts = [c.content for c in self.chunks]
        self.vectors = self.embedding_service.fit_transform(texts)
        logger.info(f"LocalVectorStore: Indexed {len(chunks)} chunks. Total corpus: {len(self.chunks)}.")
        return True

    def search(self, query: str, top_k: int = 5, filters: Optional[Dict[str, Any]] = None) -> List[DocumentChunk]:
        if not self.chunks or self.vectors is None or len(self.vectors) == 0:
            return []

        query_vec = self.embedding_service.embed_query(query)
        if np.linalg.norm(query_vec) == 0:
            # Fallback to keyword match if query terms not in vocabulary
            matched = [c for c in self.chunks if any(w.lower() in c.content.lower() for w in query.split())]
            return matched[:top_k]

        # Calculate cosine similarity dot product
        similarities = np.dot(self.vectors, query_vec)
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            chunk = self.chunks[idx].model_copy()
            chunk.score = round(score, 4)
            results.append(chunk)

        return results

    def delete_document(self, document_id: str) -> bool:
        self.chunks = [c for c in self.chunks if c.document_id != document_id]
        if self.chunks:
            texts = [c.content for c in self.chunks]
            self.vectors = self.embedding_service.fit_transform(texts)
        else:
            self.vectors = None
        return True
