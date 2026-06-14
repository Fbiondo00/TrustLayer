/**
 * Fixture check for the trust-score calculator — proves each cap fires and
 * the safety bonus applies. Run with: `pnpm tsx src/lib/core/__fixtures__/score-fixtures.ts`.
 *
 * Verified expectations:
 *   - 4 High findings          → score 20, grade F    (cap-20)
 *   - 1 High finding           → score ≤ 44, grade D  (cap-44)
 *   - slither-not-run present  → score ≤ 80, grade B+ (cap-80)
 *   - 0 H + 0 M (clean)        → safety bonus applied, score ≥ 95, grade A+
 *   - Informational only       → score 100, grade A+
 */

import { TrustScoreCalculator } from "../trustscore";
import type { Finding, TrustScore } from "@trustlayer/schema";

function makeFinding(
  id: string,
  severity: Finding["severity"],
  source: Finding["source"] = "slither",
): Finding {
  return { id, severity, title: id, source };
}

function run(name: string, calc: () => TrustScore) {
  const r = calc();
  console.log(`${name.padEnd(50)} → ${String(r.score).padStart(3)} / ${r.grade}`);
  return r;
}

function expect(label: string, actual: unknown, expected: unknown) {
  let ok: boolean;
  if (typeof expected === "string" && expected.startsWith("<=")) {
    ok = typeof actual === "number" && actual <= Number(expected.slice(2));
  } else if (typeof expected === "string" && expected.startsWith(">=")) {
    ok = typeof actual === "number" && actual >= Number(expected.slice(2));
  } else {
    ok = actual === expected;
  }
  const sign = ok ? "✓" : "✗";
  console.log(`  ${sign} ${label}: actual=${actual} expected=${expected}`);
  if (!ok) process.exitCode = 1;
}

const calc = new TrustScoreCalculator();

// --- Fixture 1: 4 High findings → cap-20 → F ---
const fourHigh = run("4 High findings (MaliciousAgent-like)", () =>
  calc.calculate({
    findings: [
      makeFinding("reentrancy-eth", "high"),
      makeFinding("arbitrary-send", "high"),
      makeFinding("unprotected-ether-withdrawal", "high"),
      makeFinding("tx-origin", "high"),
    ],
  }),
);
expect("score === 20", fourHigh.score, 20);
expect("grade === F", fourHigh.grade, "F");

// --- Fixture 2: 1 High finding → cap-44 → D ---
const oneHigh = run("1 High finding (one systemic issue)", () =>
  calc.calculate({
    findings: [makeFinding("reentrancy-eth", "high")],
  }),
);
expect("score <= 44", oneHigh.score, "<=44");
expect("grade === D", oneHigh.grade, "D");

// --- Fixture 3: slither-not-run → cap-80 → B+ ---
const slitherNotRun = run("slither-not-run finding present", () =>
  calc.calculate({
    findings: [makeFinding("slither-not-run", "informational", "system")],
  }),
);
expect("score <= 80", slitherNotRun.score, "<=80");
expect("grade <= B+", slitherNotRun.grade, "B+"); // could be B+ or lower

// --- Fixture 4: 0 H + 0 M → +15 bonus → A+ ---
const cleanAudited = run("0 H + 0 M, all-neutral layers (SafeAgent-like)", () =>
  calc.calculate({
    findings: [],
    permissionScore: 90,
    txScore: 90,
    approvalScore: 90,
    aiScore: 90,
  }),
);
expect("score >= 95", cleanAudited.score, ">=95");
expect("grade === A+", cleanAudited.grade, "A+");

// --- Fixture 5: Informational only → A+ 100 ---
const informationalOnly = run("only Informational findings (WETH-like)", () =>
  calc.calculate({
    findings: [makeFinding("solc-version", "informational")],
    permissionScore: 100,
    txScore: 100,
    approvalScore: 100,
    aiScore: 100,
  }),
);
expect("score === 100", informationalOnly.score, 100);
expect("grade === A+", informationalOnly.grade, "A+");

console.log("");
if (process.exitCode) {
  console.log("FAIL: at least one fixture did not match the expected value.");
} else {
  console.log("OK: all fixtures match.");
}
