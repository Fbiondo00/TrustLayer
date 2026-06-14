/**
 * trustlayer_approvals — ERC20 allowance blast radius.
 *
 * Adapted to TrustLayer's ChainId enum (no `polygon`).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApprovalsInputSchema } from "@/lib/schema";
import { ApprovalScanner } from "@/lib/core";

export function registerApprovalsTool(server: McpServer) {
  server.tool(
    "trustlayer_approvals",
    "Scan on-chain ERC20 token approvals granted BY a wallet/contract address. Returns every active allowance to known DEX routers and other whitelisted spenders, flags unlimited approvals (max uint256), and computes an approval risk score. Use this to answer: 'if this agent goes rogue, what can it move?'",
    {
      chain: ApprovalsInputSchema.shape.chain,
      address: ApprovalsInputSchema.shape.address,
    },
    async ({ chain, address }) => {
      const scanner = new ApprovalScanner();
      const report = await scanner.scan(address, chain);
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
      };
    },
  );
}
