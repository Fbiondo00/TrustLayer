/**
 * replay command — reads cached pipeline results and prints them instantly.
 *
 * Useful for stage demos when network/APIs are flaky. Cache file lives at
 * `src/lib/core/__fixtures__/.demo-cache.json` (copied from NapulETH and
 * extended with the local demo fixtures).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

interface ParsedArgs {
  positional: string[];
  flags: Record<string, string>;
  boolFlags: Set<string>;
}

interface CachedResult {
  id: string;
  label: string;
  expectedGrade: string;
  actualGrade: string;
  actualScore: number;
  sourceOrigin: string;
  findingsCount: number;
  topFindings: Array<{ severity: string; check: string; description: string }>;
  approvalsSummary?: {
    count: number;
    unlimitedCount: number;
    riskLevel: string;
    score: number;
  };
  error?: string;
  cachedAt: number;
}

// src/cli/commands/replay.ts → repoRoot = ../../../
function resolveCachePath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  return path.resolve(repoRoot, "src/lib/core/__fixtures__/.demo-cache.json");
}

export async function replay(args: ParsedArgs): Promise<void> {
  const cachePath = resolveCachePath();
  if (!fs.existsSync(cachePath)) {
    console.error(`✗ No cache at ${cachePath}`);
    console.error(`  Run \`pnpm tsx src/lib/core/__fixtures__/demo-verify.ts\` first to verify demo fixtures.`);
    process.exit(1);
  }

  const cache: CachedResult[] = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  if (cache.length === 0) {
    console.error(`✗ Cache is empty.`);
    process.exit(1);
  }

  const filterId = args.positional[0];
  const entries = filterId ? cache.filter((e) => e.id === filterId) : cache;
  if (filterId && entries.length === 0) {
    console.error(
      `✗ No cache entry with id "${filterId}". Available: ${cache.map((e) => e.id).join(", ")}`,
    );
    process.exit(1);
  }

  const cachedDate = new Date(cache[0].cachedAt).toISOString();

  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log(`║  TrustLayer — Cached Demo Results (replay from disk)             ║`);
  console.log(`║  Cached: ${cachedDate}                          ║`);
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  for (const entry of entries) {
    console.log(`\n▶ ${entry.label}`);
    if (entry.error) {
      console.log(`  ✗ UNRELIABLE: ${entry.error}`);
      continue;
    }
    console.log(
      `  score:   ${entry.actualScore}/100 (grade ${entry.actualGrade}) — expected ${entry.expectedGrade}`,
    );
    console.log(`  origin:  ${entry.sourceOrigin}`);
    console.log(`  findings:${entry.findingsCount}`);
    for (const f of entry.topFindings.slice(0, 3)) {
      const desc = (f.description ?? "").slice(0, 80);
      console.log(`    [${f.severity}] ${f.check}: ${desc}`);
    }
    if (entry.approvalsSummary) {
      const a = entry.approvalsSummary;
      console.log(
        `  approvals: ${a.count} active (${a.unlimitedCount} unlimited) — risk=${a.riskLevel}, score=${a.score}/100`,
      );
    }
  }

  console.log(`\nReplay complete — ${entries.length}/${cache.length} entries shown.`);
}
