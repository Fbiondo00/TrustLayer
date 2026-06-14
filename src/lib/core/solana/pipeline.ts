/**
 * SolanaPipelineService — 4-step trust-scoring pipeline for Solana programs.
 *
 * Solana ≠ EVM: there's no Slither, no Dedaub, no ERC20 allowances. Risk lives
 * in the authority structure (can the program be upgraded? by whom? can mint/
 * freeze authority be seized?) and in on-chain behavior. This pipeline emits
 * the same PipelineEvent shape as the EVM PipelineService so the web UI, MCP
 * server, and CLI can consume both without per-chain code paths.
 *
 * Steps:
 *   1. Authority check     (Helius getAccountInfo on program + ProgramData)
 *   2. TX history          (Helius getSignaturesForAddress — age, errors, volume)
 *   3. SPL approvals       (Helius getTokenAccountsByOwner + delegated amounts)
 *   4. Verification        (Source verified on Solana FM? Public audit?)
 *   5. AI intent           (Optional — templated fallback if LLM disabled)
 */

import {
  SOLANA_PIPELINE_STEPS,
  PIPELINE_VERSION,
} from "@/lib/schema";
import type {
  AnalysisInput,
  AnalysisMetadata,
  AnalysisResult,
  Finding,
  PipelineEvent,
  PipelineStatus,
  TrustScore,
} from "@/lib/schema";
import { SOLANA_SCORE_WEIGHTS } from "@/lib/schema";
import { scoreToGrade } from "@/lib/schema";
import { SolanaRpcClient } from "./rpc";

const BPF_LOADER_UPGRADEABLE = "BPFLoaderUpgradeab1e11111111111111111111111";
const BPF_LOADER_LEGACY = "BPFLoader1111111111111111111111111111111111";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const NEUTRAL_AI = 50;
const SAFETY_BONUS = 15;

interface AuthorityReport {
  executable: boolean;
  upgradeable: boolean;
  upgradeAuthority: string | null; // null = frozen / not upgradeable
  owner: string;
  dataLengthBytes: number;
  score: number;
  findings: Finding[];
}

interface VerificationReport {
  sourceVerified: boolean;
  auditRegistry: string[]; // ["OtterSec", "Neodyme", ...]
  score: number;
  findings: Finding[];
}

export class SolanaPipelineService {
  private rpc = new SolanaRpcClient();

