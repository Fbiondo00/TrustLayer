/**
 * Finding — the atomic unit every layer emits.
 *
 * Slither emits these from its ~90 detectors. Dedaub emits these from its
 * 12 canonical TokIn risk flags. Permissions/TX/approvals emit these from pattern
 * matches. The score calculator counts these by severity to apply caps and
 * penalties; the UI groups these by layer for display.
 */

import type { ScoreLayerId } from "./score";

export type Severity =
  | "high"
  | "medium"
  | "low"
  | "informational"
  | "optimization";

export type FindingSource = ScoreLayerId | "system";

export interface Finding {
  /** Stable identifier — detector name (slither) or pattern id (permissions). */
  id: string;
  severity: Severity;
  title: string;
  description?: string;
  /** Detector that produced this (e.g. "reentrancy-eth", "transfer-unlimited"). */
  detector?: string;
  /** Layer that emitted this finding. */
  source: FindingSource;
  /** Slither confidence — only relevant when source=slither. */
  confidence?: "high" | "medium" | "low";
  /** Code snippet or line reference when available. */
  reference?: string;
}

export const SEVERITY_ORDER: Severity[] = [
  "high",
  "medium",
  "low",
  "informational",
  "optimization",
];

export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

export function countBySeverity(
  findings: readonly Finding[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
    optimization: 0,
  };
  for (const f of findings) counts[f.severity]++;
  return counts;
}
