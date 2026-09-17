# RAG (Retrieval-Augmented Generation) Architecture

## 1. Pipeline Overview
1. **Upload**: Faculty uploads course syllabus, reference textbooks, or previous examination papers (PDF, DOCX, TXT).
2. **Text Extraction**: Text is extracted, cleaned, and partitioned into discrete semantic chunks (300–500 words with 40-word overlap).
3. **Indexing**: Chunks are stored in the `document_chunks` table with metadata (unit number, topic, document type).
4. **Retrieval**: When a topic query is submitted, the RAG engine performs keyword overlap, Jaccard matching, and semantic vector similarity search to find the top $k$ relevant context chunks.
5. **Context Injection**: Relevant chunks are injected into the agent prompt so that content generation is strictly grounded in the approved course material.
