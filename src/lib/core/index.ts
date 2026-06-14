/**
 * Core pipeline + services — single import surface for the rest of the app.
 *
 * Mirrors `@trustlayer/core` from the NapulETH orchestrator. Phases 2-5 add
 * services one at a time.
 */

export { TrustScoreCalculator } from "./trustscore";
export { PermissionMapper } from "./permissions";
export { SlitherRunner } from "./slither";
export { DedaubClient } from "./dedaub";
export type { DecompilationResult, TokenRiskResult } from "./dedaub";
export { EtherscanClient } from "./etherscan";
export type { FetchedSource } from "./etherscan";
export { TXHistoryAnalyzer } from "./txhistory";
export { ApprovalScanner } from "./approval-scanner";
export { LLMClient } from "./llm";
export { PipelineService } from "./pipeline";
export { ScoreExplainer } from "./explanation";
export type { ExplainParams } from "./explanation";
export { getEnv, getOptionalEnv, isDemoMode } from "./env";
