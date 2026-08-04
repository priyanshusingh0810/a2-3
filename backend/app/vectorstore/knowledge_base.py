import logging
from typing import List, Dict, Any
from app.vectorstore.store import LocalVectorStore
from app.vectorstore.chunker import DocumentChunker
from app.vectorstore.parsers import LocalDocumentParser
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.vectorstore.rag")

class RAGKnowledgeBase:
    """
    High-level local RAG Knowledge Base.
    Parses, chunks, indexes documents, and answers natural language questions using semantic context.
    """

    def __init__(self):
        self.vector_store = LocalVectorStore()

    def ingest_document(self, file_path: str, document_id: str, metadata: Dict[str, Any] = {}) -> int:
        raw_text = LocalDocumentParser.parse_file(file_path)
        chunks = DocumentChunker.chunk_text(
            text=raw_text,
            document_id=document_id,
            chunk_size=500,
            chunk_overlap=50,
            metadata=metadata
        )
        self.vector_store.add_chunks(chunks)
        return len(chunks)

    async def answer_question(self, question: str, top_k: int = 4) -> Dict[str, Any]:
        relevant_chunks = self.vector_store.search(question, top_k=top_k)
        context_str = "\n\n".join([f"Source Chunk {idx+1}:\n{c.content}" for idx, c in enumerate(relevant_chunks)])

        prompt = f"""
        You are an Enterprise AI RAG Assistant.
        Answer the user's question using strictly the retrieved context below.

        RETRIEVED CONTEXT:
        {context_str or "No relevant document chunks found."}

        USER QUESTION:
        {question}

        Provide a concise, factual answer with source citations where applicable.
        """
        try:
            answer = await LLMService.query(prompt=prompt, system_prompt="You answer user queries strictly using retrieved local document context.")
            return {
                "question": question,
                "answer": answer,
                "retrieved_chunks_count": len(relevant_chunks),
                "sources": [c.metadata for c in relevant_chunks]
            }
        except Exception as e:
            logger.error(f"RAG query error: {e}")
            return {
                "question": question,
                "answer": f"Based on retrieved context: {context_str[:200]}...",
                "retrieved_chunks_count": len(relevant_chunks),
                "sources": [c.metadata for c in relevant_chunks]
            }
