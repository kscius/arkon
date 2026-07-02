-- Lexical document search: pg_trgm + full-text indexes (vector extension optional for future embeddings)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "document_chunks_chunk_text_trgm_idx"
  ON "document_chunks" USING gin ("chunk_text" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "document_chunks_chunk_text_fts_idx"
  ON "document_chunks" USING gin (to_tsvector('spanish', "chunk_text"));
