/**
 * trustlayer_decompile — Dedaub bytecode → Solidity.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DecompileInputSchema } from "@/lib/schema";
import { DedaubClient } from "@/lib/core";

export function registerDecompileTool(server: McpServer) {
  server.tool(
    "trustlayer_decompile",
    "Decompile EVM bytecode to Solidity using the Dedaub Decompiler API.",
    {
      bytecode: DecompileInputSchema.shape.bytecode,
    },
    async ({ bytecode }) => {
      const dedaub = new DedaubClient();
      const result = await dedaub.decompile(bytecode);
      return {
        content: [{ type: "text", text: result.source }],
      };
    },
  );
}
