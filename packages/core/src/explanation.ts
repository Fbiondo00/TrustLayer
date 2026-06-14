/**
 * Score explainer — template-first explanation of why the score is what it is.
 *
 * Produces the `ScoreExplanation` shape the UI renders at the bottom of every
 * report. Always runs in demo mode (no LLM needed). When the LLM step is
 * enabled (Phase 4 llm.ts), its output replaces `summary` — the structural
 * fields (layers, reasons, recommendations) stay.
 */

import type {
  ExplanationTone,
  ScoreExplanation,
  ScoreExplanationLayer,
} from "@trustlayer/schema";
import type { ApprovalReport } from "@trustlayer/schema";
import type { Finding, PermissionReport, TXReport, TrustScore } from "@trustlayer/schema";
import type { ComponentScores } from "@trustlayer/schema";

export interface ExplainParams {
  score: TrustScore;
  componentScores: ComponentScores;
  findings: Finding[];
  permissions?: PermissionReport;
  txHistory?: TXReport;
  approvals?: ApprovalReport;
  tokenRiskFlags: string[];
  aiAnalysis?: string;
}

export class ScoreExplainer {
  explain(params: ExplainParams): ScoreExplanation {
    const layers = this.buildLayers(params);
    const reasons = this.buildReasons(params);
    const recommendations = this.buildRecommendations(params);
    const verdict = this.buildVerdict(params.score);
    const summary = this.buildSummary(params, verdict);

    return { summary, verdict, layers, reasons, recommendations };
  }

  private buildLayers(params: ExplainParams): ScoreExplanationLayer[] {
    const c = params.componentScores;
    const layers: ScoreExplanationLayer[] = [
      {
        layer: "Slither",
        summary: this.slitherSummary(params.findings, c.slither),
        tone: this.toneForScore(c.slither),
      },
      {
        layer: "Token risk",
        summary: this.dedaubSummary(params.tokenRiskFlags, c.dedaub),
        tone: this.toneForScore(c.dedaub),
      },
      {
        layer: "Permissions",
        summary: this.permissionsSummary(params.permissions, c.permissions),
        tone: this.toneForScore(c.permissions),
      },
      {
        layer: "TX history",
        summary: this.txSummary(params.txHistory, c.txHistory),
        tone: this.toneForScore(c.txHistory),
      },
      {
        layer: "Approvals",
        summary: this.approvalsSummary(params.approvals, c.approvals),
        tone: this.toneForScore(c.approvals),
      },
      {
        layer: "AI intent",
        summary: this.aiSummary(params.aiAnalysis, c.ai),
        tone: this.toneForScore(c.ai),
      },
    ];
    return layers;
  }

  private buildReasons(params: ExplainParams): string[] {
    const reasons: string[] = [];
    const { score, findings } = params;

    if (score.cap_reason === "two_or_more_high") {
      const highCount = findings.filter((f) => f.severity === "high").length;
      reasons.push(
        `Score capped at ${score.score} — ${highCount} High-severity findings trigger the multi-High cap (max F).`,
      );
    } else if (score.cap_reason === "one_high") {
      reasons.push(
        `Score capped at ${score.score} — one High-severity finding triggers the single-High cap (max D).`,
      );
    } else if (score.cap_reason === "slither_not_run") {
      reasons.push(
        `Score capped at ${score.score} — Slither did not run, so the grade cannot exceed B+.`,
      );
    }

    if (score.bonus > 0) {
      reasons.push(
        `Safety bonus +${score.bonus} applied — zero High and zero Medium findings.`,
      );
    }

    const mediums = findings.filter((f) => f.severity === "medium");
    if (mediums.length > 0) {
      reasons.push(
        `${mediums.length} Medium-severity ${mediums.length === 1 ? "finding" : "findings"} dragging the Slither sub-score down.`,
      );
    }

    if (params.tokenRiskFlags.length > 0) {
      reasons.push(
        `Dedaub TokIn flagged ${params.tokenRiskFlags.length} risk ${params.tokenRiskFlags.length === 1 ? "flag" : "flags"}: ${params.tokenRiskFlags.slice(0, 3).join(", ")}.`,
      );
    }

    if (params.permissions && params.permissions.matched.some((m) => m.severity === "high")) {
      const negs = params.permissions.matched.filter((m) => m.severity === "high");
      reasons.push(
        `Permission mapper matched ${negs.length} dangerous ${negs.length === 1 ? "capability" : "capabilities"}: ${negs.map((n) => n.title).join(", ")}.`,
      );
    }

    if (params.approvals && params.approvals.unlimitedCount > 0) {
      reasons.push(
        `${params.approvals.unlimitedCount} unlimited ERC20 ${params.approvals.unlimitedCount === 1 ? "approval" : "approvals"} found in the blast-radius scan.`,
      );
    }

    if (reasons.length === 0) {
      reasons.push("No caps triggered, no High or Medium findings — clean baseline.");
    }
    return reasons;
  }

