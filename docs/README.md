# TrustLayer — Docs Index

## What's in this folder

| Doc | For | Use |
|---|---|---|
| [`README.md`](./README.md) | Everyone | Start here — index of every doc |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Engineers, technical judges | 8-step pipeline spec, score math, end-to-end address flow |
| [`PITCH.md`](./PITCH.md) | Pitch readers, judges | Problem, solution, market framing, verified targets |
| [`DEMO.md`](./DEMO.md) | Demoers | 4-minute demo flow on `/scanner` with verified targets |
| [`MAINNET-TESTS.md`](./MAINNET-TESTS.md) | Engineers, sponsors | USDC / WETH / LINK mainnet reproduction — env vars, expected output, failure modes |
| [`CLI.md`](./CLI.md) | CLI users | `trustlayer analyze` / `replay` / `fix` — flags, env vars, CI examples |
| [`MCP.md`](./MCP.md) | MCP users | Claude Code / Cursor / Windsurf install, 7-tool reference, troubleshooting |
| [`SPONSORS.md`](./SPONSORS.md) | Sponsors | Per-sponsor alignment — what we use from each, what we'd love feedback on |
| [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) | Engineers | Phased build plan that produced this architecture |

## The 30-second pitch

TrustLayer is a **trust scoring engine** for AI agents that interact with crypto wallets. Before you connect your wallet to any AI agent, TrustLayer runs an 8-step mechanical pipeline (Slither + Dedaub + permission mapping + TX history + wallet approvals + AI intent) on the contract behind the agent and produces a weighted A+ → F grade.

**Mechanical first, AI explains.** Detection runs on deterministic tools. AI only translates findings into plain English.

## Verified targets

The scanner reproduces these grades deterministically:

| Input | Score | Grade |
|---|---|---|
| `MaliciousAgent.sol` (local demo) | 20/100 | F |
| `SafeAgent.sol` (local demo) | 97/100 | A+ |
| USDC mainnet | 83/100 | B+ |
| WETH mainnet | 100/100 | A+ |
| LINK mainnet | 90/100 | A- |

The two demo fixtures need no env keys — open `/scanner`, click **Try MaliciousAgent** or **Try SafeAgent**, click **Scan**.

## Repo at a glance

```
TrustLayer/                              pnpm monorepo
├── packages/
│   ├── schema/                           @trustlayer/schema — types + constants (single source of truth)
│   ├── core/                             @trustlayer/core — 8-step orchestrator + services (the security engine)
│   │   ├── src/
│   │   │   ├── pipeline.ts               PipelineService.runAnalysis(input)
│   │   │   ├── trustscore.ts             6-layer composite + caps + bonus
│   │   │   ├── permissions.ts            Regex pattern matcher (6 neg + 6 pos)
│   │   │   ├── slither.ts, dedaub.ts     External-API services (env-gated)
│   │   │   ├── etherscan.ts, txhistory.ts, approval-scanner.ts
│   │   │   ├── llm.ts                    OpenAI-compatible gateway (AssistAI / Ollama)
│   │   │   ├── solana/                   Solana pipeline (BPF-focused)
│   │   │   └── __fixtures__/             demo-verify.ts, pipeline-smoke.ts
│   │   └── data/swc-patterns.json        RAG fixture
│   ├── web/                              @trustlayer/web — Next.js 16 app
│   │   └── src/
│   │       ├── app/                      Routes (landing + /scanner)
│   │       │   ├── actions/              Server action driving the pipeline
│   │       │   ├── scanner/              /scanner route
│   │       │   └── page.tsx              Landing (SSR)
│   │       ├── components/               sections/ + scanner/ + three/
│   │       └── lib/trust.ts              UI-only grade-color helpers
│   ├── mcp-server/                       @trustlayer/mcp-server — stdio MCP, 7 tools
│   ├── cli/                              @trustlayer/cli — analyze / replay / fix
│   └── contracts/                        Foundry demo contracts (MaliciousAgent, SafeAgent, …)
├── docs/                                 This folder
├── pnpm-workspace.yaml                   Workspace config
├── turbo.json                            Build / dev / typecheck tasks
└── README.md                             Project overview, env matrix, deploy notes
```

## Quick links

- What are we building? → [`PITCH.md`](./PITCH.md)
- How does it work? → [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- How do I demo it? → [`DEMO.md`](./DEMO.md)
- How do I reproduce USDC / WETH / LINK on mainnet? → [`MAINNET-TESTS.md`](./MAINNET-TESTS.md)
- How does it map to sponsor tracks? → [`SPONSORS.md`](./SPONSORS.md)
- How was it built? → [`IMPLEMENTATION.md`](./IMPLEMENTATION.md)
- Env vars and deploy notes → [`../README.md`](../README.md)
