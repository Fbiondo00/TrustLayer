/**
 * Pipeline orchestrator — the 8-step scan that produces an AnalysisResult.
 *
 * `runAnalysis(input)` is an async generator. It yields a PipelineEvent for
 * every step transition (running → done | error | skipped), then yields a
 * final terminal event with the complete AnalysisResult attached. Callers
 * consume the stream to update live UI; the last event's `result` is the
 * canonical scan output.
 *
 * Graceful degradation: every external-API step checks the service's
 * `isEnabled()` and emits a `skipped` event when its env var is missing.
 * Demo mode (no env keys at all) still produces a real AnalysisResult —
 * permissions + slither + score + explanation always run, the score is just
 * capped at B+ by the `slither-not-run` finding.
 *
 * Ported (and reshaped to TrustLayer types) from
 * `packages/core/src/pipeline.ts` in the NapulETH orchestrator.
 */

import {
  ApprovalScanner,
  DedaubClient,
  EtherscanClient,
  LLMClient,
  PermissionMapper,
  SlitherRunner,
  TrustScoreCalculator,
  TXHistoryAnalyzer,
} from "@trustlayer/core";
import { ScoreExplainer } from "./explanation";
import {
  PIPELINE_STEPS,
  PIPELINE_VERSION,
} from "@trustlayer/schema";
import type {
  AnalysisInput,
  AnalysisMetadata,
  AnalysisResult,
  ApprovalReport,
  Finding,
  PermissionReport,
  PipelineEvent,
  PipelineStatus,
  ScoreExplanation,
  TokenRiskReport,
  TXReport,
  TrustScore,
} from "@trustlayer/schema";

type SourceOrigin = "user" | "etherscan" | "decompiled";

export class PipelineService {
  private dedaub = new DedaubClient();
  private etherscan = new EtherscanClient();
  private slither = new SlitherRunner();
  private llm = new LLMClient();
  private permissionMapper = new PermissionMapper();
  private txHistoryAnalyzer = new TXHistoryAnalyzer();
  private approvalScanner = new ApprovalScanner();
  private scoreCalculator = new TrustScoreCalculator();

