/**
 * fix command — LLM-patches a vulnerable Solidity contract.
 *
 * Reads source from a file path (or stdin via "-"), optionally reads findings
 * from a JSON file, calls LLMClient.generateFix() with RAG context, writes
 * the patched source to stdout (or to --out <path>).
 */

import fs from "fs";
import path from "path";
import { LLMClient, RAGService } from "@trustlayer/core";
import type { Finding } from "@trustlayer/schema";

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string>;
  boolFlags: Set<string>;
}

interface FindingInput {
  check: string;
  severity: string;
  description: string;
}

export async function fix(args: ParsedArgs): Promise<void> {
  const sourcePath = args.positional[0];
  if (!sourcePath) {
    console.error("✗ Missing source. Usage: trustlayer fix <source.sol>");
    console.error("  Reads from stdin if source is '-'");
    process.exit(1);
  }

  const source =
    sourcePath === "-"
      ? fs.readFileSync(0, "utf8")
      : fs.readFileSync(path.resolve(process.cwd(), sourcePath), "utf8");

  // Findings: explicit JSON file, or derive a minimal "fix everything" entry.
  let findings: FindingInput[] = [];
  if (args.flags.findings) {
    const findingsPath = path.resolve(process.cwd(), args.flags.findings);
    findings = JSON.parse(fs.readFileSync(findingsPath, "utf8")) as FindingInput[];
  }

  const llm = new LLMClient();
  if (!llm.isEnabled()) {
    console.error(
      "✗ LLM disabled. Set OPENAI_API_KEY (or REDHAT_API_KEY) in .env or shell.",
    );
    process.exit(2);
  }

  // Build RAG context — never let this kill the fix.
  let patterns = "";
  try {
    const rag = new RAGService();
    patterns = await rag.buildSemanticContext(
      findings.map((f) => ({
        check: f.check,
        severity: f.severity,
        description: f.description,
      })),
      source,
    );
  } catch {
    // RAG failed — continue without context.
  }

  const attempts = args.flags.attempts ? parseInt(args.flags.attempts, 10) : 0;
  const attemptNote =
    attempts > 0
      ? `\n\nNote: previous fix attempt #${attempts} failed; please revise.`
      : "";

  const vulnerability =
    findings.length > 0
      ? findings
          .map((f) => `${f.severity.toUpperCase()} ${f.check}: ${f.description}`)
          .join("\n")
      : "No specific findings supplied — patch any vulnerabilities you find.";

  if (!args.boolFlags.has("json")) {
    console.log("╔══════════════════════════════════════════════════════════════════╗");
    console.log("║  TrustLayer — LLM Source Patch                                    ║");
    console.log("╚══════════════════════════════════════════════════════════════════╝");
    console.log(`▶ source:   ${sourcePath === "-" ? "stdin" : sourcePath} (${source.length} chars)`);
    console.log(`▶ findings: ${findings.length} supplied`);
    console.log(`▶ rag ctx:  ${patterns.length} chars\n`);
  }

  try {
    const patched = await llm.generateFix(source, `${vulnerability}${attemptNote}`, patterns);

    if (args.flags.out) {
      const outPath = path.resolve(process.cwd(), args.flags.out);
      fs.writeFileSync(outPath, patched);
      if (!args.boolFlags.has("json")) {
        console.log(`✓ Patched source written to ${outPath}`);
      }
    } else {
      process.stdout.write(patched);
      if (!patched.endsWith("\n")) process.stdout.write("\n");
    }
  } catch (err) {
    console.error(
      `✗ LLM fix failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(3);
  }
}

// Suppress unused-import warnings for type-only re-exports.
export type { Finding };
