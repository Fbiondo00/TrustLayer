/**
 * LLM client — OpenAI SDK pointed at any OpenAI-compatible endpoint
 * (AssistAI/Langfuse, Ollama, OpenAI itself, Red Hat gateway).
 *
 * Two methods: `analyzeContract` produces a Markdown audit report from
 * source + Slither findings; `generateFix` returns patched Solidity.
 *
 * Graceful degradation: `isEnabled()` requires `OPENAI_API_KEY` (or
 * `REDHAT_API_KEY`). When disabled, both methods throw — the pipeline checks
 * `isEnabled()` first and skips the step, falling back to `ScoreExplainer`.
 *
 * Ported from `packages/core/src/llm.ts` in the NapulETH orchestrator.
 * RAG + BeeAI agents are out of scope for TrustLayer (P1).
 */

import OpenAI from "openai";

interface SlitherFindingLike {
  check?: string;
  severity?: string;
  description?: string;
}

export class LLMClient {
  private client: OpenAI;
  private analysisModel: string;
  private fixModel: string;
  private readonly apiKey: string;

  constructor() {
    const baseURL =
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
    const publicKey = isCombinedKey ? rawKey.split("|")[0]! : "";

    const defaultHeaders: Record<string, string> = {
      // AssistAI/Langfuse proxy blocks the default OpenAI SDK User-Agent
      "User-Agent": "TrustLayer/1.0",
    };
    if (publicKey) {
      defaultHeaders["X-Langfuse-Public-Key"] = publicKey;
    }

    this.client = new OpenAI({ apiKey: secretKey, baseURL, defaultHeaders });

    this.analysisModel =
      process.env.ANALYSIS_MODEL ||
      (process.env.REDHAT_API_URL ? "gemma-4-E4B" : "gemma4-thinker");

    this.fixModel =
      process.env.FIX_MODEL ||
      (process.env.REDHAT_API_URL ? "gemma-4-E4B" : "gemma4-coder");
  }

  isEnabled(): boolean {
    return this.apiKey.trim().length > 0;
  }

  /**
   * Analyze a smart contract for vulnerabilities.
   * Returns Markdown text explaining each finding.
   */
  async analyzeContract(
    source: string,
    findings: SlitherFindingLike[],
  ): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error("LLMClient is disabled (OPENAI_API_KEY not set)");
    }

    const system = `You are a smart contract security auditor. Analyze the provided Solidity code and Slither findings.
For each vulnerability explain:
1. What the attack does (in simple terms)
2. Why the code is vulnerable
3. Potential impact (funds at risk, etc.)
4. Real severity

Be concise and technical.`;

    const user = `## Source Code\n\`\`\`solidity\n${source.slice(0, 8000)}\n\`\`\`\n\n## Slither Findings\n${JSON.stringify(findings, null, 2)}\n\nAnalyze each vulnerability found.`;

    return this.callOpenAI(system, user, this.analysisModel);
  }

  /**
   * Generate a fix for a specific vulnerability.
   * Returns the patched Solidity source (no markdown fences).
   */
  async generateFix(
    source: string,
    vulnerability: string,
    patterns: string,
  ): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error("LLMClient is disabled (OPENAI_API_KEY not set)");
    }

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
}
