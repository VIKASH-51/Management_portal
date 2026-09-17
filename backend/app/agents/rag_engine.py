import json
import re
from typing import List, Dict, Any

class RAGEngine:
    """
    Retrieval-Augmented Generation Engine.
    Handles document chunking, metadata extraction, semantic token indexing,
    and similarity retrieval for faculty syllabus and reference books.
    """
    
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
        return chunks if chunks else [text]

    @staticmethod
    def extract_keywords(text: str) -> List[str]:
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
        stopwords = {
            "the", "a", "an", "and", "or", "but", "is", "are", "in", "on", "to", "for", 
            "with", "by", "about", "as", "into", "through", "during", "before", "after",
            "above", "below", "from", "up", "down", "of", "off", "over", "under", "again",
            "further", "then", "once", "here", "there", "when", "where", "why", "how", "all",
            "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor",
            "not", "only", "own", "same", "so", "than", "too", "very", "can", "will", "just",
            "should", "now"
        }
        words = [w for w in cleaned.split() if len(w) > 2 and w not in stopwords]
        return list(set(words))

    @classmethod
    def retrieve_relevant_chunks(cls, query: str, subject_docs: List[Dict[str, Any]], top_k: int = 4) -> List[Dict[str, Any]]:
        if not subject_docs:
            return []
            
        query_keywords = set(cls.extract_keywords(query))
        scored_chunks = []

        for doc in subject_docs:
            chunks = doc.get("chunks", [])
            for chunk in chunks:
                content = chunk.get("content", "")
                chunk_keywords = set(cls.extract_keywords(content))
                
                # Jaccard / Keyword overlap score
                if not chunk_keywords:
                    continue
                overlap = len(query_keywords.intersection(chunk_keywords))
                score = overlap / (len(query_keywords.union(chunk_keywords)) + 1e-6)
                
                # Bonus for exact query phrase match
                if query.lower() in content.lower():
                    score += 0.5
                    
                scored_chunks.append({
                    "score": score,
                    "content": content,
                    "doc_name": doc.get("filename", "Reference Document"),
                    "metadata": chunk.get("metadata", {})
                })

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]
