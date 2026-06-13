/**
 * Service configuration — describes what each external-API layer needs to
 * run, and whether it's currently enabled.
 *
 * `src/lib/env.ts` (Phase 4) builds a `ServiceConfig` from process.env at
 * startup. Every external service exposes `isEnabled()` that the pipeline
 * orchestrator consults before trying to call it. When disabled, the layer
 * emits an informational finding (or skips entirely) — the pipeline never
 * crashes because a key was missing.
 */

import type { ChainId } from "./types";

export interface SlitherConfig {
  enabled: boolean;
  /** Path to the slither binary (default: "slither"). */
  binary: string;
  /** Per-scan timeout in ms. */
  timeout_ms: number;
}

export interface DedaubConfig {
  enabled: boolean;
  api_key?: string;
}

export interface EtherscanConfig {
  enabled: boolean;
  api_key?: string;
}

export interface ApprovalsConfig {
  enabled: boolean;
  /** Per-chain RPC URLs. Must include every chain in SUPPORTED_CHAINS. */
  rpc_urls: Partial<Record<ChainId, string>>;
}

export interface LLMConfig {
  enabled: boolean;
  api_key?: string;
  /** Custom OpenAI-compatible base URL (e.g. local Ollama). */
  base_url?: string;
  /** Model id (e.g. "gemma3:4b" for Ollama, "gpt-4o-mini" for OpenAI). */
  model: string;
}

export interface ServiceConfig {
  slither: SlitherConfig;
  dedaub: DedaubConfig;
  etherscan: EtherscanConfig;
  approvals: ApprovalsConfig;
  llm: LLMConfig;
}

/** Default config — everything disabled. `src/lib/env.ts` flips these on. */
export const DISABLED_CONFIG: ServiceConfig = {
  slither: { enabled: false, binary: "slither", timeout_ms: 120_000 },
  dedaub: { enabled: false },
  etherscan: { enabled: false },
  approvals: { enabled: false, rpc_urls: {} },
  llm: {
    enabled: false,
    model: "gemma3:4b",
    base_url: "http://localhost:11434/v1",
  },
};
