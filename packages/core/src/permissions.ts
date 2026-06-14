/**
 * Permission mapper — regex-based pattern matcher over contract source.
 *
 * Walks NEGATIVE_PERMISSIONS (6 patterns, total worst-case −135) and
 * POSITIVE_PERMISSIONS (6 patterns, total best-case +65) against the contract
 * body. Score starts at 100 (presumed safe unless proven otherwise), each
 * match adds its delta. Final score is clamped to [0, 100] and bucketed into
 * a risk level.
 *
 * Ported from `packages/core/src/permissions.ts` in the NapulETH orchestrator.
 * Diff vs canonical: schema stores regex as strings (serializable) and the
 * mapper compiles them at construction. Risk level has 3 buckets (safe /
 * caution / danger) instead of 5.
 */

import {
  NEGATIVE_PERMISSIONS,
  POSITIVE_PERMISSIONS,
} from "@trustlayer/schema";
import type {
  Finding,
  PermissionPattern,
  PermissionPatternId,
  PermissionReport,
  PermissionRiskLevel,
} from "@trustlayer/schema";

interface CompiledPattern {
  pattern: PermissionPattern;
  regex: RegExp;
}

export class PermissionMapper {
  private readonly negative: CompiledPattern[];
  private readonly positive: CompiledPattern[];

  constructor() {
    this.negative = NEGATIVE_PERMISSIONS.map((p) => ({
      pattern: p,
      regex: new RegExp(p.pattern, p.flags ?? "i"),
    }));
    this.positive = POSITIVE_PERMISSIONS.map((p) => ({
      pattern: p,
      regex: new RegExp(p.pattern, p.flags ?? "i"),
    }));
  }

  analyze(
    source: string,
    source_type: PermissionReport["source_type"] = "source",
  ): PermissionReport {
    const matched: Finding[] = [];
    const matched_ids: PermissionPatternId[] = [];
    const deltas: Partial<Record<PermissionPatternId, number>> = {};
    let score = 100;

    for (const { pattern, regex } of this.negative) {
      if (regex.test(source)) {
        matched.push(toFinding(pattern));
        matched_ids.push(pattern.id);
        deltas[pattern.id] = pattern.delta;
        score += pattern.delta;
      }
    }

    for (const { pattern, regex } of this.positive) {
      if (regex.test(source)) {
        matched.push(toFinding(pattern));
        matched_ids.push(pattern.id);
        deltas[pattern.id] = pattern.delta;
        score += pattern.delta;
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      risk_level: scoreToRiskLevel(score),
      matched,
      matched_ids,
      deltas,
      source_type,
      empty: matched.length === 0,
    };
  }
}

function toFinding(p: PermissionPattern): Finding {
  return {
    id: p.id,
    severity: p.severity === "info" ? "informational" : p.severity,
    title: p.title,
    description: p.description,
    source: "permissions",
  };
}

function scoreToRiskLevel(score: number): PermissionRiskLevel {
  if (score >= 80) return "safe";
  if (score >= 50) return "caution";
  return "danger";
}
