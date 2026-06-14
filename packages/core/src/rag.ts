/**
 * RAGService — Retrieval-Augmented Generation for security analysis.
 *
 * Two modes:
 * 1. **Keyword search** (legacy) — matches SWC pattern names/checks.
 * 2. **Semantic search** (embeddings) — vector similarity over security docs.
 *
 * The knowledge base is built from:
 * - `data/swc-patterns.json` (15 SWC vulnerability patterns)
 * - `data/security-docs/*.md` (enriched markdown documents — SWC reference
 *   plus topic docs like `reentrancy`, `flash-loan-attacks`, …)
 *
 * All embeddings are stored in memory (hackathon scale — no external vector DB).
 *
 * Ported from NapulETH `packages/core/src/rag.ts`. Import paths adapted from
 * `@trustlayer/schema` / `./embeddings.js` to `@trustlayer/schema` / `./embeddings`.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { RAGResult, RAGService as RAGServiceInterface } from "@trustlayer/schema";
import type { EmbeddedChunk } from "@trustlayer/schema";
import { EmbeddingService } from "./embeddings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SWCPattern {
  swc_id: number;
  name: string;
  check: string;
  severity: string;
  description: string;
  vulnerable_code: string;
  fixed_code: string;
  fix_description: string;
}

const CHUNK_SIZE = 500; // characters per chunk
const CHUNK_OVERLAP = 50; // overlap between chunks

export class RAGService implements RAGServiceInterface {
  private patterns: SWCPattern[];
  private embeddingService: EmbeddingService | null = null;
  private chunks: EmbeddedChunk[] = [];
  private indexed = false;

  constructor() {
    this.patterns = JSON.parse(
      readFileSync(join(__dirname, "data/swc-patterns.json"), "utf8"),
    );
  }

  // ─── Legacy Keyword Search (backward compat) ──────────────

  /**
   * Find SWC patterns by keyword matching (legacy).
   */
  getRelevantPatterns(checkName: string): SWCPattern[] {
    const keywords = checkName.toLowerCase().split(/[-_]/);
    return this.patterns.filter((p) =>
      keywords.some(
        (k) =>
          p.name.toLowerCase().includes(k) ||
          p.check.toLowerCase().includes(k),
      ),
    );
  }

  /**
   * Build context string from findings (legacy).
   */
  buildContext(findings: Array<{ check: string }>): string {
    let context = "";
    for (const f of findings) {
      const relevant = this.getRelevantPatterns(f.check);
      for (const p of relevant) {
        context += `\n### ${p.name} (SWC-${p.swc_id})\n`;
        context += `Severity: ${p.severity}\n`;
        context += `Vulnerable:\n\`\`\`solidity\n${p.vulnerable_code}\n\`\`\`\n`;
        context += `Fixed:\n\`\`\`solidity\n${p.fixed_code}\n\`\`\`\n`;
        context += `Fix: ${p.fix_description}\n`;
      }
    }
    return context;
  }

  // ─── Semantic Search (embeddings) ──────────────────────────

  /**
   * Initialize the embedding index — loads docs, chunks, embeds.
   * Call this once before semanticSearch(). Safe to call multiple times.
   */
  async initialize(): Promise<void> {
    if (this.indexed) return;

    this.embeddingService = new EmbeddingService();

    // Load markdown docs from security-docs/
    const docsDir = join(__dirname, "data", "security-docs");
    const documents = this.loadMarkdownDocs(docsDir);

    // Also index the SWC patterns as text chunks.
    const patternDocs = this.patterns.map((p) => ({
      content: `SWC-${p.swc_id}: ${p.name}. ${p.description}. Fix: ${p.fix_description}. Vulnerable code: ${p.vulnerable_code}. Fixed code: ${p.fixed_code}`,
      source: `swc-patterns.json#SWC-${p.swc_id}`,
      swcId: p.swc_id,
    }));

    documents.push(...patternDocs);

    // Chunk all documents.
    const allChunks: EmbeddedChunk[] = [];
    for (const doc of documents) {
      const chunks = this.chunkText(doc.content, doc.source, doc.swcId);
      allChunks.push(...chunks);
    }

    // Embed all chunks.
    if (allChunks.length > 0) {
      const texts = allChunks.map((c) => c.content);
      const embeddings = await this.embeddingService.embedBatch(texts);

      for (let i = 0; i < allChunks.length; i++) {
        allChunks[i].embedding = embeddings[i];
      }
    }

    this.chunks = allChunks;
    this.indexed = true;
  }

  /**
   * Semantic search over the knowledge base.
   * @param query  Natural language query (e.g., "reentrancy vulnerability in withdraw function")
   * @param topK   Number of results to return (default 5)
   */
  async semanticSearch(query: string, topK = 5): Promise<RAGResult[]> {
    if (!this.embeddingService) {
      this.embeddingService = new EmbeddingService();
    }

    await this.initialize();

    const queryEmbedding = await this.embeddingService.embed(query);

    const scored = this.chunks.map((chunk) => ({
      content: chunk.content,
      score: EmbeddingService.cosineSimilarity(queryEmbedding, chunk.embedding),
      source: chunk.metadata.source,
      swcId: chunk.metadata.swcId,
    }));

    // Sort by similarity descending.
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  /**
   * Hybrid search: combine keyword + semantic results.
   */
  async hybridSearch(
    query: string,
    checkName?: string,
    topK = 5,
  ): Promise<RAGResult[]> {
    const results: RAGResult[] = [];

    // Semantic results.
    const semanticResults = await this.semanticSearch(query, topK);
    results.push(...semanticResults);

    // Keyword results (boost score).
    if (checkName) {
      const keywordPatterns = this.getRelevantPatterns(checkName);
      for (const p of keywordPatterns) {
        results.push({
          content: `SWC-${p.swc_id}: ${p.name}. ${p.description}. Fix: ${p.fix_description}`,
          score: 0.95, // high confidence from keyword match
          source: `swc-patterns.json#SWC-${p.swc_id}`,
          swcId: p.swc_id,
        });
      }
    }

    // Deduplicate by source.
    const seen = new Set<string>();
    const unique = results.filter((r) => {
      const key = r.source;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Re-sort by score.
    unique.sort((a, b) => b.score - a.score);
    return unique.slice(0, topK);
  }

  /**
   * Build enriched context for LLM using hybrid search.
   */
  async buildSemanticContext(
    findings: Array<{ check: string; severity: string; description: string }>,
    sourceCode?: string,
  ): Promise<string> {
    const parts: string[] = [];

    for (const finding of findings) {
      const results = await this.hybridSearch(
        `${finding.check} ${finding.description}`,
        finding.check,
        3,
      );

      for (const r of results) {
        parts.push(
          `\n### Context for: ${finding.check}\n${r.content}\n(Source: ${r.source})`,
        );
      }
    }

    return parts.join("\n---\n");
  }

  // ─── Internal ──────────────────────────────────────────────

  private loadMarkdownDocs(
    docsDir: string,
  ): Array<{ content: string; source: string; swcId?: number }> {
    const docs: Array<{ content: string; source: string; swcId?: number }> = [];

    try {
      if (!statSync(docsDir).isDirectory()) return docs;
    } catch {
      return docs; // directory doesn't exist yet
    }

    const files = readdirSync(docsDir).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const content = readFileSync(join(docsDir, file), "utf8");
      const swcMatch = file.match(/swc-(\d+)/);
      docs.push({
        content,
        source: `security-docs/${file}`,
        swcId: swcMatch ? parseInt(swcMatch[1]) : undefined,
      });
    }

    return docs;
  }

  private chunkText(
    text: string,
    source: string,
    swcId?: number,
  ): EmbeddedChunk[] {
    const chunks: EmbeddedChunk[] = [];

    // Split into sentences/paragraphs first.
    const paragraphs = text.split(/\n{2,}/).filter(Boolean);
    let buffer = "";
    let chunkIndex = 0;

    for (const para of paragraphs) {
      if (buffer.length + para.length > CHUNK_SIZE && buffer.length > 0) {
        chunks.push({
          content: buffer.trim(),
          embedding: [], // will be filled later
          metadata: { source, swcId, chunkIndex },
        });
        chunkIndex++;
        // Keep overlap.
        const overlapStart = Math.max(0, buffer.length - CHUNK_OVERLAP);
        buffer = buffer.slice(overlapStart) + "\n\n" + para;
      } else {
        buffer += (buffer ? "\n\n" : "") + para;
      }
    }

    // Don't forget the last chunk.
    if (buffer.trim()) {
      chunks.push({
        content: buffer.trim(),
        embedding: [],
        metadata: { source, swcId, chunkIndex },
      });
    }

    return chunks;
  }
}
