# TrustLayer

> **Credit score for AI agents.** The wallet-agnostic preflight check before you connect.

TrustLayer runs an 8-step mechanical analysis pipeline on any AI agent smart contract and produces a trust grade from A+ to F — like a credit score, but for code.

**Mechanical first, AI explains.** Detection runs on Slither + Dedaub + on-chain data. AI only translates findings into plain English.

---

## Architecture — security orchestrator with three thin clients

This repo is the **web client** of the TrustLayer orchestrator. The two sibling clients (`@trustlayer/mcp-server` for Claude Code / Cursor / Windsurf, `@trustlayer/cli` for terminal / CI) live in a separate monorepo and consume the same orchestrator core.

```
                    ┌─────────────────────────────────┐
                    │   @trustlayer/core              │
                    │   PipelineService (orchestrator) │
                    │   SlitherRunner + DedaubClient   │
                    │   + PermissionMapper + Scanner   │
                    │   + LLMClient + TrustScore       │
                    └────────────┬────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
       ┌──────┴──────┐   ┌───────┴──────┐   ┌───────┴──────┐
       │  THIS REPO  │   │  mcp-server  │   │  cli         │
       │  web        │   │  Claude Code │   │  analyze     │
       │  Next.js    │   │  Cursor      │   │  replay      │
       │  SSR+actions│   │  Windsurf    │   │              │
       │ THIN CLIENT │   │ THIN CLIENT  │   │ THIN CLIENT  │
       └─────────────┘   └──────────────┘   └──────────────┘
```

**Golden rule:** No security logic in the client surfaces. Everything — Slither invocation, Dedaub API calls, permission regex, scoring, cap logic — lives in `@trustlayer/core` (or, in this repo until the npm package lands, in `src/lib/core/` shaped to match the canonical orchestrator).

### The 8-step pipeline

1. **Fetch Contract** — bytecode from chain via Etherscan V2 (if address input)
2. **Decompile** — Dedaub Decompiler API (if source not verified)
3. **Vulnerability Scan** — Slither with ~90 detectors
4. **Token Risk** — Dedaub TokIn API (30+ risk flags)
5. **Permission Mapping** — regex-based dangerous-capability scan
6. **Transaction History** — Etherscan V2 anomaly detection
7. **Wallet Approvals** — viem multicall3 scan of ERC20 allowances (the blast-radius layer)
8. **AI Intent Analysis** — Gemma 4 via AssistAI gateway explains findings (LLM-agnostic)

### Trust score (6-layer weighted composite)

| Layer | Weight |
|---|---|
| Slither (Vulnerability Scan) | 30% |
| Dedaub (Token Risk) | 20% |
| Permission Mapping | 20% |
| Transaction History | 10% |
| Wallet Approvals | 15% |
| AI Intent Analysis | 5% |

**Security overrides:** 2+ High findings cap the score at 20 (F max); 1 High caps at 44 (D max); Slither-not-run caps at 80 (B+ max). Safety bonus +15 when zero High AND zero Medium findings.

### Verified targets

| Input | Score | Grade |
|---|---|---|
| MaliciousAgent.sol (local demo) | 20/100 | F |
| SafeAgent.sol (local demo) | 97/100 | A+ |
| USDC mainnet | 83/100 | B+ |
| WETH mainnet | 100/100 | A+ |
| LINK mainnet | 90/100 | A- |

See [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) for the full phased implementation plan.

---

## Stack

- **Framework** Next.js 16 (App Router, RSC, Turbopack)
- **UI** React 19 + TypeScript 5 + Tailwind CSS v4
- **3D** React Three Fiber + three.js (hero scene)
- **Motion** Framer Motion (entrance / interaction)
- **Pipeline** (planned) viem, OpenAI SDK, Slither (Python subprocess), Dedaub API

## Develop

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Without env vars the landing renders and `/scanner` runs in demo mode against pasted Solidity source (permissions + scoring + explanation live; Slither and external-API steps emit informational findings). With env vars set, address-mode unlocks the full 8-step pipeline.

| Variable | Unlocks |
|---|---|
| `ETHERSCAN_API_KEY` | Etherscan V2 source fetch + TX-history anomalies |
| `BASESCAN_API_KEY` / `ARBISCAN_API_KEY` / `OPTIMISM_API_KEY` | Same, on alt chains (falls back to `ETHERSCAN_API_KEY`) |
| `DEDAUB_API_KEY` | Dedaub on-demand decompilation + TokIn risk flags |
| `ETH_RPC_URL` | Wallet approvals multicall3 (ethereum) |
| `BASE_RPC_URL` / `ARBITRUM_RPC_URL` / `OPTIMISM_RPC_URL` | Same, on alt chains (falls back to `ETH_RPC_URL`) |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | LLM intent analysis (defaults to local Ollama at `http://localhost:11434/v1`) |
| `REDHAT_API_URL` / `REDHAT_API_KEY` | Red Hat / AssistAI gateway for LLM (overrides OpenAI vars) |
| `ANALYSIS_MODEL` / `FIX_MODEL` | Override the LLM models used for analysis and code fixes |

Slither requires Python on the host: `pip3 install --user slither-analyzer solc-select`.

## License

MIT
