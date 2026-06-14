# TrustLayer — Architecture

## Overview

TrustLayer is a **security orchestrator with a thin web client**. All security logic — Slither invocation, Dedaub API calls, permission regex, scoring, cap logic, AI translation — lives in `src/lib/core/`. The web client (`src/app/`, `src/components/`) is a thin surface that consumes the orchestrator through a single Next.js server action.

```
                    ┌─────────────────────────────────┐
                    │   src/lib/core/                  │
                    │   ──────────────────             │
                    │   PipelineService (orchestrator) │
                    │                                  │
                    │   SlitherRunner                  │
                    │   DedaubClient (Decompile+TokIn) │
                    │   PermissionMapper               │
                    │   TXHistoryAnalyzer              │
                    │   ApprovalScanner (multicall3)   │
                    │   LLMClient (OpenAI-compatible)  │
                    │   TrustScoreCalculator           │
                    │   ScoreExplainer                 │
                    └────────────┬─────────────────────┘
                                 │
                                 │  src/app/actions/analyze.ts
                                 │  ("use server" action)
                                 │
                          ┌──────┴──────────────────────┐
                          │     src/app/                │
                          │     Next.js 16 App Router   │
                          │     Landing (SSR)           │
                          │     /scanner (client)       │
                          │     uses useActionState     │
                          └─────────────────────────────┘

src/lib/schema/ — types + constants (single source of truth)
src/lib/trust.ts — grade-color helpers consumed by the UI
```

> **Golden rule:** No security logic in the client. The web client is a surface. Adding a new surface later (MCP server, CLI, Slack bot) means importing from `src/lib/core/` and writing the surface-specific glue — not duplicating detection logic.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server actions drive the pipeline |
| Language | TypeScript (strict) | Zero Python in the codebase |
| UI | React 19 + Tailwind CSS v4 | Design tokens in `globals.css` |
| 3D | React Three Fiber + three.js | Hero scene |
| Motion | Framer Motion | Entrance + interaction |
| Schema | `src/lib/schema/` | Types + constants, no runtime deps |
| Pipeline | `src/lib/core/` | 8-step orchestrator + services |
| Blockchain client | viem | multicall3 for approvals |
| Decompiler / Token risk | Dedaub API | Decompiler + TokIn |
| Static analysis | Slither | Python subprocess, ~90 detectors |
| Source fetch | Etherscan V2 | unified endpoint across chains |
| LLM | OpenAI-compatible | AssistAI Gemma 4 default; Granite via Ollama, OpenAI GPT-4, or Red Hat Sandbox swappable in 30s via `ANALYSIS_MODEL` |

---

## The 8-Step Pipeline

`PipelineService` in `src/lib/core/pipeline.ts` orchestrates 8 steps. Each step emits `pending → running → done | error | skipped` events through an async generator; the terminal event carries the full `AnalysisResult`.

### Step 1: Fetch Contract

If the user provides an on-chain address, fetch the source via Etherscan V2. If verified, the source is used as-is. If unverified, fetch the bytecode and mark for decompilation in Step 2. Skipped when the user pastes Solidity source directly.

### Step 2: Decompile (Dedaub Decompiler)

When the source is not verified, decompile the bytecode via the Dedaub on-demand decompiler API. The resulting pseudo-Solidity becomes the input for the following steps. Skipped when verified source is already available.

### Step 3: Vulnerability Scan (Slither)

Runs Slither with ~90 static detectors. Output: findings tagged by severity — High, Medium, Low, Informational, Optimization.

- **Pragma-driven solc selection:** the runner parses `pragma solidity` from the source, runs `solc-select install <version>` + `solc-select use <version>` before invoking Slither. Without this, mainnet contracts that pin specific solc versions (USDC needs 0.4.24, Uniswap V3 needs 0.7.6) would fail because `solc-select` ships a single global version.
- **Slither-not-run detection:** when Slither cannot start (binary missing, solc unavailable, source uncompilable), the JSON output is never produced. The runner emits an explicit `slither-not-run` informational finding with the stderr attached, so downstream layers know static analysis didn't run. `TrustScoreCalculator` caps the final score at 80 (B+ max) when this finding is present.

### Step 4: Token Risk (Dedaub TokIn)

