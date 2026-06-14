/**
 * RAG + embeddings types — TrustLayer convention is no `I` prefix on interfaces.
 *
 * The implementations live in `packages/core/src/embeddings.ts` and
 * `packages/core/src/rag.ts`.
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
