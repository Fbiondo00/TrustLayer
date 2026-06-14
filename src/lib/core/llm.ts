/**
 * LLM client — OpenAI-compatible chat with optional BeeAI agent + RAG context.
 *
 * Three layers, in priority order:
 * 1. **BeeAI ReActAgent** (optional) — used when `USE_BEEAI=true`. Falls back
 *    to the OpenAI SDK call on failure. Reads `AGENT_MODEL` (default
 *    `ollama:granite3.3:8b`).
 * 2. **OpenAI SDK** (primary) — works against AssistAI/Langfuse, Ollama,
 *    OpenAI itself, or the Red Hat gateway. Langfuse combined-key splitting
 *    handled here.
 * 3. **RAG context** — every analysis call pulls relevant SWC patterns via
 *    `RAGService.buildSemanticContext()`. Wrapped in try/catch so a RAG
 *    failure never kills the analysis.
 *
 * Graceful degradation: `isEnabled()` requires `OPENAI_API_KEY` (or
 * `REDHAT_API_KEY`). When disabled, both methods throw — the pipeline checks
 * `isEnabled()` first and skips the step, falling back to `ScoreExplainer`.
 *
 * AssistAI proxy occasionally drops connections — `maxRetries` bumped from
 * the SDK default of 2 to 4 (5 total attempts).
 */

import OpenAI from "openai";
import { RAGService } from "./rag";

const AI_MAX_RETRIES = 4;

interface SlitherFindingLike {
  check?: string;
  severity?: string;
  description?: string;
}

export class LLMClient {
  private client: OpenAI | null = null;
  private analysisModel: string;
  private fixModel: string;
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly publicKey: string;
  private readonly useBeeAI: boolean;

  constructor() {
    this.baseURL =
      process.env.REDHAT_API_URL?.replace(/\/v1\/chat\/completions$/, "/v1") ||
      process.env.OPENAI_BASE_URL ||
      "http://localhost:11434/v1";

    const rawKey =
      process.env.REDHAT_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    this.apiKey = rawKey;

    // AssistAI uses Langfuse-style combined keys: "pk-lf-xxx|sk-lf-yyy"
    // — secret key goes in Authorization: Bearer
    // — public key goes in X-Langfuse-Public-Key header
    const isCombinedKey = rawKey.includes("|");
    const secretKey = isCombinedKey ? rawKey.split("|")[1]! : rawKey;
    this.publicKey = isCombinedKey ? rawKey.split("|")[0]! : "";

    // Lazy-init the OpenAI client — the SDK throws on construction if the
    // key is empty, so we only build it when isEnabled() is true.
    if (this.isEnabled()) {
      const defaultHeaders: Record<string, string> = {
        // AssistAI/Langfuse proxy blocks the default OpenAI SDK User-Agent
        "User-Agent": "TrustLayer/1.0",
      };
      if (this.publicKey) {
        defaultHeaders["X-Langfuse-Public-Key"] = this.publicKey;
      }
      this.client = new OpenAI({
        apiKey: secretKey,
        baseURL: this.baseURL,
        defaultHeaders,
        maxRetries: AI_MAX_RETRIES,
      });
    }

    this.analysisModel =
      process.env.ANALYSIS_MODEL ||
      (process.env.REDHAT_API_URL ? "gemma-4-E4B" : "gemma4-thinker");

    this.fixModel =
      process.env.FIX_MODEL ||
      (process.env.REDHAT_API_URL ? "gemma-4-E4B" : "gemma4-coder");

    // Disable BeeAI by default — only enabled when USE_BEEAI=true.
    this.useBeeAI = process.env.USE_BEEAI === "true";
  }

  isEnabled(): boolean {
    return this.apiKey.trim().length > 0;
  }

  /**
   * Analyze a smart contract for vulnerabilities.
   * Returns Markdown text explaining each finding.
   *
   * Tries BeeAI agent first (if enabled), falls back to OpenAI SDK call.
   */
  async analyzeContract(
    source: string,
    findings: SlitherFindingLike[],
  ): Promise<string> {
    if (!this.isEnabled() || !this.client) {
      throw new Error("LLMClient is disabled (OPENAI_API_KEY not set)");
    }

    // Build RAG context — never let this kill the analysis.
    let ragContext = "";
    try {
      const rag = new RAGService();
      ragContext = await rag.buildSemanticContext(
        findings.map((f) => ({
          check: f.check ?? "",
          severity: f.severity ?? "",
          description: f.description ?? "",
        })),
        source,
      );
    } catch {
      // RAG failed — continue without context.
    }

    if (this.useBeeAI) {
      try {
        return await this.analyzeWithBeeAI(source, findings, ragContext);
      } catch (err) {
        console.warn("BeeAI agent failed, falling back to OpenAI SDK:", err);
      }
    }

    return this.analyzeWithOpenAI(source, findings, ragContext);
  }

  /**
   * Generate a fix for a specific vulnerability.
   * Returns the patched Solidity source (no markdown fences).
   *
   * Tries BeeAI agent first (if enabled), falls back to OpenAI SDK call.
   */
  async generateFix(
    source: string,
    vulnerability: string,
    patterns: string,
  ): Promise<string> {
    if (!this.isEnabled() || !this.client) {
      throw new Error("LLMClient is disabled (OPENAI_API_KEY not set)");
    }

    if (this.useBeeAI) {
      try {
        return await this.fixWithBeeAI(source, vulnerability, patterns);
      } catch (err) {
        console.warn("BeeAI fix failed, falling back to OpenAI SDK:", err);
      }
    }

    return this.fixWithOpenAI(source, vulnerability, patterns);
  }

  // ─── OpenAI SDK Implementation ─────────────────────────────

