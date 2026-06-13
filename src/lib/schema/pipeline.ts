/**
 * Pipeline orchestration types — the 8 steps the scanner runs in order.
 *
 * `PipelineService.runAnalysis(input)` (Phase 5) yields `PipelineEvent`s as
 * each step transitions through pending → running → done | error | skipped.
 * The terminal event carries the full AnalysisResult.
 */

import type { ChainId, AnalysisResult } from "./types";

export type PipelinePhase = "setup" | "scan" | "analyze" | "explain";

export interface PipelineStepMeta {
  /** 1-indexed step number for display ("01 / 08"). */
  step: number;
  /** Stable id used by STEP_PHASE, events, and the orchestrator. */
  id: string;
  name: string;
  blurb: string;
  tool: string;
  /** Score weight (0 for setup steps that don't contribute to the grade). */
  weight: number;
  /** Phase this step belongs to — drives the color story on the landing. */
  phase: PipelinePhase;
  /** True for setup steps (no weight contribution). */
  is_setup: boolean;
}

export const PIPELINE_STEPS: readonly PipelineStepMeta[] = [
  { step: 1, id: "fetch", name: "Fetch contract", weight: 0, blurb: "Pull bytecode + source from any EVM chain.", tool: "viem", phase: "setup", is_setup: true },
  { step: 2, id: "decompile", name: "Decompile", weight: 0, blurb: "Recover Solidity when source isn't verified.", tool: "Dedaub", phase: "setup", is_setup: true },
  { step: 3, id: "slither", name: "Slither scan", weight: 30, blurb: "~90 static vulnerability detectors.", tool: "Trail of Bits", phase: "scan", is_setup: false },
  { step: 4, id: "token", name: "Token risk", weight: 20, blurb: "30+ risk flags from on-chain metadata.", tool: "Dedaub TokIn", phase: "scan", is_setup: false },
  { step: 5, id: "permissions", name: "Permission map", weight: 20, blurb: "9 patterns — 5 negative, 4 positive.", tool: "Heuristics", phase: "analyze", is_setup: false },
  { step: 6, id: "history", name: "TX history", weight: 10, blurb: "Anomaly detection on past calls.", tool: "Etherscan V2", phase: "analyze", is_setup: false },
  { step: 7, id: "approvals", name: "Wallet approvals", weight: 15, blurb: "ERC20 allowance blast radius.", tool: "multicall3", phase: "analyze", is_setup: false },
  { step: 8, id: "ai", name: "AI intent", weight: 5, blurb: "Translates findings into plain English.", tool: "Gemma 4", phase: "explain", is_setup: false },
] as const;

export const PIPELINE_PHASES: Record<
  PipelinePhase,
  { id: PipelinePhase; label: string; color: string; rgb: string }
> = {
  setup: { id: "setup", label: "Setup", color: "#a78bfa", rgb: "167,139,250" },
  scan: { id: "scan", label: "Scan", color: "#fb7185", rgb: "251,113,133" },
  analyze: { id: "analyze", label: "Analyze", color: "#60a5fa", rgb: "96,165,250" },
  explain: { id: "explain", label: "Explain", color: "#5eead4", rgb: "94,234,212" },
};

export type PipelineStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface PipelineEvent {
  /** 1-indexed step number that produced this event. */
  step: number;
  /** Stable step id (matches PIPELINE_STEPS[*].id). */
  step_id: string;
  status: PipelineStatus;
  /** Human-readable progress message ("Compiling with solc 0.8.20…"). */
  message?: string;
  /** When status=done or error, the elapsed ms for this step. */
  duration_ms?: number;
  /** Final result, attached only to the terminal event. */
  result?: AnalysisResult;
  /** Error message when status=error. */
  error?: string;
}

/** Pipeline runtime version — bumped when step order or weights change. */
export const PIPELINE_VERSION = "0.1.0";

/** Default per-step timeout (ms) — the orchestrator honors this. */
export const STEP_TIMEOUTS_MS: Record<string, number> = {
  fetch: 10_000,
  decompile: 30_000,
  slither: 120_000,
  token: 15_000,
  permissions: 5_000,
  history: 20_000,
  approvals: 30_000,
  ai: 60_000,
};

/** Chains the pipeline currently supports end-to-end. */
export const SUPPORTED_CHAINS: readonly ChainId[] = [
  "ethereum",
  "base",
  "arbitrum",
  "optimism",
] as const;