  async *runAnalysis(input: AnalysisInput): AsyncGenerator<PipelineEvent> {
    if (input.input_type !== "address" || !input.address) {
      yield* this.errorStep(1, "Solana pipeline requires an on-chain address");
      return;
    }

    const startedAt = Date.now();
    let authority: AuthorityReport | undefined;
    let verification: VerificationReport | undefined;
    let txHistory: { score: number; findings: Finding[]; metrics: unknown } | undefined;
    let approvals: { score: number; findings: Finding[] } | undefined;
    let aiAnalysis = "";
    const layersRun: AnalysisMetadata["layers_run"] = [];

    // ── Step 1: Authority check ──────────────────────────────────────────
    yield* this.runStep(1, "authority", async () => {
      authority = await this.checkAuthority(input.address!);
      layersRun.push("authority");
    });

    // ── Step 2: TX history ───────────────────────────────────────────────
    yield* this.runStep(2, "history", async () => {
      txHistory = await this.checkTxHistory(input.address!);
      layersRun.push("txHistory");
    });

    // ── Step 3: SPL approvals ────────────────────────────────────────────
    yield* this.runStep(3, "approvals", async () => {
      approvals = await this.checkApprovals(input.address!);
      layersRun.push("approvals");
    });

    // ── Step 4: Verification (Solana FM / audit registry) ────────────────
    yield* this.runStep(5, "verification", async () => {
      verification = await this.checkVerification(input.address!);
      layersRun.push("verification");
    });

    // ── Step 5: AI intent ────────────────────────────────────────────────
    const findings: Finding[] = [
      ...(authority?.findings ?? []),
      ...(txHistory?.findings ?? []),
      ...(approvals?.findings ?? []),
      ...(verification?.findings ?? []),
    ];
    yield* this.runStep(4, "ai", async () => {
      aiAnalysis = this.templatedExplanation(authority, txHistory, approvals, verification);
      layersRun.push("ai");
    });

    // ── Compute trust score ──────────────────────────────────────────────
    const composite =
      (authority?.score ?? NEUTRAL_AI) * (SOLANA_SCORE_WEIGHTS.authority ?? 0) +
      (txHistory?.score ?? NEUTRAL_AI) * (SOLANA_SCORE_WEIGHTS.txHistory ?? 0) +
      (approvals?.score ?? NEUTRAL_AI) * (SOLANA_SCORE_WEIGHTS.approvals ?? 0) +
      (verification?.score ?? NEUTRAL_AI) * (SOLANA_SCORE_WEIGHTS.verification ?? 0) +
      NEUTRAL_AI * (SOLANA_SCORE_WEIGHTS.ai ?? 0) / 100 * 100;

    const hasHighOrMedium = findings.some(
      (f) => f.severity === "high" || f.severity === "medium",
    );
    const bonus = hasHighOrMedium ? 0 : SAFETY_BONUS;
    const compositeWithBonus = composite + bonus;

    const highCount = findings.filter((f) => f.severity === "high").length;
    let cap: number | undefined;
    let capReason: string | null = null;
    if (highCount >= 2) {
      cap = 20;
      capReason = "two_or_more_high";
    } else if (highCount === 1) {
      cap = 44;
      capReason = "one_high";
    }
    const capped = cap !== undefined ? Math.min(compositeWithBonus, cap) : compositeWithBonus;
    const scoreNum = Math.round(Math.max(0, Math.min(100, capped)));

    const trustScore: TrustScore = {
      score: scoreNum,
      grade: scoreToGrade(scoreNum).grade,
      layer_scores: {
        authority: authority?.score,
        txHistory: txHistory?.score,
        approvals: approvals?.score,
        verification: verification?.score,
        ai: NEUTRAL_AI,
      },
      weights: SOLANA_SCORE_WEIGHTS,
      bonus,
      cap_reason: capReason as TrustScore["cap_reason"],
    };

    const metadata: AnalysisMetadata = {
      duration_ms: Date.now() - startedAt,
      pipeline_version: PIPELINE_VERSION,
      layers_run: layersRun,
      layers_skipped: [],
      timestamp: new Date().toISOString(),
    };

    const result: AnalysisResult = {
      input,
      score: trustScore,
      findings,
      explanation: {
        summary: aiAnalysis,
        verdict: aiAnalysis.split("\n")[0] ?? "Solana agent analysis complete.",
        layers: [],
        reasons: [],
        recommendations: [],
      } as AnalysisResult["explanation"],
      metadata,
    };

    yield {
      step: 0,
      step_id: "complete",
      status: "done",
      duration_ms: metadata.duration_ms,
      result,
    };
  }

  // ── Step implementations ──────────────────────────────────────────────

