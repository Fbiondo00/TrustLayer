/**
 * Score grade thresholds, layer weights, and grade → color mapping.
 *
 * Canonical source of truth for:
 * - Which grades exist (A+ through F, with B- and C+ slotting in for finer
 *   resolution in the lower-mid band).
 * - Score ranges per grade.
 * - Display colors per grade (UI uses these to color the score).
 * - Composite-layer weights (Slither 30, Dedaub 20, …).
 *
 * The calculator (`src/lib/core/trustscore.ts`, Phase 2) consumes
 * DEFAULT_SCORE_WEIGHTS. The landing consumes SCORE_LAYERS for its visual.
 */

export type ScoreGrade =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "D"
  | "F";

export type ScoreLayerId =
  // EVM layers
  | "slither"
  | "dedaub"
  | "permissions"
  | "approvals"
  | "txHistory"
  | "ai"
  // Solana layers
  | "authority" // program upgradeable / mint / freeze authority hygiene
  | "verification"; // source verified + audit registry

export interface GradeMeta {
  grade: ScoreGrade;
  min: number;
  max: number;
  color: string;
  glow: string;
  label: string;
}

/**
 * Ordered high → low. The calculator walks this list to find the first grade
 * whose range contains the score. UIs map grade → color via this same table.
 *
 * Caps honored here:
 * - 2+ High    → 20 max → lands in F
 * - 1 High     → 44 max → lands in D (40-49)
 * - no Slither → 80 max → lands in B+ (80-84)
 */
export const GRADE_THRESHOLDS: readonly GradeMeta[] = [
  { grade: "A+", min: 97, max: 100, color: "#a78bfa", glow: "#8b5cf6", label: "Audited" },
  { grade: "A", min: 93, max: 96, color: "#c4b5fd", glow: "#a78bfa", label: "Safe" },
  { grade: "A-", min: 87, max: 92, color: "#5eead4", glow: "#14b8a6", label: "Safe" },
  { grade: "B+", min: 80, max: 86, color: "#a3e635", glow: "#84cc16", label: "Mostly safe" },
  { grade: "B", min: 73, max: 79, color: "#fbbf24", glow: "#f59e0b", label: "Caution" },
  { grade: "B-", min: 65, max: 72, color: "#fbbf24", glow: "#f59e0b", label: "Caution" },
  { grade: "C+", min: 55, max: 64, color: "#f59e0b", glow: "#d97706", label: "Caution" },
  { grade: "C", min: 45, max: 54, color: "#fb923c", glow: "#f97316", label: "Risky" },
  { grade: "D", min: 35, max: 44, color: "#fb923c", glow: "#f97316", label: "Risky" },
  { grade: "F", min: 0, max: 34, color: "#fb7185", glow: "#f43f5e", label: "Danger" },
] as const;

/** Penalty applied to the raw Slither-derived sub-score per finding severity. */
export const SLITHER_PENALTY: Record<
  "high" | "medium" | "low" | "informational" | "optimization",
  number
> = {
  high: -25,
  medium: -10,
  low: -3,
  informational: 0,
  optimization: 0,
};

/**
 * Slither detectors that fire on standard EIP-1967 proxy idioms or legacy
 * OpenZeppelin 0.4.x patterns rather than real exploitable risks. We downrank
 * them one tier (medium → low → informational) so a verified, audited proxy
 * like USDC's FiatTokenProxy doesn't lose 30+ points to cosmetic patterns.
 */
export const SLITHER_LEGACY_DETECTOR_DOWNGRADES: Record<string, "high" | "medium" | "low" | "informational" | "optimization"> = {
  "constant-function-asm": "low", // EIP-1967 storage slot reads use inline asm by design
  "shadowing-local": "informational", // constructor param shadowing is cosmetic
  "incorrect-modifier": "informational", // ifAdmin pattern is intentional for proxies
  "assembly": "informational", // inline assembly is idiomatic in proxies
  "solc-version": "informational", // old solc warning, not a runtime risk
  "deprecated-standards": "informational", // e.g. suicide → selfdestruct rename
  "low-level-calls": "informational", // low-level calls are idiomatic in proxies
  "missing-zero-check": "informational", // rarely exploitable on its own
  "reentrancy-no-eth": "informational", // reentrancy without value is theoretical
  "reentrancy-benign": "informational", // benign reentrancy by Slither's own admission
};

/** Bonus unlocked by 0 High AND 0 Medium findings. */
export const SAFETY_BONUS = 15;

/** Hard caps the calculator may apply to the final score. */
export const SCORE_CAPS = {
  twoOrMoreHigh: 20,
  oneHigh: 44,
  slitherNotRun: 80,
} as const;

export type ScoreCapReason =
  | "two_or_more_high"
  | "one_high"
  | "slither_not_run"
  | null;

export interface ScoreLayerMeta {
  id: ScoreLayerId;
  name: string;
  weight: number;
  tool: string;
  color: string;
  blurb: string;
}

/**
 * Canonical layer catalog — display metadata + weights live here together so
 * the landing visual cannot drift from what the calculator uses.
 */
export const SCORE_LAYERS: readonly ScoreLayerMeta[] = [
  { id: "slither", name: "Slither", weight: 30, tool: "Trail of Bits", color: "#a78bfa", blurb: "~90 static vulnerability detectors." },
  { id: "dedaub", name: "Dedaub TokIn", weight: 20, tool: "Dedaub", color: "#60a5fa", blurb: "12 canonical token risk flags from on-chain metadata." },
  { id: "permissions", name: "Permissions", weight: 20, tool: "Heuristics", color: "#a78bfa", blurb: "9 patterns — 5 negative, 4 positive." },
  { id: "approvals", name: "Wallet approvals", weight: 15, tool: "multicall3", color: "#5eead4", blurb: "ERC20 allowance blast radius across chains." },
  { id: "txHistory", name: "TX history", weight: 10, tool: "Etherscan V2", color: "#fbbf24", blurb: "Anomaly detection on past calls." },
  { id: "ai", name: "AI intent", weight: 5, tool: "Gemma 4", color: "#fb7185", blurb: "Translates findings into plain English." },
] as const;

export const DEFAULT_SCORE_WEIGHTS: Record<ScoreLayerId, number> = SCORE_LAYERS.reduce(
  (acc, layer) => {
    acc[layer.id] = layer.weight;
    return acc;
  },
  // Solana layers default to 0 in the EVM catalog (landing only renders EVM).
  { authority: 0, verification: 0 } as Record<ScoreLayerId, number>,
);

/**
 * Solana layer weights. Different from EVM because Slither/Dedaub don't exist
 * for Solana — risk lives in the authority structure (upgradeable authority,
 * mint/freeze authority) and on-chain behavior instead.
 */
export const SOLANA_SCORE_WEIGHTS: Record<ScoreLayerId, number> = {
  authority: 30,
  verification: 15,
  txHistory: 25,
  approvals: 20,
  ai: 10,
  // EVM layers unused on Solana
  slither: 0,
  dedaub: 0,
  permissions: 0,
};

export function scoreToGrade(score: number): GradeMeta {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    GRADE_THRESHOLDS.find((g) => clamped >= g.min && clamped <= g.max) ??
    GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1]
  );
}
