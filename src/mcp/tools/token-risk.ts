/**
 * trustlayer_token_risk — Dedaub TokIn flags for a deployed token.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TokenRiskInputSchema } from "@/lib/schema";
import { DedaubClient } from "@/lib/core";

export function registerTokenRiskTool(server: McpServer) {
  server.tool(
    "trustlayer_token_risk",
    "Get token risk flags from the Dedaub TokIn API. Returns 12 canonical risk indicators (honeypot, hidden mint, sell tax, proxy manipulation, etc.).",
    {
      chain: TokenRiskInputSchema.shape.chain,
      address: TokenRiskInputSchema.shape.address,
    },
    async ({ chain, address }) => {
      const dedaub = new DedaubClient();
      const result = await dedaub.tokenRisk(chain, address);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
