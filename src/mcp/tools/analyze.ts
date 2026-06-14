/**
 * trustlayer_analyze — full 8-step pipeline.
 *
 * Input shape adapted from NapulETH (single `input_data` string) to
 * TrustLayer's `AnalysisInput` (separate `address?` / `source?` / `bytecode?`
 * fields, discriminated on `input_type`). The MCP SDK takes a flat ZodRawShape
 * (not a discriminated union), so the inline schema is the SDK-facing shape;
 * we then re-parse through `AnalyzeInputSchema` to narrow to the typed union
 * the pipeline expects.
 *
 * Event consumption also differs: TrustLayer's `PipelineEvent` is flat
 * (`{step, step_id, status, ...}`) — the terminal event carries `result`.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AnalyzeInputSchema, chainEnum, PIPELINE_STEPS } from "@/lib/schema";
import { getPipeline } from "@/lib/core";

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
    async (args) => {
      // Narrow the flat MCP args to the typed AnalysisInput union.
      // Throws ZodError if the required field for the variant is missing.
      const input = AnalyzeInputSchema.parse(args);
      const pipeline = getPipeline(input.chain);
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

      for await (const event of pipeline.runAnalysis(input)) {
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
