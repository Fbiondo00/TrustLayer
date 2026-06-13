/**
 * UI-only helpers + demo data for the landing.
 *
 * Everything that's load-bearing for the calculator or the pipeline lives in
 * `@/lib/schema`. This file re-exports the schema pieces the landing already
 * consumes, plus the demo agent fixtures that don't belong in the schema
 * (they're marketing data, not protocol data).
 */

import {
  GRADE_THRESHOLDS,
  PIPELINE_STEPS,
  SCORE_LAYERS,
  DEFAULT_SCORE_WEIGHTS,
  scoreToGrade,
  type ScoreGrade,
  type GradeMeta,
  type PipelineStepMeta,
} from "./schema";

// UI aliases — keep existing imports working.
export type TrustGrade = ScoreGrade;
export type { ScoreGrade, GradeMeta, PipelineStepMeta } from "./schema";
export const GRADES: readonly GradeMeta[] = GRADE_THRESHOLDS;

export function gradeForScore(score: number): GradeMeta {
  return scoreToGrade(score);
}

// Pipeline aliases — keep existing imports working.
export type PipelineStep = PipelineStepMeta;
export const PIPELINE: readonly PipelineStep[] = PIPELINE_STEPS;

// Re-export the canonical names too, so future code reaches for schema names.
export { GRADE_THRESHOLDS, PIPELINE_STEPS, SCORE_LAYERS, DEFAULT_SCORE_WEIGHTS, scoreToGrade };

// Demo data — marketing fixtures, not protocol data.
export interface DemoAgent {
  name: string;
  address: string;
  grade: TrustGrade;
  score: number;
  summary: string;
  findings: { severity: "high" | "medium" | "low" | "info"; label: string }[];
  good?: boolean;
}

export const DEMO_AGENTS: { evil: DemoAgent; safe: DemoAgent; tokens: DemoAgent[] } = {
  evil: {
    name: "MaliciousAgent",
    address: "0xeV1L…a89c",
    grade: "F",
    score: 20,
    summary: "Unlimited transfer permission, no access control, 4 High-severity findings.",
    findings: [
      { severity: "high", label: "Unlimited ERC20 transfer" },
      { severity: "high", label: "No access control" },
      { severity: "high", label: "Arbitrary external call" },
      { severity: "high", label: "Reentrancy on withdraw" },
    ],
  },
  safe: {
    name: "SafeAgent",
    address: "0x5AfE…77c1",
    grade: "A+",
    score: 97,
    summary: "Audited, limited permissions, withdrawal cap, 24-hour timelock.",
    findings: [
      { severity: "info", label: "Withdrawal cap (1k USDC / day)" },
      { severity: "info", label: "Operator whitelist (3 addresses)" },
      { severity: "info", label: "24h timelock on upgrades" },
      { severity: "info", label: "Pausable by multisig" },
    ],
    good: true,
  },
  tokens: [
    { name: "WETH", address: "0xC02a…6CC2", grade: "A+", score: 100, summary: "Informational findings only.", findings: [] },
    { name: "LINK", address: "0x5149…10AE", grade: "A-", score: 90, summary: "1 Medium finding across 37 detectors.", findings: [{ severity: "medium", label: "Centralized mint authority" }] },
    { name: "USDC", address: "0xA0b8…eB48", grade: "B+", score: 83, summary: "3 Medium findings, audited contracts.", findings: [{ severity: "medium", label: "Blacklist capability" }] },
  ],
};
