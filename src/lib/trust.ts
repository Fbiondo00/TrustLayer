export type TrustGrade = "A+" | "A" | "A-" | "B+" | "B" | "C" | "D" | "F";

export interface GradeMeta {
  grade: TrustGrade;
  min: number;
  max: number;
  color: string;
  glow: string;
  label: string;
}

export const GRADES: GradeMeta[] = [
  { grade: "A+", min: 95, max: 100, color: "#34d399", glow: "#10b981", label: "Audited" },
  { grade: "A", min: 90, max: 94, color: "#34d399", glow: "#10b981", label: "Safe" },
  { grade: "A-", min: 85, max: 89, color: "#5eead4", glow: "#14b8a6", label: "Safe" },
  { grade: "B+", min: 80, max: 84, color: "#a3e635", glow: "#84cc16", label: "Mostly safe" },
  { grade: "B", min: 70, max: 79, color: "#fbbf24", glow: "#f59e0b", label: "Caution" },
  { grade: "C", min: 55, max: 69, color: "#fbbf24", glow: "#f59e0b", label: "Caution" },
  { grade: "D", min: 40, max: 54, color: "#fb923c", glow: "#f97316", label: "Risky" },
  { grade: "F", min: 0, max: 39, color: "#fb7185", glow: "#f43f5e", label: "Danger" },
];

export function gradeForScore(score: number): GradeMeta {
  return (
    GRADES.find((g) => score >= g.min && score <= g.max) ??
    GRADES[GRADES.length - 1]
  );
}

export interface PipelineStep {
  step: number;
  id: string;
  name: string;
  weight: number;
  blurb: string;
  tool: string;
}

export const PIPELINE: PipelineStep[] = [
  { step: 1, id: "fetch", name: "Fetch contract", weight: 0, blurb: "Pull bytecode + source from any EVM chain.", tool: "viem" },
  { step: 2, id: "decompile", name: "Decompile", weight: 0, blurb: "Recover Solidity when source isn't verified.", tool: "Dedaub" },
  { step: 3, id: "slither", name: "Slither scan", weight: 30, blurb: "~90 static vulnerability detectors.", tool: "Trail of Bits" },
  { step: 4, id: "token", name: "Token risk", weight: 20, blurb: "30+ risk flags from on-chain metadata.", tool: "Dedaub TokIn" },
  { step: 5, id: "permissions", name: "Permission map", weight: 20, blurb: "9 patterns — 5 negative, 4 positive.", tool: "Heuristics" },
  { step: 6, id: "history", name: "TX history", weight: 10, blurb: "Anomaly detection on past calls.", tool: "Etherscan V2" },
  { step: 7, id: "approvals", name: "Wallet approvals", weight: 15, blurb: "ERC20 allowance blast radius.", tool: "multicall3" },
  { step: 8, id: "ai", name: "AI intent", weight: 5, blurb: "Translates findings into plain English.", tool: "Gemma 4" },
];

export interface DemoAgent {
  name: string;
  address: string;
  grade: TrustGrade;
  score: number;
  summary: string;
  findings: { severity: "high" | "medium" | "low" | "info"; label: string }[];
  good?: boolean;
}

export const DEMO_AGENTS: { evil: DemoAgent; safe: DemoAgent; tokens: DemoAgent[] } = {
  evil: {
    name: "MaliciousAgent",
    address: "0xeV1L…a89c",
    grade: "F",
    score: 20,
    summary: "Unlimited transfer permission, no access control, 4 High-severity findings.",
    findings: [
      { severity: "high", label: "Unlimited ERC20 transfer" },
      { severity: "high", label: "No access control" },
      { severity: "high", label: "Arbitrary external call" },
      { severity: "high", label: "Reentrancy on withdraw" },
    ],
  },
  safe: {
    name: "SafeAgent",
    address: "0x5AfE…77c1",
    grade: "A+",
    score: 97,
    summary: "Audited, limited permissions, withdrawal cap, 24-hour timelock.",
    findings: [
      { severity: "info", label: "Withdrawal cap (1k USDC / day)" },
      { severity: "info", label: "Operator whitelist (3 addresses)" },
      { severity: "info", label: "24h timelock on upgrades" },
      { severity: "info", label: "Pausable by multisig" },
    ],
    good: true,
  },
  tokens: [
    { name: "WETH", address: "0xC02a…6CC2", grade: "A+", score: 100, summary: "Informational findings only.", findings: [] },
    { name: "LINK", address: "0x5149…10AE", grade: "A-", score: 90, summary: "1 Medium finding across 37 detectors.", findings: [{ severity: "medium", label: "Centralized mint authority" }] },
    { name: "USDC", address: "0xA0b8…eB48", grade: "B+", score: 83, summary: "3 Medium findings, audited contracts.", findings: [{ severity: "medium", label: "Blacklist capability" }] },
  ],
};