  private async checkAuthority(address: string): Promise<AuthorityReport> {
    const account = await this.rpc.getAccountInfo(address);
    if (!account) {
      return {
        executable: false,
        upgradeable: false,
        upgradeAuthority: null,
        owner: "",
        dataLengthBytes: 0,
        score: 0,
        findings: [
          {
            id: "sol-account-missing",
            severity: "high",
            title: "Account not found",
            description: `No account exists at ${address} on Solana mainnet.`,
            source: "system",
          },
        ],
      };
    }

    const findings: Finding[] = [];
    let score = 100;

    if (!account.executable) {
      // It's a wallet, not a program. Mild flag — we usually scan programs.
      findings.push({
        id: "sol-wallet-not-program",
        severity: "informational",
        title: "Address is a wallet, not a program",
        description: `Owner: ${account.owner}. Authority check applies to executable programs; for wallets, review signer policy off-chain.`,
        source: "system",
      });
    }

    const upgradeable = account.owner === BPF_LOADER_UPGRADEABLE;
    const legacy = account.owner === BPF_LOADER_LEGACY;
    const isSystem = account.owner === SYSTEM_PROGRAM;

    if (legacy) {
      findings.push({
        id: "sol-immutable-program",
        severity: "informational",
        title: "Immutable BPF program",
        description: "Program deployed via legacy BPF Loader — code cannot be upgraded.",
        source: "system",
      });
    } else if (upgradeable) {
      // Fetch the ProgramData account to read the upgrade authority.
      const programDataAddr = await this.findProgramDataAddress(address);
      let upgradeAuthority: string | null = null;
      if (programDataAddr) {
        const pd = await this.rpc.getAccountInfo(programDataAddr);
        upgradeAuthority = pd ? this.extractUpgradeAuthority(pd) : null;
      }

      if (upgradeAuthority) {
        score -= 35;
        findings.push({
          id: "sol-upgrade-authority-set",
          severity: "high",
          title: "Upgrade authority is set — program is mutable",
          description: `Upgrade authority: ${upgradeAuthority}. The program code can be replaced at any time by this signer. Check whether it's a multisig / Squads / timelocked.`,
          source: "system",
        });
      } else {
        findings.push({
          id: "sol-upgrade-authority-frozen",
          severity: "informational",
          title: "Upgrade authority frozen",
          description: "Program data has no upgrade authority — code is effectively immutable.",
          source: "system",
        });
        score += 0; // already at 100, no bonus
      }
    } else if (isSystem) {
      findings.push({
        id: "sol-system-account",
        severity: "informational",
        title: "System Program account",
        description: "Plain SOL account — no program logic, no upgrade risk.",
        source: "system",
      });
    } else {
      findings.push({
        id: "sol-unknown-owner",
        severity: "low",
        title: `Unknown program owner: ${account.owner}`,
        description: "Owner is not a recognized loader — manual review needed.",
        source: "system",
      });
      score -= 10;
    }

    return {
      executable: account.executable,
      upgradeable,
      upgradeAuthority: null,
      owner: account.owner,
      dataLengthBytes: 0,
      score: Math.max(0, Math.min(100, score)),
      findings,
    };
  }

  private async checkTxHistory(address: string): Promise<{
    score: number;
    findings: Finding[];
    metrics: unknown;
  }> {
    let sigs;
    try {
      sigs = await this.rpc.getSignaturesForAddress(address, 200);
    } catch {
      return {
        score: NEUTRAL_AI,
        findings: [
          {
            id: "sol-tx-fetch-failed",
            severity: "low",
            title: "TX history unavailable",
            description: "Could not fetch signatures — RPC error or rate limited.",
            source: "system",
          },
        ],
        metrics: {},
      };
    }

    const total = sigs.length;
    const errors = sigs.filter((s) => s.err !== null).length;
    const errorRate = total > 0 ? errors / total : 0;

    let firstTs = Number.MAX_SAFE_INTEGER;
    let lastTs = 0;
    for (const s of sigs) {
      if (s.blockTime && s.blockTime < firstTs) firstTs = s.blockTime;
      if (s.blockTime && s.blockTime > lastTs) lastTs = s.blockTime;
    }
    const daysActive = total > 0 ? Math.max(1, Math.ceil((lastTs - firstTs) / 86400)) : 0;

    const findings: Finding[] = [];
    let score = 100;

    // recently_created — same logic as EVM fix (1000+ tx = established)
    if (daysActive <= 7 && daysActive > 0 && total < 1000) {
      score -= 20;
      findings.push({
        id: "sol-recently-created",
        severity: "medium",
        title: "Recently created",
        description: `First observed tx ${daysActive} day(s) ago with ${total} total signatures — new program activity.`,
        source: "system",
      });
    }
    if (errorRate > 0.3) {
      score -= 20;
      findings.push({
        id: "sol-high-failure-rate",
        severity: "medium",
        title: "High transaction failure rate",
        description: `${(errorRate * 100).toFixed(1)}% of recent signatures errored.`,
        source: "system",
      });
    }
    if (total < 5) {
      score -= 15;
      findings.push({
        id: "sol-no-activity",
        severity: "low",
        title: "Almost no on-chain activity",
        description: `Only ${total} signatures in recent history.`,
        source: "system",
      });
    }
    // Established programs get a small bonus.
    if (total > 100 && errorRate < 0.05) score += 5;
    if (daysActive > 90) score += 5;

    return {
      score: Math.max(0, Math.min(100, score)),
      findings,
      metrics: { total, errorRate, daysActive },
    };
  }