  private buildRecommendations(params: ExplainParams): string[] {
    const recs: string[] = [];
    const { score, findings } = params;

    const highCount = findings.filter((f) => f.severity === "high").length;
    if (highCount >= 2) {
      recs.push("Do not connect. Multiple High-severity vulnerabilities present.");
    } else if (highCount === 1) {
      recs.push("Review the High-severity finding before connecting.");
    }

    if (params.permissions?.matched.some((m) => m.id === "self_destruct")) {
      recs.push("Remove self-destruct before deploying.");
    }
    if (params.permissions?.matched.some((m) => m.id === "transfer_unlimited")) {
      recs.push("Cap ERC20 transfers with an explicit maximum amount.");
    }
    if (params.permissions?.matched.some((m) => m.id === "no_access_control")) {
      recs.push("Add onlyOwner / AccessControl on sensitive functions.");
    }

    if (params.approvals && params.approvals.unlimitedCount > 0) {
      recs.push("Revoke unlimited ERC20 approvals before connecting.");
    }

    if (recs.length === 0) {
      if (!score.grade) {
        recs.push("Score unavailable — manual review required.");
      } else if (score.grade.startsWith("A")) {
        recs.push("Safe to connect. Run a periodic re-scan to catch regressions.");
      } else if (score.grade === "B+" || score.grade === "B" || score.grade === "B-") {
        recs.push("Connect with caution — review the findings before proceeding.");
      } else {
        recs.push("Do not connect without a deeper audit.");
      }
    }
    return recs;
  }

  private buildVerdict(score: TrustScore): string {
    const grade = score.grade;
    // Defensive — this code is only called from the EVM pipeline which always
    // sets a grade, but TypeScript now allows null (Solana wallet case).
    if (!grade) return "Not scoreable.";
    if (grade.startsWith("A")) return "Connect with confidence.";
    if (grade === "B+" || grade === "B" || grade === "B-") return "Connect with caution.";
    if (grade === "C+" || grade === "C" || grade === "D") return "Review before connecting.";
    return "Do not connect.";
  }

  private buildSummary(params: ExplainParams, verdict: string): string {
    const { score } = params;
    const slitherHigh = params.findings.filter((f) => f.severity === "high").length;
    const slitherMed = params.findings.filter((f) => f.severity === "medium").length;
    // Permission findings aren't in `findings` at calc time — pull them
    // directly from the permission report so the summary reflects them.
    const permHigh = params.permissions?.matched.filter((m) => m.severity === "high").length ?? 0;
    const permMed = params.permissions?.matched.filter((m) => m.severity === "medium").length ?? 0;
    const totalHigh = slitherHigh + permHigh;
    const totalMed = slitherMed + permMed;

    const capClause =
      score.cap_reason === "two_or_more_high"
        ? " capped at F-grade"
        : score.cap_reason === "one_high"
          ? " capped at D-grade"
          : score.cap_reason === "slither_not_run"
            ? " capped at B+ (Slither did not run)"
            : "";

    const bonusClause = score.bonus > 0 ? ` with +${score.bonus} safety bonus` : "";

    const findingClause =
      totalHigh > 0
        ? ` — ${totalHigh} High, ${totalMed} Medium`
        : totalMed > 0
          ? ` — ${totalMed} Medium`
          : " — clean on mechanical detectors";

    return `Grade ${score.grade ?? "N/A"} (${score.score ?? "—"}/100)${capClause}${bonusClause}${findingClause}. ${verdict}`;
  }

