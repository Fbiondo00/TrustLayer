/**
 * Pipeline dispatcher — picks the right orchestrator per chain.
 *
 * EVM chains (ethereum / base / arbitrum / optimism) run the 8-step pipeline
 * (Slither + Dedaub + permissions + TX + approvals + AI). Solana runs the
 * 5-step Solana-flavored pipeline (authority + TX history + SPL approvals +
 * verification + AI). Both yield the
 * same `PipelineEvent` shape so the web/MCP/CLI surfaces don't need per-chain
 * code paths.
 */

import type { ChainId, AnalysisInput, PipelineEvent } from "@trustlayer/schema";
import { PipelineService } from "./pipeline";
import { SolanaPipelineService } from "./solana/pipeline";

export interface PipelineLike {
  runAnalysis(input: AnalysisInput): AsyncGenerator<PipelineEvent>;
}

export function getPipeline(chain: ChainId): PipelineLike {
  return chain === "solana"
    ? new SolanaPipelineService()
    : new PipelineService();
}
