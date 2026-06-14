/**
 * trustlayer_fix — LLM-generated Solidity patch.
 *
 * Calls LLMClient.generateFix() with the vulnerable source + the findings to
 * patch. Backed by `FixInputSchema` in `@trustlayer/schema`.
 *
 * Returns the patched Solidity source as plain text. When LLM is disabled
 * (`OPENAI_API_KEY` unset), returns an error message — the tool cannot run
 * without an LLM endpoint.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FixInputSchema } from "@trustlayer/schema";
import { LLMClient, RAGService } from "@trustlayer/core";

export function registerFixTool(server: McpServer) {
  server.tool(
    "trustlayer_fix",
    "Generate a Solidity patch for the supplied findings using the LLM client (with RAG context for known SWC patterns). Requires OPENAI_API_KEY (or REDHAT_API_KEY). Returns the patched Solidity source.",
    {
      source_code: FixInputSchema.shape.source_code,
      findings: FixInputSchema.shape.findings,
      attempts: FixInputSchema.shape.attempts,
    },
    async ({ source_code, findings, attempts }) => {
      const llm = new LLMClient();
      if (!llm.isEnabled()) {
        return {
          content: [
            {
              type: "text",
              text: "Error: LLM disabled. Set OPENAI_API_KEY (or REDHAT_API_KEY) to enable trustlayer_fix.",
            },
          ],
          isError: true,
        };
      }

      // Build RAG context from the supplied findings (best-effort, optional).
      let patterns = "";
      try {
        const rag = new RAGService();
        patterns = await rag.buildSemanticContext(
          findings.map((f) => ({
            check: f.check,
            severity: f.severity,
            description: f.description,
          })),
          source_code,
        );
      } catch {
        // RAG failed — continue without context.
      }

      const attemptNote =
        attempts && attempts > 0
          ? `\n\nNote: previous fix attempt #${attempts} failed; please revise.`
          : "";

      const vulnerability = findings
        .map((f) => `${f.severity.toUpperCase()} ${f.check}: ${f.description}`)
        .join("\n");

      try {
        const patched = await llm.generateFix(
          source_code,
          `${vulnerability}${attemptNote}`,
          patterns,
        );
        return {
          content: [{ type: "text", text: patched }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