  async *runAnalysis(input: AnalysisInput): AsyncGenerator<PipelineEvent> {
    const startedAt = Date.now();
    let source = input.source ?? "";
    let bytecode: string | undefined;
    let decompiled = false;
    let sourceOrigin: SourceOrigin = "user";

    // Layers collected along the way.
    let findings: Finding[] = [];
    let tokenRisk: TokenRiskReport | undefined;
    let permissions: PermissionReport | undefined;
    let txHistory: TXReport | undefined;
    let approvals: ApprovalReport | undefined;
    let aiAnalysis = "";
    const layersRun: AnalysisMetadata["layers_run"] = [];
    const layersSkipped: AnalysisMetadata["layers_run"] = [];

    // ── Step 1: Fetch contract ─────────────────────────────────────────
    yield* this.runStep(1, async () => {
      if (input.input_type === "address" && input.address) {
        // Try Etherscan source first — verified source compiles for Slither.
        if (this.etherscan.isEnabled(input.chain)) {
          try {
            const fetched = await this.etherscan.fetchSource(
              input.address,
              input.chain,
            );
            if (fetched?.source) {
              source = fetched.source;
              sourceOrigin = "etherscan";
            }
          } catch {
            // fall through to bytecode
          }
        }
        // Always also grab bytecode (useful for the report + Dedaub fallback).
        try {
          bytecode = await this.fetchBytecode(input.address, input.chain);
        } catch {
          if (sourceOrigin !== "etherscan") {
            throw new Error(
              "Cannot fetch source or bytecode for this address — set ETH_RPC_URL or ETHERSCAN_API_KEY.",
            );
          }
        }
      } else if (input.input_type === "bytecode" && input.bytecode) {
        bytecode = input.bytecode;
      } else if (input.input_type === "source" && input.source) {
        source = input.source;
      } else {
        throw new Error("Missing input — supply source, address, or bytecode.");
      }
    });

    // ── Step 2: Decompile (only if bytecode without verified source) ──
    // TS can't follow `sourceOrigin` reassignment across the async closure above —
    // cast defensively before reading it.
    if (bytecode && (sourceOrigin as SourceOrigin) !== "etherscan") {
      if (this.dedaub.isEnabled()) {
        yield* this.runStep(2, async () => {
          const result = await this.dedaub.decompile(bytecode!);
          source = result.source;
          decompiled = true;
          sourceOrigin = "decompiled";
        });
      } else {
        yield* this.skipStep(2, "DEDAUB_API_KEY not set");
      }
    } else {
      yield* this.skipStep(2, "Verified source or no bytecode — decompile skipped");
    }

    // ── Step 3: Slither ─────────────────────────────────────────────────
    yield* this.runStep(3, () => {
      if (sourceOrigin === "decompiled") {
        // Slither compiles the source — Dedaub pseudo-Solidity does NOT compile.
        findings = [
          {
            id: "slither-skipped-decompiled",
            severity: "informational",
            title: "Slither skipped (decompiled source)",
            description:
              "Slither requires compiling Solidity; Dedaub output doesn't compile. Verify on Etherscan to enable static analysis.",
            source: "system",
          },
        ];
        return;
      }
      findings = this.slither.analyze(source);
    });

    // ── Step 4: Token risk (Dedaub TokIn) ──────────────────────────────
    if (input.input_type === "address" && input.address) {
      if (this.dedaub.isEnabled()) {
        yield* this.runStep(4, async () => {
          try {
            const result = await this.dedaub.tokenRisk(input.chain, input.address!);
            tokenRisk = {
              flags: result.flags as TokenRiskReport["flags"],
              score: Math.max(0, 100 - result.flags.length * 8),
              findings: [],
              is_token: result.flags.length > 0 || Object.keys(result.raw).length > 0,
              honeypot: result.flags.includes("is_honeypot"),
              empty: result.flags.length === 0,
            };
          } catch (err) {
            // TokIn call failed — flag as informational, don't crash the pipeline.
            findings.push({
              id: "dedaub-tokin-error",
              severity: "informational",
              title: "Dedaub TokIn unavailable",
              description: err instanceof Error ? err.message : String(err),
              source: "system",
            });
          }
        });
      } else {
        yield* this.skipStep(4, "DEDAUB_API_KEY not set");
      }
    } else {
      yield* this.skipStep(4, "Token risk requires an on-chain address");
    }

    // ── Step 5: Permissions ────────────────────────────────────────────
    yield* this.runStep(5, () => {
      permissions = this.permissionMapper.analyze(source);
    });

    // ── Step 6: TX history ─────────────────────────────────────────────
    if (input.input_type === "address" && input.address) {
      if (this.txHistoryAnalyzer.isEnabled()) {
        yield* this.runStep(6, async () => {
          try {
            txHistory = await this.txHistoryAnalyzer.analyze(input.address!);
          } catch (err) {
            findings.push({
              id: "tx-history-error",
              severity: "informational",
              title: "TX history unavailable",
              description: err instanceof Error ? err.message : String(err),
              source: "system",
            });
          }
        });
      } else {
        yield* this.skipStep(6, "ETHERSCAN_API_KEY not set");
      }
    } else {
      yield* this.skipStep(6, "TX history requires an on-chain address");
    }

    // ── Step 7: Wallet approvals ───────────────────────────────────────
    if (input.input_type === "address" && input.address) {
      if (this.approvalScanner.isEnabled(input.chain)) {
        yield* this.runStep(7, async () => {
          try {
            approvals = await this.approvalScanner.scan(input.address!, input.chain);
          } catch (err) {
            findings.push({
              id: "approvals-error",
              severity: "informational",
              title: "Approvals scan unavailable",
              description: err instanceof Error ? err.message : String(err),
              source: "system",
            });
          }
        });
      } else {
        yield* this.skipStep(7, "ETH_RPC_URL not set");
      }
    } else {
      yield* this.skipStep(7, "Approvals scan requires an on-chain address");
    }

    // ── Step 8: AI intent ──────────────────────────────────────────────
    if (this.llm.isEnabled()) {
      yield* this.runStep(8, async () => {
        try {
          aiAnalysis = await this.llm.analyzeContract(source, findings);
        } catch (err) {
          aiAnalysis = "";
          findings.push({
            id: "ai-analysis-error",
            severity: "informational",
            title: "AI analysis failed",
            description: err instanceof Error ? err.message : String(err),
            source: "system",
          });
        }
      });
    } else {
      yield* this.skipStep(8, "OPENAI_API_KEY not set");
    }

    // ── Fold permission / approval / token findings into the master list ──
    // MUST happen before scoring so the cap (which counts high-severity findings)
    // sees findings from every layer, not just Slither. Without this, a honeypot
    // (Dedaub high flags) or a wallet-draining permission pattern on a Slither-clean
    // contract would never trigger the cap.
    if (permissions) findings = [...findings, ...permissions.matched];
    if (approvals) findings = [...findings, ...approvals.findings];
    if (tokenRisk) findings = [...findings, ...tokenRiskFindings(tokenRisk)];

    // ── Compute trust score ────────────────────────────────────────────
    const detailedScore = this.scoreCalculator.calculateWithDetails({
      findings,
      tokenRiskFlags: tokenRisk?.flags,
      permissionScore: permissions?.score,
      txScore: txHistory?.score,
      approvalScore: approvals?.score,
      aiScore: undefined,
    });
    const score: TrustScore = detailedScore.score;

    // ── Generate explanation ───────────────────────────────────────────
    const explanation: ScoreExplanation = new ScoreExplainer().explain({
      score,
      componentScores: detailedScore.componentScores,
      findings,
      permissions,
      txHistory,
      approvals,
      tokenRiskFlags: tokenRisk?.flags ?? [],
      aiAnalysis,
    });

    // ── Build layers_run / layers_skipped from the events ──────────────
    // (the events themselves carry the status; we infer here from outputs)
    if ((sourceOrigin as SourceOrigin) === "etherscan" || source) layersRun.push("slither");
    if (tokenRisk) layersRun.push("dedaub");
    if (permissions) layersRun.push("permissions");
    if (txHistory) layersRun.push("txHistory");
    if (approvals) layersRun.push("approvals");
    if (aiAnalysis) layersRun.push("ai");

    const metadata: AnalysisMetadata = {
      duration_ms: Date.now() - startedAt,
      pipeline_version: PIPELINE_VERSION,
      layers_run: layersRun,
      layers_skipped: layersSkipped,
      timestamp: new Date().toISOString(),
    };

    const result: AnalysisResult = {
      input,
      score,
      findings,
      permissions,
      txHistory,
      approvals,
      tokenRisk,
      explanation,
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

  // ─── Step runner ────────────────────────────────────────────────────

  private async *runStep(
    stepNumber: number,
    fn: () => Promise<unknown> | unknown,
  ): AsyncGenerator<PipelineEvent> {
    const meta = PIPELINE_STEPS.find((s) => s.step === stepNumber);
    const stepId = meta?.id ?? `step-${stepNumber}`;
    const startedAt = Date.now();

    yield {
      step: stepNumber,
      step_id: stepId,
      status: "running" as PipelineStatus,
    };

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

  private async *skipStep(
    stepNumber: number,
    reason: string,
  ): AsyncGenerator<PipelineEvent> {
    const meta = PIPELINE_STEPS.find((s) => s.step === stepNumber);
    const stepId = meta?.id ?? `step-${stepNumber}`;
    yield {
      step: stepNumber,
      step_id: stepId,
      status: "skipped" as PipelineStatus,
      message: reason,
    };
  }

  private async fetchBytecode(address: string, chain: string): Promise<string> {
    const rpcByChain: Record<string, string | undefined> = {
      ethereum: process.env.ETH_RPC_URL,
      base: process.env.BASE_RPC_URL,
      arbitrum: process.env.ARBITRUM_RPC_URL,
      optimism: process.env.OPTIMISM_RPC_URL,
    };
    const rpcUrl = rpcByChain[chain] ?? process.env.ETH_RPC_URL;
    if (!rpcUrl) throw new Error(`No RPC configured for chain ${chain}`);

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [address, "latest"],
        id: 1,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { result?: string };
    if (!data.result || data.result === "0x") {
      throw new Error("No bytecode at this address");
    }
    return data.result;
  }
}

function tokenRiskFindings(report: TokenRiskReport): Finding[] {
  return report.flags.map((flag) => ({
    id: `token-risk-${flag}`,
    severity: flagSeverity(flag),
    title: flag.replace(/_/g, " "),
    description: `Dedaub TokIn flag: ${flag}`,
    source: "dedaub",
  }));
}

function flagSeverity(flag: string): Finding["severity"] {
  const high = ["is_honeypot", "owner_can_mint", "hidden_mint", "can_take_ownership"];
  if (high.includes(flag)) return "high";
  return "medium";
}
