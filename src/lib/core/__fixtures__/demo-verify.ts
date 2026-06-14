/**
 * Demo target verifier — runs MaliciousAgent + SafeAgent through the pipeline
 * and asserts the canonical verified grades:
 *
 *   MaliciousAgent → F 20/100  (4 High findings trigger cap-20)
 *   SafeAgent      → A+ 97/100 (0 H + 0 M, +15 safety bonus)
 *
 * Run: pnpm tsx src/lib/core/__fixtures__/demo-verify.ts
 */

import { PipelineService } from "@/lib/core/pipeline";
import {
  MALICIOUS_AGENT_SOURCE,
  SAFE_AGENT_SOURCE,
} from "@/lib/core/demo";
import type { AnalysisInput, AnalysisResult } from "@/lib/schema";

async function runOne(
  name: string,
  source: string,
  expected: { grade: string; score: number },
): Promise<void> {
  const input: AnalysisInput = {
    input_type: "source",
    chain: "ethereum",
    source,
    name,
  };
  const pipeline = new PipelineService();
  let result: AnalysisResult | undefined;
  for await (const event of pipeline.runAnalysis(input)) {
    if (event.step === 0 && event.result) result = event.result;
  }
  if (!result) {
    console.error(`FAIL: ${name} — no result`);
    process.exitCode = 1;
    return;
  }
  const ok =
    result.score.grade === expected.grade &&
    result.score.score === expected.score;
  console.log(
    `${ok ? "PASS" : "FAIL"}: ${name} → ${result.score.grade} ${result.score.score}/100 (expected ${expected.grade} ${expected.score}/100)` +
      ` — cap=${result.score.cap_reason ?? "none"}, bonus=+${result.score.bonus}`,
  );
  if (!ok) {
    const counts = { high: 0, medium: 0, low: 0, informational: 0, optimization: 0 };
    for (const f of result.findings) counts[f.severity]++;
    console.log(
      `  findings: H=${counts.high} M=${counts.medium} L=${counts.low} I=${counts.informational} O=${counts.optimization}`,
    );
    console.log(`  perm matched: ${result.permissions?.matched_ids.join(", ")}`);
    process.exitCode = 1;
  }
}

async function main() {
  await runOne("MaliciousAgent", MALICIOUS_AGENT_SOURCE, { grade: "F", score: 20 });
  await runOne("SafeAgent", SAFE_AGENT_SOURCE, { grade: "A+", score: 97 });
}

void main();
