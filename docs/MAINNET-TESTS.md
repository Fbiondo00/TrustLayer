# TrustLayer — Mainnet Tests

The scanner reproduces deterministic grades on three real Ethereum mainnet contracts. This doc is the reference for what to scan, what env to set, and what to expect.

The two demo fixtures (`MaliciousAgent`, `SafeAgent`) need no env keys and are documented in [`DEMO.md`](./DEMO.md). This doc is about the **mainnet** path — when env keys are set and Slither is on the host.

---

## Verified targets

| Input | Address | Score | Grade | Top finding | Cap / Bonus |
|---|---|---|---|---|---|
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 83/100 | **B+** | 3 × Medium `constant-function-asm` | no cap, no bonus |
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | 100/100 | **A+** | 6 × Informational (solc-version, low-level-calls) | +15 safety bonus |
| LINK | `0x514910771AF9Ca656af840dff83E8264EcF986CA` | 90/100 | **A-** | 1 × Medium `shadowing-abstract` | no cap, no bonus |

Grade thresholds: A+ ≥97, A ≥93, A- ≥87, B+ ≥80, B ≥73, B- ≥65, C+ ≥55, C ≥45, D ≥35, F <35. Defined in `packages/schema/src/score.ts`.

---

## Where they run

| Surface | Available | Notes |
|---|---|---|
| **Web app** | YES | `/scanner` → select "Deployed address" → paste → Scan |
| **MCP server** | YES | `trustlayer_analyze` tool — same engine, same scores |
| **CLI** | YES | `trustlayer analyze <address>` — same engine, same scores |

All three surfaces live in this monorepo. The MCP server starts with `pnpm mcp` (stdio); the CLI runs with `pnpm cli <command>` (see [`CLI.md`](./CLI.md)). Both consume the same `PipelineService` documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Environment matrix

To run the mainnet path in the web app, set these env vars in `.env.local`:

| Variable | Required | Purpose |
|---|---|---|
| `ETHERSCAN_API_KEY` | yes | Step 1 source fetch (Etherscan V2 unified endpoint) + Step 6 TX history |
| `ETH_RPC_URL` | yes | Step 7 multicall3 approval scan |
| `DEDAUB_API_KEY` | yes | Step 2 decompile (when source unverified) + Step 4 TokIn risk flags |
| `OPENAI_API_KEY` + `OPENAI_BASE_URL` | optional | Step 8 AI intent analysis. Falls back to deterministic `ScoreExplainer` when unset |
| `REDHAT_API_URL` + `REDHAT_API_KEY` | optional | Red Hat / AssistAI LLM gateway (overrides OpenAI vars) |
| `ANALYSIS_MODEL` | optional | Override LLM model id (default: Gemma 4 via AssistAI gateway) |

Plus host dependencies:

```bash
pip3 install --user slither-analyzer solc-select
# solc-select installs the right version per scan automatically
```

Slither + solc-select on the host is **required for B+ or higher**. Without Slither, the pipeline emits a `slither-not-run` informational finding and caps the score at 80 — no mainnet target can score A-range.

---

## Expected output per target

### USDC — `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

- **Source origin:** Etherscan (verified, solc 0.4.24 — auto-selected via `solc-select`)
- **Score / grade:** 83 / **B+**
- **Findings:** 0 High, 3 Medium `constant-function-asm` (an assembly pattern in constant functions — low real-world risk but flagged for transparency), 4 Low, 11 Informational
- **Caps / bonus:** none (Medium findings present, so no +15 bonus; no High, so no cap)
- **TokIn:** clean (USDC is a well-known fiat-backed token)
- **Approvals:** the USDC token contract itself doesn't hold allowances, so Step 7 emits 0 allowances → neutral

### WETH — `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`

- **Source origin:** Etherscan (verified, solc 0.4.18 — auto-selected)
- **Score / grade:** 100 / **A+**
- **Findings:** 0 High, 0 Medium, 0 Low, 6 Informational (`solc-version`, `low-level-calls`, `immutable-states` — all noise)
- **Caps / bonus:** **+15 safety bonus** (0 High AND 0 Medium); no cap
- **TokIn:** clean
- **Approvals:** same as USDC — the WETH contract doesn't hold allowances itself

### LINK — `0x514910771AF9Ca656af840dff83E8264EcF986CA`

- **Source origin:** Etherscan (verified, solc 0.4.24 — auto-selected)
- **Score / grade:** 90 / **A-**
- **Findings:** 0 High, 1 Medium `shadowing-abstract`, 36 Informational
- **Caps / bonus:** none (Medium present, so no bonus; no High, so no cap)
- **TokIn:** clean
- **Approvals:** same — token contract doesn't hold allowances itself

---

## Reproduction in the web app

1. Confirm env vars are set and Slither is installed on the host (see [Environment matrix](#environment-matrix))
2. Start the dev server: `pnpm dev`
3. Open [http://localhost:3000/scanner](http://localhost:3000/scanner)
4. Select input type **Deployed address**
5. Paste one of the addresses above
6. Click **Scan**
7. Watch the 8-step pipeline stream, then read the grade + layer breakdown on the score panel

For each target, the observed grade should match the table at the top of this doc. If it doesn't, see [Failure modes](#failure-modes) below.

### Programmatic reproduction

There is no `mainnet-verify.ts` fixture runner in this repo because it would need real env keys and can't run in CI. To verify a target programmatically against your local env, run the pipeline directly:

```bash
ETHERSCAN_API_KEY=... ETH_RPC_URL=... DEDAUB_API_KEY=... \
  pnpm --filter @trustlayer/core exec tsx -e "
    import { PipelineService } from './src/pipeline';
    const p = new PipelineService();
    const input = { input_type: 'address', chain: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' };
    for await (const e of p.runAnalysis(input)) {
      if (e.step === 0 && e.result) console.log(e.result.score);
    }
  "
```

---

## Reproduction in MCP / CLI

The MCP server exposes the umbrella tool `trustlayer_analyze` with the same input shape:

```json
{
  "tool": "trustlayer_analyze",
  "arguments": {
    "input_type": "address",
    "chain": "ethereum",
    "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  }
}
```

The CLI equivalent:

```bash
pnpm cli analyze 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
pnpm cli replay usdc-token
```

Both produce the same score because they import the same `PipelineService`. See [`CLI.md`](./CLI.md) for the full command reference, or [`.mcp.json.example`](../.mcp.json.example) for MCP server config.

---

## Failure modes

- **Slither not installed / Python missing on host** → Step 3 emits a `slither-not-run` informational finding and the final score is capped at 80 (B+ max). All three mainnet targets land at 80 in this mode. The grade is honest — never graded A+ without static verification.
- **Dedaub TokIn returns HTTP 500** → silently skipped (indistinguishable from "not a token" / outage / bogus key). Step 4's sub-score defaults to 100 (neutral). The pipeline continues.
- **Etherscan rate-limited (HTTP 429)** → Step 1 fails with an informative error. The pipeline stops. Wait and retry, or fall back to the demo fixtures.
- **`OPENAI_API_KEY` unset** → Step 8 falls back to deterministic `ScoreExplainer`. The score is unchanged — AI is translator, not detector.

---

## See also

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — full 8-step pipeline spec, score math, end-to-end address flow
- [`DEMO.md`](./DEMO.md) — 4-minute demo flow (Act 4 covers mainnet)
- [`PITCH.md`](./PITCH.md) — problem, solution, market framing
- [`README.md`](./README.md) — doc index