  private async analyzeWithOpenAI(
    source: string,
    findings: SlitherFindingLike[],
    ragContext: string,
  ): Promise<string> {
    const system = `You are a smart contract security auditor. Analyze the provided Solidity code and Slither findings.
For each vulnerability explain:
1. What the attack does (in simple terms)
2. Why the code is vulnerable
3. Potential impact (funds at risk, etc.)
4. Real severity

Be concise and technical.
${ragContext ? `\n## Relevant Security Knowledge:\n${ragContext}` : ""}`;

    const user = `## Source Code\n\`\`\`solidity\n${source.slice(0, 8000)}\n\`\`\`\n\n## Slither Findings\n${JSON.stringify(findings, null, 2)}\n\nAnalyze each vulnerability found.`;

    return this.callOpenAI(system, user, this.analysisModel);
  }

  private async fixWithOpenAI(
    source: string,
    vulnerability: string,
    patterns: string,
  ): Promise<string> {
    const system = `You are a smart contract auditor. Fix the specified vulnerability.
Rules:
- Respond ONLY with the complete corrected Solidity code
- Keep the same contract structure, change only what is needed
- Do not add explanations or markdown
${patterns ? `\n## Reference fix patterns:\n${patterns}` : ""}`;

    const user = `## Vulnerable Code\n\`\`\`solidity\n${source}\n\`\`\`\n\n## Vulnerability to fix: ${vulnerability}\n\nOutput the fixed Solidity code only.`;

    const response = await this.callOpenAI(system, user, this.fixModel);
    const match = response.match(/```solidity\n([\s\S]*?)```/);
    return match ? match[1]!.trim() : response.trim();
  }

  private async callOpenAI(
    system: string,
    user: string,
    model: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error("LLMClient has no OpenAI client initialized");
    }
    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      const reasoning = response.choices[0]?.message.refusal;
      if (reasoning) return `[Reasoning]\n${reasoning}`;
      throw new Error("LLM returned empty response");
    }
    return content;
  }

  // ─── BeeAI Agent Implementation ────────────────────────────

  private async analyzeWithBeeAI(
    source: string,
    findings: SlitherFindingLike[],
    ragContext: string,
  ): Promise<string> {
    // Dynamic imports — beeai-framework is an optional peer dep.
    // @ts-ignore — subpath exports not visible to TS but resolved at runtime
    const { ReActAgent } = await import("beeai-framework/agents/react/agent");
    // @ts-ignore
    const { UnconstrainedMemory } = await import(
      "beeai-framework/memory/unconstrainedMemory"
    );
    // @ts-ignore
    const { ChatModel } = await import("beeai-framework/backend/chat");

    const modelName = process.env.AGENT_MODEL || "ollama:granite3.3:8b";

    // @ts-ignore — modelName is a valid BeeAI model identifier
    const llm = await ChatModel.fromName(modelName);

    const findingsSummary = findings
      .map((f) => `- [${(f.severity ?? "").toUpperCase()}] ${f.check}: ${f.description}`)
      .join("\n");

    const userPrompt = `You are TrustLayer's AI Security Analyst. Your role is to analyze smart contract vulnerabilities found by automated tools and explain them clearly to users.

Key principles:
- You are a TRANSLATOR, not an oracle — explain what the mechanical tools found, don't invent issues
- Be concise and technical but accessible
- Always reference specific code sections
- Assess real-world impact (funds at risk, attack scenario)
- Never hallucinate vulnerabilities not supported by the findings

## Smart Contract Source Code
\`\`\`solidity
${source.slice(0, 8000)}
\`\`\`

${source.length > 8000 ? "\n[Source code truncated for analysis]\n" : ""}

## Vulnerability Findings
${findingsSummary}

${ragContext ? `## Security Knowledge Base (RAG Context)\n${ragContext}` : ""}

---

Analyze each vulnerability found. For each:
1. **What** — Explain the attack vector in simple terms
2. **Why** — Why the code is vulnerable (reference specific lines)
3. **Impact** — Real-world consequences (funds at risk, etc.)
4. **Severity Assessment** — Do you agree with the tool's severity rating?

Be concise. This is for a trust score report.`;

    const agent = new ReActAgent({
      llm,
      memory: new UnconstrainedMemory(),
      tools: [],
    });

    const response = await agent.run({ prompt: userPrompt });
    return response.result.text;
  }

  private async fixWithBeeAI(
    source: string,
    vulnerability: string,
    patterns: string,
  ): Promise<string> {
    // @ts-ignore
    const { ReActAgent } = await import("beeai-framework/agents/react/agent");
    // @ts-ignore
    const { UnconstrainedMemory } = await import(
      "beeai-framework/memory/unconstrainedMemory"
    );
    // @ts-ignore
    const { ChatModel } = await import("beeai-framework/backend/chat");

    const modelName = process.env.FIX_MODEL || "ollama:granite3.3:8b";

    // @ts-ignore — modelName is a valid BeeAI model identifier
    const llm = await ChatModel.fromName(modelName);

    const userPrompt = `## Vulnerable Code
\`\`\`solidity
${source.slice(0, 8000)}
\`\`\`

## Vulnerability to fix: ${vulnerability}

${patterns ? `## Reference fix patterns:\n${patterns}` : ""}

Output the FIXED Solidity code only. No explanations. No markdown fences.`;

    const agent = new ReActAgent({
      llm,
      memory: new UnconstrainedMemory(),
      tools: [],
    });

    const response = await agent.run({ prompt: userPrompt });
    const text = response.result.text;

    // Try to extract code from markdown fences.
    const match = text.match(/```solidity\n([\s\S]*?)```/);
    return match ? match[1]!.trim() : text.trim();
  }
}
