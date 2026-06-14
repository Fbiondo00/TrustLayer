/**
 * trustlayer_permissions — 12-pattern permission mapper.
 *
 * Checks for negative capabilities (unlimited transfers, self-destruct, owner
 * drain, arbitrary calls, reentrancy exposure, no access control) and positive
 * patterns (withdrawal limits, whitelists, time-locks, multi-sig).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PermissionsInputSchema } from "@trustlayer/schema";
import { PermissionMapper } from "@trustlayer/core";

export function registerPermissionsTool(server: McpServer) {
  server.tool(
    "trustlayer_permissions",
    "Analyze smart contract source code for dangerous capabilities: unlimited transfers, self-destruct, owner drain, arbitrary calls, reentrancy exposure. Also checks for positive patterns: withdrawal limits, whitelists, time-locks, multi-sig.",
    {
      source_code: PermissionsInputSchema.shape.source_code,
    },
    async ({ source_code }) => {
      const mapper = new PermissionMapper();
      const result = mapper.analyze(source_code);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
