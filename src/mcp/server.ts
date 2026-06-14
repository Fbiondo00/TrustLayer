#!/usr/bin/env node
/**
 * TrustLayer MCP server — exposes the orchestrator as 7 stdio tools:
 *   trustlayer_analyze      full pipeline (8 steps) → trust score
 *   trustlayer_decompile    Dedaub bytecode → Solidity
 *   trustlayer_token_risk   Dedaub TokIn flags
 *   trustlayer_permissions  12-pattern permission mapper
 *   trustlayer_approvals    ERC20 allowance blast radius
 *   trustlayer_score        score calculator from findings
 *   trustlayer_fix          LLM-generated Solidity patch
 *
 * Adapted from NapulETH `packages/mcp-server/src/index.ts`. Imports reach
 * `@/lib/core` and `@/lib/schema` (single Next.js app, not a pnpm monorepo).
 * Run with `pnpm trustlayer:mcp` (script wired in package.json).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerAnalyzeTool } from "./tools/analyze";
import { registerDecompileTool } from "./tools/decompile";
import { registerTokenRiskTool } from "./tools/token-risk";
import { registerScoreTool } from "./tools/score";
import { registerPermissionsTool } from "./tools/permissions";
import { registerApprovalsTool } from "./tools/approvals";
import { registerFixTool } from "./tools/fix";

const server = new McpServer({
  name: "trustlayer",
  version: "1.0.0",
});

registerAnalyzeTool(server);
registerDecompileTool(server);
registerTokenRiskTool(server);
registerScoreTool(server);
registerPermissionsTool(server);
registerApprovalsTool(server);
registerFixTool(server);

const transport = new StdioServerTransport();

// Top-level await isn't supported in CommonJS output — wrap in an IIFE.
void (async () => {
  await server.connect(transport);
})();
