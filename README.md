# TrustLayer

> **Credit score for AI agents.** The wallet-agnostic preflight check before you connect.

TrustLayer runs an 8-step mechanical analysis pipeline on any AI agent smart contract and produces a trust grade from A+ to F — like a credit score, but for code.

**Mechanical first, AI explains.** Detection runs on Slither + Dedaub + on-chain data. AI only translates findings into plain English.

---

## Architecture — pnpm monorepo, one orchestrator, three thin clients

This repo is a **pnpm workspace** mirroring the canonical orchestrator structure: a single shared core (`@trustlayer/core`) consumed by three thin client surfaces — web, MCP server, and CLI. No security logic lives in the clients.

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
       │  web        │   │  mcp-server  │   │  cli         │
       │  Next.js    │   │  Claude Code │   │  analyze     │
       │  SSR+actions│   │  Cursor      │   │  replay      │
       │  Landing +  │   │  Windsurf    │   │  fix         │
       │  /scanner   │   │              │   │              │
       │ THIN CLIENT │   │ THIN CLIENT  │   │ THIN CLIENT  │
       └─────────────┘   └──────────────┘   └──────────────┘
```

**Golden rule:** No security logic in the client surfaces. Everything — Slither invocation, Dedaub API calls, permission regex, scoring, cap logic — lives in `packages/core/src/` (the canonical orchestrator, package `@trustlayer/core`).

### Repo layout

```
trustlayer/
├── packages/
│   ├── schema/         Types + Zod + constants (single source of truth)
│   ├── core/           The 8-step orchestrator + services (the security engine)
│   ├── web/            Next.js 16 app — landing + /scanner
│   ├── mcp-server/     MCP server — Claude Code / Cursor / Windsurf
│   ├── cli/            CLI — terminal / CI / scripts
│   └── contracts/      Foundry demo contracts (MaliciousAgent, SafeAgent, …)
├── docs/               Architecture, demo script, CLI/MCP reference
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

### The 8-step pipeline

1. **Fetch Contract** — bytecode from chain via Etherscan V2 (if address input)
2. **Decompile** — Dedaub Decompiler API (if source not verified)
3. **Vulnerability Scan** — Slither with ~90 detectors
4. **Token Risk** — Dedaub TokIn API (12 canonical risk flags)
5. **Permission Mapping** — 12 regex patterns (6 negative, 6 positive)
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

The scanner reproduces these grades deterministically — the demo fixtures don't need any env keys:

| Input | Score | Grade | Notes |
|---|---|---|---|
| `MaliciousAgent.sol` (demo) | 20/100 | F | 4 High findings → cap-20 |
| `SafeAgent.sol` (demo) | 97/100 | A+ | 0 H + 0 M → +15 safety bonus |
| USDC mainnet `0xA0b8…eB48` | 83/100 | B+ | 3 Medium `constant-function-asm` |
| WETH mainnet `0xC02a…6Cc2` | 100/100 | A+ | clean run |
| LINK mainnet `0x5149…86CA` | 90/100 | A- | 1 Medium `shadowing-abstract` |

Reproduce the demo fixtures from the scanner page (`/scanner` → "Try MaliciousAgent" / "Try SafeAgent") or programmatically:

```bash
pnpm fixtures
```

See [`docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) for the full phased implementation plan.

---

## Stack

- **Framework** Next.js 16 (App Router, RSC, Turbopack)
- **UI** React 19 + TypeScript 5 + Tailwind CSS v4
- **3D** React Three Fiber + three.js (hero scene)
- **Motion** Framer Motion (entrance / interaction)
- **Pipeline** viem, OpenAI SDK, Slither (Python subprocess), Dedaub API

## Develop

```bash
pnpm install
pnpm dev            # turbo dev — boots all clients
pnpm web            # web only
pnpm mcp            # mcp-server only
pnpm cli            # cli only (prints help)
pnpm typecheck      # all packages
```

Open [http://localhost:3000](http://localhost:3000). The scanner lives at [/scanner](http://localhost:3000/scanner).

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

Slither requires Python on the host:

```bash
pip3 install --user slither-analyzer solc-select
solc-select install 0.8.20 && solc-select use 0.8.20
```

### Demo flow (no env keys needed)

```bash
pnpm dev
# open http://localhost:3000/scanner
# click "Try MaliciousAgent" → F 20/100
# click "Try SafeAgent"      → A+ 97/100
```

### Deploy notes

**Vercel / Netlify / serverless:** the demo path works out of the box — it only uses in-process mechanical analysis (permissions, scoring, explanation). The full pipeline needs Slither and Python on the host, which serverless platforms don't ship. To run Slither in production, deploy on a container runtime (Fly.io, Railway, a Docker host) and install Slither + solc-select in the image.

The `/scanner` route degrades gracefully without env keys — every external service reports `isEnabled() === false`, the pipeline emits an informational `slither-not-run` finding, and the grade caps at B+ (80 max). The demo fixtures (MaliciousAgent F20, SafeAgent A+97) still reproduce exactly because their grades are driven by the permission layer alone.

## License

MIT