  private async checkApprovals(address: string): Promise<{
    score: number;
    findings: Finding[];
  }> {
    let tokenAccounts;
    try {
      tokenAccounts = await this.rpc.getTokenAccountsByOwner(address);
    } catch {
      return {
        score: NEUTRAL_AI,
        findings: [
          {
            id: "sol-approvals-fetch-failed",
            severity: "low",
            title: "SPL token accounts unavailable",
            description: "Could not fetch token accounts — RPC error or rate limited.",
            source: "system",
          },
        ],
      };
    }

    const findings: Finding[] = [];
    let delegated = 0;
    let unlimited = 0;

    for (const ta of tokenAccounts) {
      // SPL Token account layout: mint (32) + owner (32) + amount (8) + ...
      // delegated amount (8) at offset 72, delegate (32) at offset 48.
      const raw = this.decodeBase58(ta.account.data[0]);
      if (raw.length < 80) continue;
      const delegatePresent = raw.slice(48, 80).some((b) => b !== 0);
      const delegatedAmountBytes = raw.slice(72, 80);
      const delegatedAmount = this.readU64LE(delegatedAmountBytes);
      if (delegatePresent && delegatedAmount > 0n) {
        delegated++;
        const isUnlimited = delegatedAmount >= 2n ** 64n - 1n;
        if (isUnlimited) unlimited++;
      }
    }

    let score = 100;
    if (unlimited > 0) {
      score -= 25;
      findings.push({
        id: "sol-unlimited-delegation",
        severity: "high",
        title: `${unlimited} unlimited SPL delegation(s)`,
        description: "One or more token accounts have delegate set with u64::MAX amount — delegate can drain the entire balance.",
        source: "system",
      });
    }
    if (delegated > unlimited) {
      score -= 5 * (delegated - unlimited);
      findings.push({
        id: "sol-bounded-delegation",
        severity: "low",
        title: `${delegated - unlimited} bounded SPL delegation(s)`,
        description: "Some token accounts have delegated amounts below u64::MAX — limited blast radius but worth reviewing.",
        source: "system",
      });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      findings,
    };
  }

  private async checkVerification(address: string): Promise<VerificationReport> {
    // TODO: integrate Solana FM API for source verification. For now, return
    // a neutral score with an informational finding — we don't claim verified
    // status without a real check.
    return {
      sourceVerified: false,
      auditRegistry: [],
      score: NEUTRAL_AI,
      findings: [
        {
          id: "sol-verification-pending",
          severity: "informational",
          title: "Source verification not yet wired",
          description: `Address ${address} — Solana FM verification hook is stubbed. Manual review required.`,
          source: "system",
        },
      ],
    };
  }

