/**
 * EmbeddingService — OpenAI-compatible embedding service.
 *
 * Works with:
 * - AssistAI (multilingual-e5-small, 384-dim)
 * - OpenAI API (text-embedding-3-small)
 * - Ollama (nomic-embed-text, mxbai-embed-large)
 * - Any OpenAI-compatible endpoint
 *
 * Embeddings are cached in memory to avoid re-computing on repeated scans.
 *
 * Note: Langfuse combined-key splitting (`pk-lf-xxx|sk-lf-yyy`) is preserved
 * and `maxRetries: 4` is bumped because the AssistAI proxy occasionally drops
 * connections during scans.
 */

import OpenAI from "openai";
import type { EmbeddingService as EmbeddingServiceInterface } from "@trustlayer/schema";

// Re-exported here so consumers can `import { EmbeddedChunk } from "@trustlayer/core"`.
export type { EmbeddedChunk } from "@trustlayer/schema";

// AssistAI proxy (Cloudflare) occasionally drops connections; bump from SDK
// default of 2 so transient blips during a scan don't fail the RAG step.
const AI_MAX_RETRIES = 4;

export class EmbeddingService implements EmbeddingServiceInterface {
  private client: OpenAI;
  private model: string;
  private cache = new Map<string, number[]>();

  constructor() {
    const baseURL =
      process.env.OPENAI_BASE_URL ||
      process.env.REDHAT_API_URL?.replace(/\/v1\/chat\/completions$/, "/v1") ||
      "http://localhost:11434/v1";

    const rawKey =
      process.env.OPENAI_API_KEY ||
      process.env.REDHAT_API_KEY ||
      "ollama";

    // AssistAI uses Langfuse-style combined keys: "pk-lf-xxx|sk-lf-yyy"
    const isCombinedKey = rawKey.includes("|");
    const secretKey = isCombinedKey ? rawKey.split("|")[1] : rawKey;
    const publicKey = isCombinedKey ? rawKey.split("|")[0] : "";

    const defaultHeaders: Record<string, string> = {
      // AssistAI/Langfuse proxy blocks the default OpenAI SDK User-Agent
      "User-Agent": "TrustLayer/1.0",
    };
    if (publicKey) {
      defaultHeaders["X-Langfuse-Public-Key"] = publicKey;
    }

    this.client = new OpenAI({
      apiKey: secretKey,
      baseURL,
      defaultHeaders,
      maxRetries: AI_MAX_RETRIES,
    });

    this.model = process.env.EMBEDDING_MODEL || "multilingual-e5-small";
  }

  /**
   * Get embedding for a single text.
   */
  async embed(text: string): Promise<number[]> {
    const cached = this.cache.get(text);
    if (cached) return cached;

    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });

    const embedding = response.data[0].embedding;
    this.cache.set(text, embedding);
    return embedding;
  }

  /**
   * Get embeddings for multiple texts (batched).
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: (number[] | null)[] = texts.map(
      (t) => this.cache.get(t) ?? null,
    );
    const toEmbed = texts.filter((_, i) => results[i] === null);

    if (toEmbed.length > 0) {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: toEmbed,
      });

      let embedIdx = 0;
      for (let i = 0; i < results.length; i++) {
        if (results[i] === null) {
          const embedding = response.data[embedIdx].embedding;
          results[i] = embedding;
          this.cache.set(texts[i], embedding);
          embedIdx++;
        }
      }
    }

    return results as number[][];
  }

  /**
   * Compute cosine similarity between two vectors.
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error("Vector length mismatch");

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
  }

  /**
   * Clear the embedding cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

