/**
 * analyze command — runs the 8-step pipeline on the input and prints the result.
 *
 * Adapted from NapulETH CLI:
 * - TrustLayer PipelineEvent is flat (`event.step === 0` + `event.result`).
 * - Input is `{input_type, chain, source?/bytecode?/address?}` not single `input_data`.
 * - Polygon dropped from chain list.
 */

import fs from "fs";
import path from "path";
import { getPipeline } from "@/lib/core";
import type { AnalysisInput, ChainId } from "@/lib/schema";

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string>;
  boolFlags: Set<string>;
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const VALID_CHAINS: readonly ChainId[] = [
  "ethereum",
  "base",
  "arbitrum",
  "optimism",
  "solana",
];

function detectInputType(raw: string, chain: ChainId): "address" | "source" {
  const trimmed = raw.trim();
  const re = chain === "solana" ? SOLANA_ADDRESS_RE : EVM_ADDRESS_RE;
  if (re.test(trimmed)) return "address";
  return "source";
}

function resolveSource(raw: string): string {
  // If the input is a path to an existing file, read it. Otherwise literal source.
  const candidate = path.resolve(process.cwd(), raw);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return fs.readFileSync(candidate, "utf8");
  }
  return raw;
}

export async function analyze(args: ParsedArgs): Promise<void> {
  const raw = args.positional[0];
  if (!raw) {
    console.error("✗ Missing input. Usage: trustlayer analyze <input>");
    process.exit(1);
  }

  const chainArg = (args.flags.chain as ChainId | undefined) ?? "ethereum";
  if (!VALID_CHAINS.includes(chainArg)) {
    console.error(
      `✗ Invalid chain '${chainArg}'. Valid: ${VALID_CHAINS.join(", ")}`,
    );
    process.exit(1);
  }
  const inputType =
    (args.flags.type as "source" | "address" | "bytecode" | undefined) ??
    detectInputType(raw, chainArg);
  const chain = chainArg;

  const input: AnalysisInput =
    inputType === "address"
      ? { input_type: "address", chain, address: raw.trim() }
      : inputType === "bytecode"
        ? { input_type: "bytecode", chain, bytecode: raw.trim() }
        : { input_type: "source", chain, source: resolveSource(raw) };

  if (!args.boolFlags.has("json")) {
    console.log("╔══════════════════════════════════════════════════════════════════╗");
    console.log("║  TrustLayer — Security Orchestrator                              ║");
    console.log("╚══════════════════════════════════════════════════════════════════╝");
    const inputPreview =
      inputType === "address"
        ? input.address
        : input.input_type === "source"
          ? `${(input.source ?? "").length} chars of source`
          : `${(input.bytecode ?? "").length} chars of bytecode`;
    console.log(`▶ input:    ${inputPreview}`);
    console.log(`▶ chain:    ${chain}`);
    console.log(`▶ pipeline: ${chain === "solana" ? "4 steps (Solana)" : "8 steps"} running...\n`);
  }

  const pipeline = getPipeline(input.chain);
  const startedAt = Date.now();
  let finalResult: AnalysisResultMinimal | null = null;

  for await (const event of pipeline.runAnalysis(input)) {
    if (event.step === 0 && event.status === "done") {
      finalResult = (event.result as AnalysisResultMinimal) ?? null;
    } else if (
      !args.boolFlags.has("json") &&
      event.status === "error"
    ) {
      console.error(`  ✗ Step ${event.step} (${event.step_id}): ${event.error}`);
    }
  }

  const elapsed = Date.now() - startedAt;

  if (!finalResult) {
    console.error(`✗ Pipeline produced no result after ${elapsed}ms`);
    process.exit(2);
  }

  if (args.boolFlags.has("json")) {
    console.log(JSON.stringify({ elapsed_ms: elapsed, result: finalResult }, null, 2));
    return;
  }

  const { score, findings, approvals } = finalResult;
  console.log(`────────────────────────────────────────────────────────────────────`);
  console.log(`RESULT`);
  console.log(`────────────────────────────────────────────────────────────────────`);
  console.log(`  Trust Score:   ${score.score}/100 (grade ${score.grade})`);
  console.log(`  Findings:      ${findings.length}`);
  console.log(`  Elapsed:       ${elapsed}ms`);

  if (findings.length > 0) {
    const bySeverity = new Map<string, number>();
    for (const f of findings) {
      const s = (f.severity ?? "unknown").toLowerCase();
      bySeverity.set(s, (bySeverity.get(s) ?? 0) + 1);
    }
    const summary = Array.from(bySeverity.entries())
      .map(([sev, count]) => `${count} ${sev}`)
      .join(", ");
    console.log(`  Severity:      ${summary}`);
  }

  if (approvals && approvals.allowances?.length > 0) {
    console.log(
      `\n  Wallet Approvals: ${approvals.allowances.length} active (${approvals.unlimitedCount} unlimited, risk=${approvals.riskLevel})`,
    );
  } else if (approvals) {
    console.log(`\n  Wallet Approvals: 0 active (risk=${approvals.riskLevel})`);
  }

  if (findings.length > 0) {
    console.log(`\n  Top findings:`);
    for (const f of findings.slice(0, 5)) {
      const desc = (f.description ?? "").slice(0, 100);
      console.log(`    [${f.severity}] ${f.id}: ${desc}`);
    }
    if (findings.length > 5) {
      console.log(`    ... and ${findings.length - 5} more`);
    }
  }
  console.log("");
}

// Minimal structural type — the CLI only reads these fields. Importing the
// full AnalysisResult pulls in every layer's report types, which is overkill
// here. We cast defensively because PipelineService always yields a result
// with this shape on terminal events.
interface AnalysisResultMinimal {
  score: { score: number; grade: string };
  findings: Array<{
    id: string;
    severity: string;
    description?: string;
  }>;
  approvals?: {
    allowances: unknown[];
    unlimitedCount: number;
    riskLevel: string;
  };
}
