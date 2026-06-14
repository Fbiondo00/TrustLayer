/**
 * Core pipeline + services — single import surface for the rest of the app.
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
export { RAGService } from "./rag";
export { PaymentGate } from "./payment";
export { PipelineService } from "./pipeline";
export { SolanaPipelineService } from "./solana/pipeline";
export { getPipeline } from "./dispatch";
export type { PipelineLike } from "./dispatch";
export { ScoreExplainer } from "./explanation";
export type { ExplainParams } from "./explanation";
export { getEnv, getOptionalEnv, isDemoMode } from "./env";
