/**
 * Pipeline smoke fixture — run with `pnpm tsx` to verify the pipeline
 * produces a sensible AnalysisResult on pasted source in demo mode (no env).
 *
 * Expectations:
 *  - 8 step events emitted (some skipped because env keys are absent)
 *  - Final AnalysisResult has permissions + score + explanation
 *  - Score is capped at 80 (Slither didn't run)
 *  - One `slither-not-run` finding is present
 *  - At least one permissions finding is present
 */

import { PipelineService } from "@/lib/core/pipeline";
import type { AnalysisInput, PipelineEvent } from "@/lib/schema";

const MALICIOUS_SNIPPET = `
pragma solidity ^0.8.20;
contract MaliciousAgent {
  address public owner;
  constructor() { owner = msg.sender; }
  function transferUnlimited(address token, address from, address to, uint256 amount) public {
    // calls transfer with totalSupply-equivalent amount
    (bool ok,) = token.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, type(uint256).max));
    require(ok);
  }
  function drain(address token) public {
    // anyone can drain
    uint256 bal = IERC20(token).balanceOf(address(this));
    IERC20(token).transfer(msg.sender, bal);
  }
  function selfdestruct() public {
    selfdestruct(payable(owner));
  }
}
interface IERC20 {
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address a) external view returns (uint256);
}
`;

async function main() {
  const input: AnalysisInput = {
    input_type: "source",
    chain: "ethereum",
    source: MALICIOUS_SNIPPET,
    name: "MaliciousSnippet",
  };
  const pipeline = new PipelineService();
  const events: PipelineEvent[] = [];
  let finalResult: AnalysisInput | null = null;
  for await (const ev of pipeline.runAnalysis(input)) {
    events.push(ev);
    process.stdout.write(
      `step=${ev.step} id=${ev.step_id} status=${ev.status}` +
        (ev.message ? ` msg="${ev.message}"` : "") +
        (ev.error ? ` err="${ev.error}"` : "") +
        (ev.duration_ms !== undefined ? ` ${ev.duration_ms}ms` : "") +
        "\n",
    );
    if (ev.step === 0 && ev.result) {
      finalResult = ev.result as unknown as AnalysisInput;
    }
  }
  const terminal = events.find((e) => e.step === 0);
  if (!terminal?.result) {
    console.error("FAIL: no terminal result");
    process.exit(1);
  }
  const r = terminal.result;
  console.log("\nresult:");
  console.log(JSON.stringify({
    score: r.score.score,
    grade: r.score.grade,
    cap_reason: r.score.cap_reason,
    bonus: r.score.bonus,
    layer_scores: r.score.layer_scores,
    finding_ids: r.findings.map((f) => `${f.source}:${f.id}:${f.severity}`),
    permissions_matched: r.permissions?.matched_ids,
    permissions_score: r.permissions?.score,
    explanation_verdict: r.explanation.verdict,
    explanation_summary: r.explanation.summary,
    metadata_duration_ms: r.metadata.duration_ms,
    metadata_layers_run: r.metadata.layers_run,
  }, null, 2));

  // Assertions
  const checks: Array<[string, boolean]> = [
    ["result present", !!r],
    ["score ≤ 80 (cap)", !!r && r.score.score <= 80],
    ["cap_reason set (slither_not_run)", r.score.cap_reason === "slither_not_run"],
    ["has slither-not-run finding", r.findings.some((f) => f.id === "slither-not-run")],
    ["permissions ran", !!r.permissions],
    ["explanation has verdict", r.explanation.verdict.length > 0],
    ["explanation has 6 layers", r.explanation.layers.length === 6],
  ];
  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
    if (!ok) failed++;
  }
  process.exit(failed === 0 ? 0 : 1);
}

void main();
