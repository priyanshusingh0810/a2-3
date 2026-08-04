import pytest
import os
import tempfile
from app.vectorstore.chunker import DocumentChunker
from app.vectorstore.embeddings import LocalEmbeddingService
from app.vectorstore.store import LocalVectorStore
from app.vectorstore.knowledge_base import RAGKnowledgeBase

def test_document_chunker():
    text = "Line 1 sentence. " * 50
    chunks = DocumentChunker.chunk_text(text, document_id="doc_1", chunk_size=200, chunk_overlap=20)
    assert len(chunks) > 1
    assert chunks[0].document_id == "doc_1"

def test_local_embedding_service_and_vector_store():
    store = LocalVectorStore()
    chunks = DocumentChunker.chunk_text(
        "Quarterly revenue grew by 15 percent due to enterprise software adoption. Cost of goods remained low.",
        document_id="fin_report_2025"
    )
    store.add_chunks(chunks)

    results = store.search("software adoption revenue", top_k=2)
    assert len(results) > 0
    assert results[0].document_id == "fin_report_2025"

@pytest.mark.anyio
async def test_rag_knowledge_base():
    with tempfile.NamedTemporaryFile("w+", suffix=".txt", delete=False) as f:
        f.write("A3 Analytics Enterprise features local privacy and vector RAG search.")
        tmp_path = f.name

    try:
        rag = RAGKnowledgeBase()
        count = rag.ingest_document(tmp_path, document_id="test_doc_101")
        assert count > 0

        ans = await rag.answer_question("What features does A3 Analytics Enterprise have?")
        assert "answer" in ans
        assert ans["retrieved_chunks_count"] > 0
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
