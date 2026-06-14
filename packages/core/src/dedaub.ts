/**
 * Dedaub client — on-demand decompilation + TokIn risk-flag lookup.
 *
 * Two endpoints:
 *   - POST api.dedaub.com/api/on_demand  → submit bytecode, poll for source
 *   - GET  tokin-api.dedaub.com/token/:chain/:address → risk flags
 *
 * Graceful degradation: when DEDAUB_API_KEY is missing, `isEnabled()` returns
 * false and both methods throw on call. The pipeline checks `isEnabled()`
 * first and skips the step otherwise.
 *
 * Ported from `packages/core/src/dedaub.ts` in the NapulETH orchestrator.
 */

import crypto from "crypto";

export interface DecompilationResult {
  source: string;
}

export interface TokenRiskResult {
  flags: string[];
  raw: Record<string, unknown>;
}

const BASE_URL = "https://api.dedaub.com";
const TOKIN_URL = "https://tokin-api.dedaub.com";

export class DedaubClient {
  private readonly apiKey: string;
  private readonly tokinApiKey: string;

  constructor(opts?: { apiKey?: string; tokinApiKey?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.DEDAUB_API_KEY ?? "";
    this.tokinApiKey =
      opts?.tokinApiKey ?? process.env.TOKIN_API_KEY ?? this.apiKey;
  }

  isEnabled(): boolean {
    return this.apiKey.length > 0;
  }

  async decompile(bytecode: string): Promise<DecompilationResult> {
    if (!this.isEnabled()) {
      throw new Error("DedaubClient is disabled (DEDAUB_API_KEY not set)");
    }
    const hash = crypto.createHash("md5").update(bytecode).digest("hex");

    const submitRes = await fetch(`${BASE_URL}/api/on_demand`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(bytecode),
    });

    if (!submitRes.ok) {
      const text = await submitRes.text();
      throw new Error(`Dedaub submit failed (${submitRes.status}): ${text}`);
    }

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(
        `${BASE_URL}/on_demand/decompilation/${hash}`,
        { headers: { "X-API-Key": this.apiKey } },
      );
      if (!pollRes.ok) continue;
      const data = (await pollRes.json()) as { status?: string; source?: string };
      if (data.source) {
        return { source: data.source };
      }
    }
    throw new Error("Dedaub decompilation timeout (5 min)");
  }

  async tokenRisk(chain: string, address: string): Promise<TokenRiskResult> {
    if (!this.isEnabled()) {
      throw new Error("DedaubClient is disabled (DEDAUB_API_KEY not set)");
    }
    const res = await fetch(`${TOKIN_URL}/token/${chain}/${address}`, {
      headers: {
        "X-API-Key": this.tokinApiKey,
        accept: "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Dedaub TokIn auth error (${res.status}) — check DEDAUB_API_KEY`,
        );
      }
      if (res.status === 500) {
        // 500 from TokIn is ambiguous: non-token address, bogus key, or outage.
        // Silent skip with marker in raw — pipeline yields 0 flags.
        return { flags: [], raw: { _skipped: "tokin-500-not-token-or-outage" } };
      }
      throw new Error(`Dedaub TokIn API error (${res.status})`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const flags = Object.entries(data)
      .filter(([, v]) => v === true || (typeof v === "number" && v > 0))
      .map(([k]) => k);
    return { flags, raw: data };
  }
}
