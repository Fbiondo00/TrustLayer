/**
 * Permission layer — regex-based pattern matcher over contract source.
 *
 * 6 negative patterns (each subtracts from the layer score) and 6 positive
 * patterns (each adds). The mapper (`src/lib/core/permissions.ts`, Phase 3)
 * walks these against a contract body and emits a PermissionReport.
 */

import type { Finding } from "./finding";

export type PermissionPatternId =
  | "transfer_unlimited"
  | "self_destruct"
  | "owner_drain"
  | "arbitrary_call"
  | "reentrancy_exposed"
  | "no_access_control"
  | "limited_withdrawal"
  | "whitelist"
  | "time_lock"
  | "multi_sig"
  | "reentrancy_guard"
  | "ownable";

export type PermissionRiskLevel = "safe" | "caution" | "danger";

export interface PermissionPattern {
  id: PermissionPatternId;
  /** Positive = adds to score, negative = subtracts. */
  delta: number;
  /** Regex source string. Flags always include "i" (case-insensitive). */
  pattern: string;
  severity: "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  /** Whether finding this is a good (true) or bad (false) signal. */
  positive: boolean;
}

export const NEGATIVE_PERMISSIONS: readonly PermissionPattern[] = [
  {
    id: "transfer_unlimited",
    delta: -30,
    pattern: "\\.transfer\\s*\\(",
    severity: "high",
    title: "Unlimited ERC20 transfer",
    description: "Contract can move tokens without an upper bound.",
    positive: false,
  },
  {
    id: "self_destruct",
    delta: -25,
    pattern: "selfdestruct|suicide",
    severity: "high",
    title: "Self-destruct present",
    description: "Contract can be destroyed, destroying balances with it.",
    positive: false,
  },
  {
    id: "owner_drain",
    delta: -25,
    pattern: "onlyOwner[^;]{0,80}withdraw|withdraw[^;]{0,80}onlyOwner",
    severity: "high",
    title: "Owner can drain",
    description: "Owner-only withdrawal path with no cap.",
    positive: false,
  },
  {
    id: "arbitrary_call",
    delta: -20,
    pattern: "delegatecall|\\.call\\s*\\(",
    severity: "high",
    title: "Arbitrary external call",
    description: "Contract can call any address with arbitrary calldata.",
    positive: false,
  },
  {
    id: "reentrancy_exposed",
    delta: -15,
    pattern: "\\.call\\s*\\{?value:",
    severity: "medium",
    title: "Reentrancy exposure",
    description: "External call with value transfer without a reentrancy guard.",
    positive: false,
  },
  {
    id: "no_access_control",
    delta: -20,
    pattern: "function\\s+(transfer|withdraw|mint|execute|sweep|drain)\\s*\\([^)]{0,200}\\)\\s*public",
    severity: "high",
    title: "No access control",
    description: "Sensitive function is publicly callable.",
    positive: false,
  },
] as const;

export const POSITIVE_PERMISSIONS: readonly PermissionPattern[] = [
  {
    id: "limited_withdrawal",
    delta: 15,
    pattern: "withdrawal|withdraw[A-Z][a-z]*|maxWithdraw|DAILY|WITHDRAWAL_CAP|LIMIT",
    severity: "info",
    title: "Limited withdrawal",
    description: "Withdrawal is bounded by an explicit cap.",
    positive: true,
  },
  {
    id: "whitelist",
    delta: 15,
    pattern: "whitelist|allowlist|isWhitelisted|allowed",
    severity: "info",
    title: "Operator whitelist",
    description: "Only whitelisted addresses can act.",
    positive: true,
  },
  {
    id: "time_lock",
    delta: 10,
    pattern: "timelock|TIME_LOCK|delay[^a-zA-Z]{0,4}upgrade",
    severity: "info",
    title: "Timelock",
    description: "Sensitive actions are delayed by a timelock.",
    positive: true,
  },
  {
    id: "multi_sig",
    delta: 10,
    pattern: "multisig|multiSig|\\.length\\s*>=\\s*[2-9]",
    severity: "info",
    title: "Multi-sig control",
    description: "Critical actions require multiple signers.",
    positive: true,
  },
  {
    id: "reentrancy_guard",
    delta: 10,
    pattern: "nonReentrant|_nonReentrant|REENTRANCY",
    severity: "info",
    title: "Reentrancy guard",
    description: "ReentrancyGuard applied on state-changing functions.",
    positive: true,
  },
  {
    id: "ownable",
    delta: 5,
    pattern: "onlyOwner|Ownable|_owner",
    severity: "info",
    title: "Ownable",
    description: "Ownership model in place for privileged calls.",
    positive: true,
  },
] as const;

export interface PermissionReport {
  /** Final 0-100 score for this layer. */
  score: number;
  risk_level: PermissionRiskLevel;
  /** Patterns that matched, with delta applied. */
  matched: Finding[];
  /** Pattern ids that fired. */
  matched_ids: PermissionPatternId[];
  /** Per-pattern contributions. */
  deltas: Partial<Record<PermissionPatternId, number>>;
  /** Source that was scanned (so consumers know what was analyzed). */
  source_type: "source" | "bytecode" | "decompiled";
  /** Whether anything matched at all. */
  empty: boolean;
}
