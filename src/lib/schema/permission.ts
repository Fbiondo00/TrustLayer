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
  /** Regex source string. */
  pattern: string;
  /** Regex flags. Defaults to "i" (case-insensitive). */
  flags?: string;
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
    pattern: "transfer\\s*\\(\\s*(?:msg\\.sender|from)?\\s*,\\s*\\w+\\s*,\\s*(?:balance|amount|_amount|totalSupply|type\\(uint256\\)\\.max)",
    severity: "high",
    title: "Unlimited ERC20 transfer",
    description: "Contract can move tokens without an upper bound.",
    positive: false,
  },
  {
    id: "self_destruct",
    delta: -25,
    pattern: "selfdestruct\\s*\\(|suicide\\s*\\(",
    severity: "high",
    title: "Self-destruct present",
    description: "Contract can be destroyed, destroying balances with it.",
    positive: false,
  },
  {
    id: "owner_drain",
    delta: -25,
    pattern: "onlyOwner[\\s\\S]{0,80}withdraw|withdrawAll|drain|sweep",
    severity: "high",
    title: "Owner can drain",
    description: "Owner-only withdrawal path with no cap.",
    positive: false,
  },
  {
    id: "arbitrary_call",
    delta: -20,
    pattern: "\\.(call|delegatecall)\\s*\\(\\s*\\{",
    severity: "high",
    title: "Arbitrary external call",
    description: "Contract can call any address with arbitrary calldata.",
    positive: false,
  },
  {
    id: "reentrancy_exposed",
    delta: -15,
    pattern: "function\\s+\\w+[^)]*\\)\\s*(?:payable|external|public)\\s*(?!.*nonReentrant)(?!.*ReentrancyGuard)(?!.*_locked)[^{]*\\{[^}]*(?:\\.transfer\\s*\\(|\\.send\\s*\\(|\\.call\\s*\\{)",
    severity: "medium",
    title: "Reentrancy exposure",
    description: "External call with value transfer without a reentrancy guard.",
    positive: false,
  },
  {
    id: "no_access_control",
    delta: -20,
    pattern: "^[\\s]*function\\s+(?:withdraw|drain|execute|sweep|destroy|selfdestruct|kill)\\s*\\([^)]*\\)[^{]*\\b(?:public|external)\\b(?!.*\\bonlyOwner\\b)(?!.*\\bwhenNotPaused\\b)",
    flags: "im",
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
    pattern: "maxWithdrawal|dailyLimit|withdrawLimit|maxAmount|MAX_WITHDRAWAL|WITHDRAWAL_CAP",
    severity: "info",
    title: "Limited withdrawal",
    description: "Withdrawal is bounded by an explicit cap.",
    positive: true,
  },
  {
    id: "whitelist",
    delta: 15,
    pattern: "\\bwhitelist(?:ed)?\\s*\\(|onlyWhitelisted\\b|allowedAddresses\\s*=|isWhitelisted\\s*\\[|require\\s*\\(\\s*whitelisted",
    severity: "info",
    title: "Operator whitelist",
    description: "Only whitelisted addresses can act.",
    positive: true,
  },
  {
    id: "time_lock",
    delta: 10,
    pattern: "timelock|timeLock|lockPeriod|unlockTime|cooldown|TIME_LOCK",
    severity: "info",
    title: "Timelock",
    description: "Sensitive actions are delayed by a timelock.",
    positive: true,
  },
  {
    id: "multi_sig",
    delta: 10,
    pattern: "\\bmulti.?sig\\b|requireMultiple|confirmations\\s*(?:>|>=|==)",
    severity: "info",
    title: "Multi-sig control",
    description: "Critical actions require multiple signers.",
    positive: true,
  },
  {
    id: "reentrancy_guard",
    delta: 10,
    pattern: "ReentrancyGuard|nonReentrant|_notEntered|_status",
    severity: "info",
    title: "Reentrancy guard",
    description: "ReentrancyGuard applied on state-changing functions.",
    positive: true,
  },
  {
    id: "ownable",
    delta: 5,
    pattern: "Ownable|onlyOwner|isOwner",
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