Checks 12 canonical risk flags on the address when it's an ERC20 token: honeypot, high buy/sell tax, transfer pause, owner mint/burn/blacklist/pause/spend, ownership renounce, hidden owner. Silently skipped when the address isn't a token (Dedaub returns HTTP 500 indistinguishably for non-token, outage, and bogus key).

### Step 5: Permission Mapping

Regex-based scan over 12 patterns (6 negative, 6 positive):

| Negative | Delta | Positive | Delta |
|---|---|---|---|
| `transfer_unlimited` | −30 | `limited_withdrawal` | +15 |
| `self_destruct` | −25 | `whitelist` | +15 |
| `owner_drain` | −25 | `time_lock` | +10 |
| `arbitrary_call` | −20 | `multi_sig` | +10 |
| `reentrancy_exposed` | −15 | `reentrancy_guard` | +10 |
| `no_access_control` | −20 | `ownable` | +5 |

Output: `PermissionReport` with `matched[]`, `risk_level` ("safe" | "caution" | "danger"), and a 0-100 score starting from 50 and applying deltas clamped to [0, 100].

### Step 6: Transaction History (Etherscan V2)

Pulls the agent's transaction history and computes: total transactions, success rate, unique counterparties, days active. Anomaly flags: `recently_created`, `high_failure_rate`, `single_large_drain`. Output: `TXReport` with metrics + anomaly flags + 0-100 score. Skipped on source-only scans.

### Step 7: Wallet Approvals (the blast-radius layer)

Scans ERC20 allowances granted BY the agent's wallet via viem multicall3 against a known token list (USDT, USDC, DAI, WETH, WBTC per chain) and a whitelist of DEX routers (Uniswap, 1inch, Sushiswap, Curve, Aave, Compound).

- Unlimited approval + whitelisted router → −8 (expected for trading)
- Unlimited approval + unknown spender → −20 (**critical red flag**)
- High-value limited approval → −5
- Limited approval → −1

This is the layer that answers *"if this agent goes rogue — or gets prompt-injected — what can it actually move?"* Unlimited approvals to unknown addresses are how prompt-injection attacks land real damage. Skipped on source-only scans (score defaults to 50 — neutral).

### Step 8: AI Intent Analysis

The LLM reads the contract + permissions + TX history + approvals and answers: *"What is this agent designed to do? Does its behavior match its stated purpose? Are there hidden capabilities?"* The LLM is **translator, not detector** — the underlying findings come from the 7 mechanical layers. Hallucination in the explanation does not affect the score. When `OPENAI_API_KEY` is unset, this step falls back to a deterministic `ScoreExplanation` produced by `ScoreExplainer` from the structured findings.

### Final: Trust Score

Weighted composite (weights sum to 1.00):

| Layer | Weight | Input |
|---|---|---|
| Slither (Vulnerability) | 30% | Finding count + severity |
| Dedaub (Token Risk) | 20% | Risk flag count |
| Permissions | 20% | Negative vs positive match deltas |
| TX History | 10% | Anomalies + track record |
| **Wallet Approvals** | **15%** | Unlimited / unknown approvals |
| AI Intent | 5% | Hidden-capability reasoning |

**Security overrides (applied last):**
- 2+ High-severity findings → cap at 20 (F max)
- 1 High finding → cap at 44 (D max)
- `slither-not-run` present → cap at 80 (B+ max)

These guarantees ensure that a contract with multiple confirmed critical vulnerabilities is always graded F, regardless of how well the other layers score. The cap-80 rule prevents false A+ 100/100 when Slither cannot verify the contract.

**Safety bonus:** +15 when zero High AND zero Medium findings. This compensates for the unavoidable Low/Informational noise Slither emits (timestamp, missing-zero-check on parameters) so audited-grade contracts reach A/A+ instead of getting stuck at B/B+.

**Slither penalty weights:** High −25, Medium −10, Low −3. Informational and Optimization = 0 (noise — solc-version, low-level-calls, immutable-states).

---

## End-to-End Address Analysis Flow

When a user submits an on-chain address (e.g. USDC mainnet `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`), `PipelineService.runAnalysis()` orchestrates:

```
INPUT: { input_type: "address", address: "0xA0b8...eB48", chain: "ethereum" }
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Fetch Contract (Etherscan V2)                        │
│   GET /v2/api?chainid=1&module=contract&action=getsourcecode │
│   ├─ Verified contract → source = Solidity blob (mono-file)  │
│   │                       source_origin = "etherscan"        │
│   └─ Unverified     → bytecode via eth_getCode               │
│                       source_origin = "decompiled" (next)    │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼ (if source_origin = "decompiled")
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Decompile (Dedaub Decompiler API)                    │
│   POST /api/on_demand { bytecode } → Solidity pseudo-source  │
│   (SKIPPED se source già verificato da Etherscan)            │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Slither (subprocess, solc auto-selected)             │
│   1. parse pragma → "0.4.24"                                 │
│   2. solc-select install 0.4.24 + solc-select use 0.4.24     │
│   3. execSync: slither <tmpDir>/Contract.sol --json output   │
│   4. parse JSON detectors[] → SlitherFinding[]               │
│   ├─ Success → findings = real detectors                     │
│   └─ Failure (no outputPath) → findings = [slither-not-run]  │
│                                 + cap score at 80 (B+ max)   │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Dedaub TokIn (12 risk flags)                         │
│   GET /api/on_demand/token/<key>/<address>                   │
│   ├─ 200 → flags[] = real risk indicators                    │
│   ├─ 500 → silent skip (non-token / outage / bogus-key)      │
│   └─ 401/403 → throw "auth error — check DEDAUB_API_KEY"     │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Permission Mapping (regex over 12 patterns)          │
│   Output: PermissionReport { matched, risk_level, score }    │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: TX History (Etherscan V2)                            │
│   Metrics: total TX, success_rate, counterparties, days      │
│   Anomalies: recently_created, high_failure_rate,            │
│              single_large_drain                              │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Wallet Approvals (viem multicall3)                   │
│   Per token in DEFAULT_TOKEN_LIST:                           │
│     multicall3.balanceOf + multicall3.allowance per spender  │
│   Classify: unlimited+whitelisted → -8, unlimited+unknown    │
│   → -20 (CRITICAL), high-value limited → -5, limited → -1    │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 8: AI Intent Analysis (OpenAI-compatible LLM)           │
│   Prompt: source + permissions + TX report + approvals       │
│   Fallback: ScoreExplainer (deterministic, no env required)  │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ TRUST SCORE (TrustScoreCalculator.calculateWithDetails)      │
│   composite = slither*0.30 + dedaub*0.20 + perm*0.20 +       │
│               tx*0.10 + approvals*0.15 + ai*0.05             │
│   + 15 safety bonus if 0 High AND 0 Medium                   │
│   Caps:                                                      │
│     2+ High findings → cap 20 (F max)                        │
│     1 High finding    → cap 44 (D max)                       │
│     slither-not-run   → cap 80 (B+ max)                      │
│   grade = scoreToGrade(score)                                │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
OUTPUT: {
  source, source_origin,
  findings: [...],          // folded: slither + permissions + approvals + token
  token_risk: { flags },
  permissions: { matched, risk_level, score },
  tx_history: { metrics, anomaly_flags, score },
  approvals: { allowances, unlimitedCount, riskLevel, score },
  ai_explanation: "...",
  explanation: { summary, verdict, layers, reasons, recommendations },
  score: { score, grade, layer_scores, weights, bonus, cap_reason },
  metadata: { pipeline_version, duration_ms, layers_skipped },
}
```

