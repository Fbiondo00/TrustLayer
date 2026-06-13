/**
 * Token-risk layer — Dedaub TokIn risk flags for token contracts.
 *
 * When the agent IS a token (or wraps one), TokIn returns 30+ metadata-driven
 * flags: honeypot, buy/sell tax, owner-mint, blacklist capability, proxy,
 * hidden mint, etc. Each flag has a severity; high-severity flags cap the
 * score regardless of other layers.
 */

import type { Finding } from "./finding";

export type TokenRiskFlagId =
  | "is_honeypot"
  | "buy_tax_high"
  | "sell_tax_high"
  | "owner_can_pause"
  | "owner_can_mint"
  | "owner_can_blacklist"
  | "proxy"
  | "hidden_mint"
  | "can_take_ownership"
  | "renounced"
  | "verified_source"
  | "liquidity_locked";

export interface TokenRiskFlagDef {
  id: TokenRiskFlagId;
  severity: "high" | "medium" | "low" | "info";
  positive: boolean;
  title: string;
  description: string;
}

/** Catalog of flags TokIn can return. Phase 4 (dedaub.ts) maps API output to these. */
export const RISK_FLAGS: readonly TokenRiskFlagDef[] = [
  { id: "is_honeypot", severity: "high", positive: false, title: "Honeypot", description: "Buys allowed, sells blocked — funds trapped." },
  { id: "buy_tax_high", severity: "medium", positive: false, title: "High buy tax", description: "Buying incurs an unusually high tax." },
  { id: "sell_tax_high", severity: "medium", positive: false, title: "High sell tax", description: "Selling incurs an unusually high tax." },
  { id: "owner_can_pause", severity: "medium", positive: false, title: "Owner can pause", description: "Owner can freeze transfers." },
  { id: "owner_can_mint", severity: "high", positive: false, title: "Owner can mint", description: "Owner can mint arbitrary supply." },
  { id: "owner_can_blacklist", severity: "medium", positive: false, title: "Owner can blacklist", description: "Owner can block specific addresses." },
  { id: "proxy", severity: "medium", positive: false, title: "Proxy contract", description: "Implementation can be replaced — logic is mutable." },
  { id: "hidden_mint", severity: "high", positive: false, title: "Hidden mint path", description: "Mint logic obscured but reachable." },
  { id: "can_take_ownership", severity: "high", positive: false, title: "Ownership takeable", description: "Ownership can be claimed by anyone." },
  { id: "renounced", severity: "info", positive: true, title: "Ownership renounced", description: "No privileged owner can act." },
  { id: "verified_source", severity: "info", positive: true, title: "Verified source", description: "Source matches deployed bytecode on Etherscan." },
  { id: "liquidity_locked", severity: "info", positive: true, title: "Liquidity locked", description: "LP tokens locked, reducing rug-pull risk." },
] as const;

export interface TokenRiskReport {
  score: number;
  /** Flags that fired. */
  flags: TokenRiskFlagId[];
  findings: Finding[];
  /** Taxes reported by TokIn, when present. */
  buy_tax?: number;
  sell_tax?: number;
  /** Whether this address is a token at all. */
  is_token: boolean;
  /** Honeypot status — always High if true. */
  honeypot: boolean;
  /** True when no flags fired (clean token). */
  empty: boolean;
}
