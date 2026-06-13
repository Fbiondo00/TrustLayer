/**
 * Top-level input + result types that glue the pipeline together.
 *
 * `AnalysisInput` is what every entrypoint (server action, MCP tool, REST
 * handler) accepts. `AnalysisResult` is what the pipeline yields at the end.
 * Individual layers emit typed reports (PermissionReport, TXReport, etc.)
 * that hang off `AnalysisResult`.
 */

import type { ScoreGrade, ScoreLayerId, ScoreCapReason } from "./score";
import type { Finding } from "./finding";
import type { PermissionReport } from "./permission";
import type { TXReport } from "./tx-report";
import type { ApprovalReport } from "./approval";
import type { TokenRiskReport } from "./token-risk";
import type { ScoreExplanation } from "./explanation";

export type InputType = "address" | "source" | "bytecode";

export type ChainId = "ethereum" | "base" | "arbitrum" | "optimism";

export const CHAIN_IDS: readonly ChainId[] = [
  "ethereum",
  "base",
  "arbitrum",
  "optimism",
] as const;

export const CHAIN_LABEL: Record<ChainId, string> = {
  ethereum: "ETH",
  base: "BASE",
  arbitrum: "ARB",
  optimism: "OP",
};

export interface AnalysisInput {
  input_type: InputType;
  chain: ChainId;
  /** Present when input_type=address. */
  address?: string;
  /** Present when input_type=source. */
  source?: string;
  /** Present when input_type=bytecode. */
  bytecode?: string;
  /** Optional human label (e.g. "SafeAgent"). */
  name?: string;
}

export interface TrustScore {
  /** Final 0-100 score after caps + bonus. */
  score: number;
  grade: ScoreGrade;
  /** Per-layer contribution before caps/bonus (0-100 each). */
  layer_scores: Partial<Record<ScoreLayerId, number>>;
  /** Weights used for the composite (sum = 100). */
  weights: Partial<Record<ScoreLayerId, number>>;
  /** Bonus applied (typically +15 for 0 H + 0 M). */
  bonus: number;
  /** Cap applied, if any. Null when no cap was hit. */
  cap_reason: ScoreCapReason;
}

export interface AnalysisMetadata {
  duration_ms: number;
  pipeline_version: string;
  layers_run: ScoreLayerId[];
  layers_skipped: ScoreLayerId[];
  timestamp: string;
}

export interface AnalysisResult {
  input: AnalysisInput;
  score: TrustScore;
  findings: Finding[];
  permissions?: PermissionReport;
  txHistory?: TXReport;
  approvals?: ApprovalReport;
  tokenRisk?: TokenRiskReport;
  explanation: ScoreExplanation;
  metadata: AnalysisMetadata;
}
