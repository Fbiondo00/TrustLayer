# TrustLayer — Demo Script (4 minutes)

## Setup

- Next.js app running: `pnpm dev`
- Browser open at http://localhost:3000/scanner
- Two demo fixtures loaded: MaliciousAgent + SafeAgent (one click each)
- (Optional) Three mainnet addresses ready: USDC, WETH, LINK — require env keys

---

## Verified targets

| id | type | input | expected score | expected grade |
|---|---|---|---|---|
| `MaliciousAgent` | local source | `MaliciousAgent.sol` (one-click fixture) | 20 | F |
| `SafeAgent` | local source | `SafeAgent.sol` (one-click fixture) | 97 | A+ |
| `USDC` | address (mainnet) | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 83 | B+ |
| `WETH` | address (mainnet) | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | 100 | A+ |
| `LINK` | address (mainnet) | `0x514910771AF9Ca656af840dff83E8264EcF986CA` | 90 | A- |

The demo fixtures (MaliciousAgent, SafeAgent) need no env keys — they exercise the permission mapper, the slither runner (when Python is installed), and the score calculator's cap / bonus logic.

The three mainnet contracts are mono-file ERC20 tokens — verified on Etherscan, solc-select auto-resolves their pinned versions. Multi-file contracts (Uniswap V3, Curve, Aave) have unresolved `./` imports after Etherscan concatenation and are not used in the demo.

Reproduce the demo fixtures programmatically:

```bash
pnpm tsx src/lib/core/__fixtures__/demo-verify.ts
# PASS: MaliciousAgent → F 20/100 (expected F 20/100) — cap=two_or_more_high, bonus=+0
# PASS: SafeAgent → A+ 97/100 (expected A+ 97/100) — cap=none, bonus=+15
```

---

## Act 1: The Hook (0:00 – 0:30)

**You say:**

> "On 4 May 2026, an AI agent got prompt-injected via Morse code in a tweet. A downstream agent executed the decoded transfer command. ~$200,000 on Base — gone in one click, no private key stolen. The attacker reportedly returned most of the funds white-hat, but the vulnerability is still live. The AI just obeyed.
>
> Today I'll show you how TrustLayer would have flagged that agent before you ever connected to it."

**What you do:**

1. Landing page is showing — "Credit score for AI agents"
2. Quick scroll to the stats: "$45M lost Q1 2026 · $7.63B market · 0 wallet-agnostic checks"
3. Click **Scan an agent** in the navbar
4. Move to Act 2

---

## Act 2: The Bad Agent (0:30 – 2:00)

**You say:**

> "Let me show you what happens when you scan an AI agent that can drain your wallet."

**What you do:**

1. Click **Try MaliciousAgent** (one-click fixture button)
2. The textarea pre-fills with the MaliciousAgent source
3. Click **Scan**
4. The 8-step pipeline streams — let it speak, do not over-explain

**As the pipeline runs, call out the key moments:**

When Step 5 (Permission Mapping) lands:

> "Step 5 — Permission Mapping. This agent can self-destruct, the owner can drain everything, it has arbitrary call capability, no access control. Four negative permissions. That's the blast radius."

When Step 7 (Wallet Approvals) lands — **the differentiator**:

> "Step 7 — Wallet Approvals. This is what makes TrustLayer different from a static auditor. The agent's wallet has unlimited approvals — and if any of them point to an unknown address, that address can drain the full balance at any time. This is exactly the blast radius that let the Morse-code tweet attack work."

When the Trust Score lands:

> "Trust Score: **F — 20 out of 100.** Slither found 11 findings including 4 High-severity (arbitrary-send, suicidal, unchecked-transfer, no-access-control). Two or more High findings cap the grade at 20 — F max. **Would you connect your wallet to this?**"

---

## Act 3: The Good Agent (2:00 – 2:45)

**You say:**

> "Now let me show you a safe agent."

**What you do:**

1. Scroll back to the top
2. Click **Try SafeAgent**
3. Click **Scan**
4. Pipeline runs faster — fewer findings, more positive permissions

When the Trust Score lands:

> "Trust Score: **A+ — 97 out of 100.** Zero High, zero Medium. Whitelist of allowed targets, daily transfer limit, 24-hour time-lock on sensitive operations, reentrancy guard. The +15 safety bonus applies — 0 H + 0 M unlocks it. Safe to connect."

