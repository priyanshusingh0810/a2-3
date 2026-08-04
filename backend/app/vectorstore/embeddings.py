import math
import re
from typing import List, Dict
import numpy as np

class LocalEmbeddingService:
    """
    Local Vector Embedding Service.
    Computes TF-IDF vector space embeddings on local hardware with zero external dependencies.
    """

    def __init__(self):
        self.vocabulary: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"\b\w+\b", text.lower())

    def fit_transform(self, docs: List[str]) -> np.ndarray:
        tokenized_docs = [self._tokenize(doc) for doc in docs]
        vocab_set = set(token for doc in tokenized_docs for token in doc)
        self.vocabulary = {term: idx for idx, term in enumerate(sorted(vocab_set))}

        num_docs = len(docs)
        if num_docs == 0:
            return np.zeros((0, 1))

        # Calculate IDF
        doc_freq = {}
        for doc in tokenized_docs:
            unique_terms = set(doc)
            for term in unique_terms:
                doc_freq[term] = doc_freq.get(term, 0) + 1

        self.idf = {
            term: math.log((num_docs + 1) / (freq + 1)) + 1
            for term, freq in doc_freq.items()
        }

        # Build TF-IDF vectors
        vectors = np.zeros((num_docs, max(1, len(self.vocabulary))))
        for doc_idx, doc in enumerate(tokenized_docs):
            term_counts = {}
            for term in doc:
                term_counts[term] = term_counts.get(term, 0) + 1
            
            for term, count in term_counts.items():
                if term in self.vocabulary:
                    term_idx = self.vocabulary[term]
                    tf = count / len(doc) if len(doc) > 0 else 0
                    vectors[doc_idx, term_idx] = tf * self.idf.get(term, 1.0)

            # L2 normalize
            norm = np.linalg.norm(vectors[doc_idx])
            if norm > 0:
                vectors[doc_idx] /= norm

        return vectors

    def embed_query(self, query: str) -> np.ndarray:
        tokens = self._tokenize(query)
        vec = np.zeros(max(1, len(self.vocabulary)))
        if not self.vocabulary:
            return vec

        term_counts = {}
        for t in tokens:
            term_counts[t] = term_counts.get(t, 0) + 1

        for term, count in term_counts.items():
            if term in self.vocabulary:
                idx = self.vocabulary[term]
                tf = count / len(tokens) if len(tokens) > 0 else 0
                vec[idx] = tf * self.idf.get(term, 1.0)

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec
