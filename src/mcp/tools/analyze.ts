/**
 * trustlayer_analyze — full 8-step pipeline.
 *
 * Input shape adapted from NapulETH (single `input_data` string) to
 * TrustLayer's `AnalysisInput` (separate `address?` / `source?` / `bytecode?`
 * fields, discriminated on `input_type`). The MCP SDK requires a flat Zod
 * object, so the discriminated union is unrolled here.
 *
 * Event consumption also differs: TrustLayer's `PipelineEvent` is flat
 * (`{step, step_id, status, ...}`) — the terminal event carries `result`.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { chainEnum, PIPELINE_STEPS } from "@/lib/schema";
import { PipelineService } from "@/lib/core";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function registerAnalyzeTool(server: McpServer) {
  server.tool(
    "trustlayer_analyze",
    "Full security analysis pipeline: fetch → decompile → Slither → token risk → permission mapping → TX history → wallet approvals → AI analysis → trust score. Input can be Solidity source, bytecode, or a contract address.",
    {
      input_type: z
        .enum(["source", "bytecode", "address"])
        .describe("'source' = Solidity pasted directly, 'bytecode' = hex EVM bytecode, 'address' = deployed 0x… contract"),
      chain: chainEnum.describe("Chain the target lives on"),
      source: z
        .string()
        .min(1)
        .optional()
        .describe("Solidity source code (required when input_type='source')"),
      bytecode: z
        .string()
        .min(1)
        .optional()
        .describe("Hex-encoded EVM bytecode (required when input_type='bytecode')"),
      address: z
        .string()
        .regex(ADDRESS_RE)
        .optional()
        .describe("Deployed contract address (required when input_type='address')"),
      name: z
        .string()
        .optional()
        .describe("Optional human-friendly label for the scan"),
    },
    async ({ input_type, chain, source, bytecode, address }) => {
      const pipeline = new PipelineService();
      const events: Array<{
        step: number;
        id: string;
        name: string;
        status: string;
        message?: string;
        error?: string;
        duration_ms?: number;
      }> = [];
      let result = null;

      for await (const event of pipeline.runAnalysis({
        input_type,
        chain,
        source,
        bytecode,
        address,
      } as never)) {
        if (event.step === 0 && event.status === "done") {
          result = event.result ?? null;
        } else {
          const meta = PIPELINE_STEPS.find((s) => s.step === event.step);
          events.push({
            step: event.step,
            id: event.step_id,
            name: meta?.name ?? event.step_id,
            status: event.status,
            message: event.message,
            error: event.error,
            duration_ms: event.duration_ms,
          });
        }
      }

      return {
        content: [
          { type: "text", text: JSON.stringify({ pipeline: events, result }, null, 2) },
        ],
      };
    },
  );
}