**Pause.**

> "Same interface. Same analysis. The score tells you everything."

---

## Act 4: Live Mainnet (2:45 – 3:30, only if env keys are set)

**You say:**

> "And this works on real mainnet contracts too."

**What you do:**

1. Switch input type to **Deployed address**
2. Paste `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (USDC)
3. Click **Scan**
4. Pipeline runs the full 8 steps — source fetched from Etherscan, Slither compiles with solc 0.4.24, TokIn risk flags, the lot

When the Trust Score lands:

> "Trust Score: **B+ — 83 out of 100.** USDC mainnet. Slither found 3 Medium findings (`constant-function-asm` — an assembly pattern in constant functions, low real-world risk but flagged for transparency). Audited token, clean permissions, no concerning approvals. B+ is the honest grade."

> "Same engine, same scoring. Reproducible on any EVM contract."

### Expected output for each mainnet target

| Input | Address | Score | Grade | Top finding |
|---|---|---|---|---|
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 83/100 | B+ | 3 × Medium `constant-function-asm` |
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | 100/100 | A+ | 6 × Informational (+15 bonus, 0 H + 0 M) |
| LINK | `0x514910771AF9Ca656af840dff83E8264EcF986CA` | 90/100 | A- | 1 × Medium `shadowing-abstract` |

For the full env-var matrix and failure modes (Slither missing → cap-80, Dedaub 500 → silent skip, Etherscan 429 → informative error), see [`MAINNET-TESTS.md`](./MAINNET-TESTS.md).

### If env keys aren't set

Act 4 falls back gracefully — the demo fixtures (MaliciousAgent / SafeAgent) still reproduce their canonical grades because the permission layer alone drives them. Skip Act 4 in that case and close on the demo fixtures from Act 2 / Act 3.

---

## The Mantra

Repeat it twice during the demo — once in the middle, once at the close:

> **"Mechanical first, AI explains."**

Detection runs on Slither + Dedaub + on-chain data. AI only translates findings into plain English. This is what makes the score reproducible, auditable, and immune to AI hallucination.

---

## What each layer's number means (for Q&A)

| Layer | What the number means |
|---|---|
| Slither sub-score | Starts at 100, minus 25 per High / 10 per Medium / 3 per Low. Informational & Optimization = 0. |
| Dedaub sub-score | Starts at 100, minus 8 per risk flag. |
| Permissions sub-score | Starts at 50, plus positive deltas, minus negative deltas, clamped to [0, 100]. |
| TX History sub-score | 100 baseline, minus per-anomaly penalty (`recently_created`, `high_failure_rate`, `single_large_drain`). 50 neutral when skipped. |
| Approvals sub-score | 100 baseline, minus per-allowance penalty (−20 unlimited unknown, −8 unlimited whitelisted, −5 high-value, −1 limited). 50 neutral when skipped. |
| AI sub-score | LLM-derived hidden-capability confidence. 50 neutral when LLM is disabled. |
| Composite | Weighted sum: slither·0.30 + dedaub·0.20 + perm·0.20 + tx·0.10 + approvals·0.15 + ai·0.05 |
| Final | Composite + 15 bonus if 0 H + 0 M, then cap-20 / cap-44 / cap-80 if triggered, then `scoreToGrade`. |

---

## If something breaks

- **Slither not installed / Python missing on host** — the pipeline emits `slither-not-run`, caps at B+ (80 max). The grade is still honest; say: *"Slither didn't run here. The grade caps at B+ when static analysis is unavailable — we never grade A+ without verification."*
- **Etherscan / Dedaub rate limit** — switch to demo fixtures (MaliciousAgent / SafeAgent). They run on pasted source, no external calls except Dedaub TokIn (which silently skips on 500).
- **LLM endpoint down** — Step 8 falls back to deterministic `ScoreExplainer`. The output card shows the mechanical summary; say: *"AI is the translator. The score is the same with or without it."*

---

## See also

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — full pipeline spec and end-to-end address flow
- [`PITCH.md`](./PITCH.md) — problem, solution, market framing
- [`SPONSORS.md`](./SPONSORS.md) — sponsor-track alignment
