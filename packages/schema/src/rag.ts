/**
 * RAG + embeddings types — TrustLayer convention is no `I` prefix on interfaces.
 *
 * Mirrors `IRAGService` / `IEmbeddingService` / `RAGResult` from NapulETH's
 * `packages/schema/src/services.ts` but drops the `I` to match the rest of
 * this repo (`SlitherRunner`, `DedaubClient`, …). The implementations live in
 * `src/lib/core/embeddings.ts` and `src/lib/core/rag.ts`.
 */

export interface RAGResult {
  content: string;
  score: number;
  source: string;
  swcId?: number;
}

export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface RAGService {
  initialize(): Promise<void>;
  semanticSearch(query: string, topK?: number): Promise<RAGResult[]>;
  hybridSearch(
    query: string,
    checkName?: string,
    topK?: number,
  ): Promise<RAGResult[]>;
  buildSemanticContext(
    findings: Array<{ check: string; severity: string; description: string }>,
    sourceCode?: string,
  ): Promise<string>;
}

export interface EmbeddedChunk {
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    swcId?: number;
    chunkIndex: number;
  };
}