  // ─── Layer summaries ────────────────────────────────────────────────

  private slitherSummary(findings: Finding[], score: number): string {
    if (findings.some((f) => f.id === "slither-not-run")) {
      return "Slither did not run — static analysis unavailable.";
    }
    if (findings.length === 0) return "No Slither findings — all ~90 detectors pass.";
    const high = findings.filter((f) => f.severity === "high").length;
    const med = findings.filter((f) => f.severity === "medium").length;
    const low = findings.filter((f) => f.severity === "low").length;
    const parts: string[] = [];
    if (high) parts.push(`${high} high`);
    if (med) parts.push(`${med} medium`);
    if (low) parts.push(`${low} low`);
    return `${findings.length} finding${findings.length === 1 ? "" : "s"}: ${parts.join(", ") || "informational only"}. Sub-score ${score}/100.`;
  }

  private dedaubSummary(flags: string[], score: number): string {
    if (flags.length === 0) return "No Dedaub TokIn risk flags. Sub-score 100/100.";
    return `${flags.length} risk flag${flags.length === 1 ? "" : "s"}: ${flags.slice(0, 3).join(", ")}${flags.length > 3 ? `, +${flags.length - 3} more` : ""}. Sub-score ${score}/100.`;
  }

  private permissionsSummary(report: PermissionReport | undefined, score: number): string {
    if (!report) return "Permission mapper did not run.";
    if (report.matched.length === 0) return "No permission patterns matched. Sub-score 100/100.";
    const negs = report.matched.filter((m) => !m.id.match(/limited_withdrawal|whitelist|time_lock|multi_sig|reentrancy_guard|ownable/));
    const pos = report.matched.filter((m) => m.id.match(/limited_withdrawal|whitelist|time_lock|multi_sig|reentrancy_guard|ownable/));
    const parts: string[] = [];
    if (negs.length) parts.push(`${negs.length} dangerous`);
    if (pos.length) parts.push(`${pos.length} positive`);
    return `${parts.join(", ")} pattern${report.matched.length === 1 ? "" : "s"}. Sub-score ${score}/100.`;
  }

  private txSummary(report: TXReport | undefined, score: number): string {
    if (!report || report.empty) return "No on-chain history to analyze.";
    const m = report.metrics;
    const anomCount = report.anomaly_flags.length;
    const anomClause = anomCount > 0 ? ` ${anomCount} anomal${anomCount === 1 ? "y" : "ies"}` : "";
    return `${m.total_transactions} txs over ${m.days_active} day${m.days_active === 1 ? "" : "s"}, ${Math.round(m.success_rate * 100)}% success${anomClause}. Sub-score ${score}/100.`;
  }

  private approvalsSummary(report: ApprovalReport | undefined, score: number): string {
    if (!report || report.empty) return "No active ERC20 approvals.";
    const unbounded = report.unlimitedCount;
    return `${report.allowances.length} approval${report.allowances.length === 1 ? "" : "s"} across ${report.tokenCount} token${report.tokenCount === 1 ? "" : "s"}${unbounded > 0 ? ` — ${unbounded} unlimited` : ""}. Sub-score ${score}/100.`;
  }

  private aiSummary(analysis: string | undefined, score: number): string {
    if (!analysis || analysis.trim().length === 0) {
      return "AI analysis not available — showing mechanical-only summary.";
    }
    return analysis.slice(0, 200) + (analysis.length > 200 ? "…" : "");
  }

  private toneForScore(score: number): ExplanationTone {
    if (score >= 80) return "safe";
    if (score >= 50) return "caution";
    return "danger";
  }
}