For USDC mainnet (`0xA0b8...eB48`), the trace resolves as: source verified via Etherscan → Slither with solc 0.4.24 produces 18 findings (3 Medium `constant-function-asm` + 4 Low + 11 Informational) → TokIn 200 with risk flags → permissions clean → TX history clean → 0 wallet approvals (USDC token contract doesn't hold allowances) → AI confirms fiat-backed token behavior → composite 83 → cap-44 NOT triggered (0 High), cap-80 NOT triggered (Slither ran) → final **83 B+**.

---

## Next.js App

### Routes

- `/` — Landing page (server component, SSR for SEO)
- `/scanner` — Scanner interface (server component shell + client component for interactivity)

### Server actions (`src/app/actions/analyze.ts`)

A single `"use server"` action drives the pipeline. It validates the input (input_type, chain, address/source/bytecode), instantiates `PipelineService`, iterates the async generator, accumulates step states, and returns the final `AnalysisState`:

```ts
type AnalysisState = {
  result?: AnalysisResult;
  steps?: PipelineEvent[];
  error?: string;
};

export async function analyze(
  _prev: AnalysisState,
  formData: FormData,
): Promise<AnalysisState>;
```

The client component consumes it via `useActionState`:

```tsx
const [state, formAction, isPending] = useActionState<AnalysisState, FormData>(
  analyze,
  {},
);
```

This pattern replaces SSE / WebSockets. The async generator gives streaming progress, the server action gives the form-action semantics, and `useActionState` gives the reactive client state.

### Graceful degradation

Every external-API service in `src/lib/core/` reads its env vars at construction and exposes `isEnabled(): boolean`. When disabled, the relevant method returns `null` / empty arrays / a synthetic informational finding rather than throwing. The pipeline still completes; the user sees exactly which steps ran and which were skipped, in the pipeline progress strip.

With zero env vars set:

- Paste Solidity source → Step 1 (fetch) skipped (already have source), Step 2 (decompile) skipped, Step 3 (Slither) runs if Python is installed, Steps 4/6/7 skipped (need an on-chain address), Step 8 falls back to deterministic `ScoreExplainer`.
- The score caps at 80 (B+ max) when Slither can't run — and that fact is shown on the result card.

With full env (`DEDAUB_API_KEY`, `ETHERSCAN_API_KEY`, `ETH_RPC_URL`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`):

- The full 8-step pipeline runs against any EVM address. USDC, WETH, and LINK reproduce their canonical verified grades.

---

## Verified targets

The scanner reproduces these grades deterministically. The two demo fixtures need no env keys; the three mainnet targets need `ETHERSCAN_API_KEY`, `ETH_RPC_URL`, `DEDAUB_API_KEY`, and Slither installed on the host.

| Input | Origin | Findings (H/M/L) | Score | Grade | Notes |
|---|---|---|---|---|---|
| `MaliciousAgent.sol` | local source | 4 / 0 / 5 | 20 | **F** | Security override cap-20 (2+ High) |
| `SafeAgent.sol` | local source | 0 / 0 / 3 | 97 | **A+** | Safety bonus +15, no High/Medium |
| USDC mainnet `0xA0b8…eB48` | etherscan | 0 / 3 / 4 | 83 | **B+** | 18 findings total, top `constant-function-asm` (Med) |
| WETH mainnet `0xC02a…6Cc2` | etherscan | 0 / 0 / 0 | 100 | **A+** | 6 findings all Informational, safety bonus legit |
| LINK mainnet `0x5149…86CA` | etherscan | 0 / 1 / 0 | 90 | **A-** | 37 findings total (36 Info + 1 Med `shadowing-abstract`) |

Grade thresholds: A+ ≥95, A ≥90, A- ≥85, B+ ≥80, B ≥74, B- ≥70, C+ ≥60, C ≥50, D ≥40, F <40.

Reproduce the demo fixtures programmatically:

```bash
pnpm tsx src/lib/core/__fixtures__/demo-verify.ts
```

Or in the browser: open `/scanner`, click "Try MaliciousAgent" / "Try SafeAgent", click **Scan**.

---

## Known limitations

- **Multi-file contracts from Etherscan** (Uniswap V3, Curve, Aave) — Etherscan concatenates with `./` imports unresolved; Slither fails. Use mono-file ERC20 for live demos (USDC/WETH/LINK all work).
- **`solc-select` global state** — not thread-safe (single global solc version). Acceptable for serial pipeline; concurrent scans would need per-process isolation.
- **Python on serverless** — Vercel / Netlify / AWS Lambda don't ship Slither or `solc-select`. The pipeline emits `slither-not-run` and caps at B+ (80 max). Documented in the README; full pipeline needs a container runtime (Fly.io, Railway, Docker host).
- **TokIn 500 indistinguishable** — Dedaub's TokIn API returns HTTP 500 indistinguishably for non-token inputs, real outages, and bogus keys. Treated as silent skip; raw `_skipped` marker in the response for debugging.

---

## See also

- [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) — phased build plan that produced this architecture
- [`PITCH.md`](./PITCH.md) — problem, solution, demo flow
- [`DEMO.md`](./DEMO.md) — 4-minute demo script
- [`SPONSORS.md`](./SPONSORS.md) — sponsor-track alignment
