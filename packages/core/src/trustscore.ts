/**
 * Trust score calculator — the composite-blend heart of the pipeline.
 *
 * Six mechanical layers each produce a 0-100 sub-score. The calculator blends
 * them with `DEFAULT_SCORE_WEIGHTS`, applies the safety bonus (0 H + 0 M → +15),
 * then applies security caps:
 *   - 2+ High findings → 20 (F max)
 *   - 1 High finding   → 44 (D max)
 *   - `slither-not-run` finding present → 80 (B+ max)
 *
 * Verified targets (must reproduce on the canonical inputs):
 *   - MaliciousAgent → F 20  (4 High → cap-20)
 *   - SafeAgent      → A+ 97 (0 H + 0 M → +15 bonus, only Informational noise)
 *   - USDC mainnet   → B+ 83 (3 Medium `constant-function-asm`)
 *   - WETH mainnet   → A+ 100 (only Informational findings)
 *   - LINK mainnet   → A- 90 (1 Medium `shadowing-abstract`)
 *
 * Ported from `packages/core/src/trustscore.ts` in the NapulETH orchestrator.
 */

import {
  DEFAULT_SCORE_WEIGHTS,
  SCORE_CAPS,
  SAFETY_BONUS,
  SLITHER_LEGACY_DETECTOR_DOWNGRADES,
  SLITHER_PENALTY,
  scoreToGrade,
} from "@trustlayer/schema";
import type {
  Finding,
  ScoreCapReason,
  ScoreLayerId,
  TrustScore,
} from "@trustlayer/schema";
import type {
  ComponentScores,
  DetailedScoreResult,
  ScoreCalcParams,
} from "@trustlayer/schema";

const NEUTRAL = 50;

export class TrustScoreCalculator {
  calculate(params: ScoreCalcParams): TrustScore {
    return this.calculateWithDetails(params).score;
  }

  calculateWithDetails(params: ScoreCalcParams): DetailedScoreResult {
    // Downrank legacy-pattern Slither detectors (constant-function-asm on EIP-1967
    // proxies, shadowing-local on constructor params, etc.) so audited contracts
    // like USDC's FiatTokenProxy aren't dragged 30+ points by cosmetic findings.
    const findings = params.findings.map((f) => {
      if (f.source !== "slither") return f;
      const downgrade = SLITHER_LEGACY_DETECTOR_DOWNGRADES[f.detector ?? f.id];
      return downgrade ? { ...f, severity: downgrade } : f;
    });

    const slitherScore = this.calculateSlitherScore(findings);
    const dedaubScore = this.calculateDedaubScore(params.tokenRiskFlags ?? []);
    const permScore = params.permissionScore ?? NEUTRAL;
    const txScore = params.txScore ?? NEUTRAL;
    const apprScore = params.approvalScore ?? NEUTRAL;
    const aiScore = params.aiScore ?? NEUTRAL;

    const weights = DEFAULT_SCORE_WEIGHTS;
    const composite =
      (slitherScore * weights.slither +
        dedaubScore * weights.dedaub +
        permScore * weights.permissions +
        txScore * weights.txHistory +
        apprScore * weights.approvals +
        aiScore * weights.ai) /
      100;

    const hasHighOrMedium = findings.some(
      (f) => f.severity === "high" || f.severity === "medium",
    );
    const bonus = hasHighOrMedium ? 0 : SAFETY_BONUS;
    const compositeWithBonus = composite + bonus;

    const highCount = findings.filter((f) => f.severity === "high").length;
    const slitherNotRun = findings.some((f) => f.id === "slither-not-run");

    let cap: number | undefined;
    let capReason: ScoreCapReason = null;
    if (highCount >= 2) {
      cap = SCORE_CAPS.twoOrMoreHigh;
      capReason = "two_or_more_high";
    } else if (highCount === 1) {
      cap = SCORE_CAPS.oneHigh;
      capReason = "one_high";
    } else if (slitherNotRun) {
      cap = SCORE_CAPS.slitherNotRun;
      capReason = "slither_not_run";
    }
    const capped = cap !== undefined ? Math.min(compositeWithBonus, cap) : compositeWithBonus;
    const score = Math.round(Math.max(0, Math.min(100, capped)));

    const trustScore: TrustScore = {
      score,
      grade: scoreToGrade(score).grade,
      layer_scores: {
        slither: slitherScore,
        dedaub: dedaubScore,
        permissions: permScore,
        txHistory: txScore,
        approvals: apprScore,
        ai: aiScore,
      },
      weights: weights as Partial<Record<ScoreLayerId, number>>,
      bonus,
      cap_reason: capReason,
    };

    const componentScores: ComponentScores = {
      slither: slitherScore,
      dedaub: dedaubScore,
      permissions: permScore,
      txHistory: txScore,
      approvals: apprScore,
      ai: aiScore,
    };

    return { score: trustScore, componentScores };
  }

  /**
   * Slither sub-score. Starts at 100 and subtracts penalties per finding.
   * If `slither-not-run` is present (binary/solc/source issue), returns 75 —
   * honestly pack the uncertainty into the score so a mainnet contract where
   * Slither didn't fire doesn't claim A+ 100/100.
   */
  private calculateSlitherScore(findings: Finding[]): number {
    if (findings.some((f) => f.id === "slither-not-run")) return 75;
    let penalty = 0;
    for (const f of findings) {
      penalty += Math.abs(SLITHER_PENALTY[f.severity] ?? -5);
    }
    return Math.max(0, 100 - penalty);
  }

  /**
   * Dedaub TokIn sub-score. Each risk flag subtracts 8 points.
   */
  private calculateDedaubScore(flags: string[]): number {
    const PENALTY_PER_FLAG = 8;
    return Math.max(0, 100 - flags.length * PENALTY_PER_FLAG);
  }
}
