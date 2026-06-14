/**
 * trustlayer_score — trust score calculator.
 *
 * Accepts findings + optional token-risk flags + optional permissions +
 * optional TX-history sub-score, returns the canonical A+ → F grade. Uses
 * TrustLayer's ScoreInputSchema (already adapted to TrustLayer shapes).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ScoreInputSchema } from "@/lib/schema";
import { TrustScoreCalculator } from "@/lib/core";

export function registerScoreTool(server: McpServer) {
  server.tool(
    "trustlayer_score",
    "Calculate a trust score (A+ to F) from security findings, token risk flags, permissions, and TX history data.",
    {
      findings: ScoreInputSchema.shape.findings,
      token_risk_flags: ScoreInputSchema.shape.token_risk_flags,
      permissions: ScoreInputSchema.shape.permissions,
      tx_score: ScoreInputSchema.shape.tx_score,
    },
    async ({ findings, token_risk_flags, permissions, tx_score }) => {
      const calculator = new TrustScoreCalculator();

      let permissionScore: number | undefined;
      if (permissions && permissions.length > 0) {
        permissionScore = 100;
        for (const p of permissions) {
          permissionScore += p.weight;
        }
        permissionScore = Math.max(0, Math.min(100, permissionScore));
      }

      const result = calculator.calculate({
        findings: findings.map(
          (f: { check: string; severity: string }) => ({
            id: f.check,
            // Score calculator only distinguishes high/medium vs anything else
            // (caps + bonus). Cast defensively — user-supplied severity might
            // use non-canonical strings.
            severity: (["high", "medium", "low", "informational", "optimization"].includes(
              f.severity,
            )
              ? f.severity
              : "informational") as "high" | "medium" | "low" | "informational" | "optimization",
            title: f.check,
            source: "slither" as const,
          }),
        ),
        tokenRiskFlags: token_risk_flags,
        permissionScore,
        txScore: tx_score,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