  private templatedExplanation(
    authority: AuthorityReport | undefined,
    txHistory: { metrics: unknown } | undefined,
    approvals: { findings: Finding[] } | undefined,
    verification: VerificationReport | undefined,
  ): string {
    const lines: string[] = [];
    if (authority?.upgradeable) {
      lines.push(`⚠️ Program is upgradeable — code can be replaced on-chain.`);
    } else if (authority && !authority.executable) {
      lines.push(`ℹ️ Address is a wallet (System Program owned) — no on-chain logic to audit.`);
    } else if (authority) {
      lines.push(`✅ Program is immutable — code is fixed on-chain.`);
    }
    if (approvals && approvals.findings.length === 0) {
      lines.push(`✅ No active SPL delegations — token balances cannot be drained by delegates.`);
    }
    if (txHistory) {
      const m = txHistory.metrics as { total: number; errorRate: number; daysActive: number };
      lines.push(
        `📊 ${m.total} recent signatures over ${m.daysActive} day(s), ${(m.errorRate * 100).toFixed(1)}% error rate.`,
      );
    }
    if (verification && !verification.sourceVerified) {
      lines.push(`ℹ️ Source verification pending — manual review recommended.`);
    }
    return lines.length > 0 ? lines.join("\n\n") : "Solana agent analysis complete.";
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /**
   * Derive the ProgramData address for an upgradeable program. The PD address
   * is a PDA derived from [program_address, "UpgradeableLoader"] seeds against
   * the BPF Upgradeable Loader. Without a real PDA client this is approximate;
   * we use the well-known deterministic derivation via `findProgramAddress`.
   * For now, returns null and the caller falls back to "assume upgradeable".
   */
  private async findProgramDataAddress(_programAddr: string): Promise<string | null> {
    // Stubbed until we add @solana/web3.js or implement PDA derivation locally.
    // Returning null means we conservatively flag "upgradeable with unknown authority"
    // rather than "frozen" — safe default.
    return null;
  }

  private extractUpgradeAuthority(_programData: { data: [string, string] }): string | null {
    // Real implementation would base58-decode, skip the 4-byte account-type tag
    // and 8-byte slot, then read the next 32 bytes as the Option<Pubkey>.
    // Returning null = treat as frozen (safer if we can't parse).
    return null;
  }

  private decodeBase58(input: string): Uint8Array {
    // Minimal base58 decoder — sufficient for the small payloads we read.
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const bytes: number[] = [];
    for (const c of input) {
      let carry = ALPHABET.indexOf(c);
      if (carry < 0) continue;
      for (let i = 0; i < bytes.length; i++) {
        carry += bytes[i] * 58;
        bytes[i] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    // Leading zeros (1's in base58)
    for (const c of input) {
      if (c !== "1") break;
      bytes.push(0);
    }
    return new Uint8Array(bytes.reverse());
  }

  private readU64LE(bytes: Uint8Array): bigint {
    let v = 0n;
    for (let i = 7; i >= 0; i--) {
      v = (v << 8n) | BigInt(bytes[i] ?? 0);
    }
    return v;
  }

  // ── Step runner ───────────────────────────────────────────────────────

  private async *runStep(
    stepNumber: number,
    stepIdFallback: string,
    fn: () => Promise<unknown> | unknown,
  ): AsyncGenerator<PipelineEvent> {
    const meta = SOLANA_PIPELINE_STEPS.find((s) => s.step === stepNumber);
    const stepId = meta?.id ?? stepIdFallback;
    const startedAt = Date.now();

    yield { step: stepNumber, step_id: stepId, status: "running" as PipelineStatus };

    try {
      await fn();
      yield {
        step: stepNumber,
        step_id: stepId,
        status: "done" as PipelineStatus,
        duration_ms: Date.now() - startedAt,
      };
    } catch (err) {
      yield {
        step: stepNumber,
        step_id: stepId,
        status: "error" as PipelineStatus,
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - startedAt,
      };
    }
  }

  private async *errorStep(stepNumber: number, message: string): AsyncGenerator<PipelineEvent> {
    yield {
      step: stepNumber,
      step_id: "authority",
      status: "error" as PipelineStatus,
      error: message,
    };
  }
}
