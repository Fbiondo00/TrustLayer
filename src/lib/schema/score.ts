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
  | "slither"
  | "dedaub"
  | "permissions"
  | "approvals"
  | "txHistory"
  | "ai";

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
  { id: "dedaub", name: "Dedaub TokIn", weight: 20, tool: "Dedaub", color: "#60a5fa", blurb: "30+ token risk flags from on-chain metadata." },
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
  {} as Record<ScoreLayerId, number>,
);

export function scoreToGrade(score: number): GradeMeta {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    GRADE_THRESHOLDS.find((g) => clamped >= g.min && clamped <= g.max) ??
    GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1]
  );
}
