# TrustLayer — The Pitch

## The Problem

You're about to connect your wallet to an AI agent.

It says it'll auto-compound your yield. It has a slick UI. 50,000 users. Verified on Twitter.

**Do you trust it?**

You shouldn't. Here's why.

---

### The Numbers Don't Lie

- **April 2026:** LLM routers — the invisible layer between you and AI models — were caught injecting malicious tool calls. **26 routers. One drained a client's wallet of $500,000.** The researchers who found it said they could take over 400 hosts within hours.

- **May 2026:** Someone tagged an LLM in a tweet written in **Morse code**. The model decoded it into a transfer command. A downstream agent executed it. **~$200,000 on Base** — the attacker reportedly returned most of the funds white-hat (~80% per reporting). No private key was compromised. The AI just... did what it was told.

- **February 2026:** An AI agent **accidentally** transferred **$450,000** in tokens after a session memory loss (per CertiK's IDAI Summit 2026 analysis). Not hacked. Not exploited. Just... oops.

- **Q1 2026 total:** AI-assisted crypto attacks drove **$45 million in losses.**

The pattern is the same every time:

> An AI agent has access to a wallet. Someone tricks it — or it makes a mistake — and money disappears.

And this is before AI agents go mainstream.

---

### The Market Is Running Toward the Cliff

The AI agent market is **$7.63 billion in 2025**, projected to grow to **$182.97 billion by 2033** (Grand View Research, 2025).

By the end of this year, a meaningful share of DeFi will be managed by AI agents — billions of dollars in autonomous transactions.

Wallet providers are racing to lock agents inside their own ecosystems: MetaMask shipped an AI Agent Wallet with simulation and threat scanning; OKX added real-time malicious approval detection; EIP-8004 proposes on-chain agent identity with credit-style scores. **But all of these work only inside one wallet.**

There is no wallet-agnostic preflight check. No trust score. No way to check if **any** agent is safe before you connect **any** wallet to it.

Until now.

---

## The Solution

### TrustLayer — Credit Score for AI Agents

TrustLayer is a **trust scoring engine** for AI agents that interact with crypto wallets.

Before you connect your wallet to any AI agent, TrustLayer scans it and tells you:

- **What can this agent actually do?** (transfer? swap? mint? freeze?)
- **How much can it move?** (is there a limit, or can it drain everything?)
- **Where can it send funds?** (any address, or only whitelisted ones?)
- **Has it been audited?** (what do the smart contracts look like?)
- **What's its track record?** (transaction history, failure rate, anomaly detection)

Then it gives you a **Trust Score: A+ to F.**

**A green A+ means:** This agent has limited permissions, audited contracts, and clean history. Safe to connect.

**A red F means:** This agent can drain your wallet, has unaudited code, and has suspicious transaction patterns. **Do not connect.**

---

## How It Works

```
You're about to connect to an AI agent.
                    |
                    v
          +------------------+
          |   TrustLayer     |
          |   scans the      |
          |   agent in 30s   |
          +--------+---------+
                   |
        +----------+----------+
        v          v          v
   +---------+ +--------+ +----------+
   | Slither | | Dedaub | |   AI     |
   |  ~90    | | TokIn  | | Intent   |
   |  checks | |  flags | | Analysis |
   +----+----+ +---+----+ +----+-----+
        |          |           |
        +----------+-----------+
                   v
          +------------------+
          |  TRUST SCORE     |
          |     A+ → F       |
          |                  |
          |  [x] Permissions |
          |  [x] Audit status|
          |  [x] Risk flags  |
          |  [x] TX history  |
          |  [x] Approvals   |
          |  [x] AI intent   |
          +------------------+
                   |
                   v
        +----------------------+
        |  You decide:         |
        |  Connect or          |
        |  Walk away           |
        +----------------------+
```

---

## The 8-Step Pipeline

### Step 1: Fetch Contract

Pull bytecode + source from any EVM chain via Etherscan V2. Skipped when the user pastes Solidity source directly.

### Step 2: Decompile (Dedaub)

If the contract source isn't verified, **decompile the bytecode** with Dedaub's Decompiler API.

### Step 3: Vulnerability Scan (Slither)

Run ~90 deterministic vulnerability detectors on the agent's smart contracts. Reentrancy, access-control issues, unchecked calls, arbitrary sends. Mechanical — not AI opinion.

The runner auto-selects the right Solidity compiler version per `pragma`, so mainnet contracts that pin specific versions (USDC 0.4.24, Uniswap V3 0.7.6) compile cleanly. When Slither cannot run (binary missing, solc unavailable, source uncompilable), the pipeline emits an explicit `slither-not-run` finding and caps the final score at B+ (80 max) — no false A+.

### Step 4: Token Risk (Dedaub TokIn)

12 canonical risk flags: honeypot, high buy/sell tax, transfer pause, owner mint/burn/blacklist/pause/spend, ownership renounce, hidden owner.

### Step 5: Permission Mapping

12 regex patterns (6 negative, 6 positive):

- **Negative:** unlimited transfer, self-destruct, owner drain, arbitrary call, reentrancy exposed, no access control
- **Positive:** limited withdrawal, whitelist, time lock, multi-sig, reentrancy guard, ownable

### Step 6: Transaction History

Pull the agent's on-chain history. Metrics: total transactions, success rate, unique counterparties, days active. Anomaly flags: recently created, high failure rate, single large drain.

### Step 7: Wallet Approvals (the blast-radius check)

Scan every ERC20 approval the agent's wallet has granted. Unlimited approvals to known DEX routers (Uniswap, 1inch, Curve) are normal for trading. **Unlimited approvals to unknown addresses are the single biggest red flag** — that address can drain the wallet at any time without further authorization.

This layer directly answers the killer question judges ask: *"How does scanning a contract prevent prompt injection?"*

> It doesn't, directly. But prompt injection only matters if the agent has the *blast radius* to do damage. We cap the blast radius before you connect. If the agent has unlimited approvals to unknown addresses, that's an F regardless of what the AI says it'll do. That's how the Morse-code tweet attack landed — Bankrbot had unlimited transfer authority. We catch that *before* you connect.

### Step 8: AI Intent Analysis

The AI reads the contract + permissions + history + approvals and explains in plain English:

- "What is this agent designed to do?"
- "Does its behavior match its stated purpose?"
- "Are there hidden capabilities?"

The LLM is **translator, not detector** — hallucination in the explanation does not affect the score. Defaults to Gemma 4 via AssistAI gateway (OpenAI-compatible); swappable to Granite via Ollama, OpenAI GPT-4, or Red Hat Sandbox in 30 seconds via `ANALYSIS_MODEL` env var.

---

## Trust Score — 6-Layer Weighted Composite

| Layer | Weight | Input |
|---|---|---|
| Slither (Vulnerability) | 30% | Finding count + severity |
| Dedaub (Token Risk) | 20% | Risk flag count |
| Permission Mapping | 20% | Negative vs positive match deltas |
| TX History | 10% | Anomalies + track record |
| **Wallet Approvals** | **15%** | Unlimited / unknown approvals |
| AI Intent | 5% | Hidden-capability reasoning |

**Security overrides (applied last):**

| Condition | Cap | Why |
|---|---|---|
| 2+ High findings | F · 20 max | Multiple critical vulnerabilities always means F |
| 1 High finding | D · 44 max | A single confirmed critical vuln blocks A-range |
| Slither didn't run | B+ · 80 max | Never grade A+ without static verification |

**Safety bonus:** +15 when zero High AND zero Medium findings. Audited contracts reach A/A+ instead of getting stuck at B/B+ under Low/Informational noise (timestamp, missing-zero-check on parameters).

**Slither penalty weights:** High −25, Medium −10, Low −3. Informational and Optimization = 0.

---

## Why This Is Different From An "AI Wrapper"

| What TrustLayer Does | Why ChatGPT Can't |
|---|---|
| Decompile EVM bytecode to Solidity | No blockchain access |
| Run ~90 deterministic vulnerability detectors | No Slither, no execution environment |
| Check 12 token risk flags via Dedaub TokIn | No API access to Dedaub |
| Scan live ERC20 approvals via multicall | No blockchain RPC access |
| Analyze real on-chain transaction history | No blockchain RPC access |
| Map contract permissions mechanically (12 patterns) | No contract parsing capability |
| Score with transparent, reproducible methodology | Hallucinates confidence |

**The AI is the translator, not the detector.** It explains findings in plain language. The actual detection is done by Slither, Dedaub, and on-chain analysis — tools that produce deterministic, reproducible results.

---

## Verified Targets

The scanner reproduces these grades deterministically:

| Input | Score | Grade | Notes |
|---|---|---|---|
| `MaliciousAgent.sol` (local demo) | 20/100 | F | 4 High findings → cap-20 |
| `SafeAgent.sol` (local demo) | 97/100 | A+ | 0 H + 0 M → +15 safety bonus |
| USDC mainnet | 83/100 | B+ | 3 Medium `constant-function-asm` |
| WETH mainnet | 100/100 | A+ | clean run |
| LINK mainnet | 90/100 | A- | 1 Medium `shadowing-abstract` |

Reproduce locally — no env keys needed for the demo fixtures:

```bash
pnpm tsx src/lib/core/__fixtures__/demo-verify.ts
```

Or in the browser: open `/scanner`, click **Try MaliciousAgent** or **Try SafeAgent**, click **Scan**.

---

## Architecture

TrustLayer is a Next.js 16 app. All security logic lives in `src/lib/core/`. The web client (`src/app/`) consumes the orchestrator through a single server action driven by `useActionState`.

```
                    ┌─────────────────────────────────┐
                    │   src/lib/core/                  │
                    │   PipelineService (orchestrator) │
                    │   SlitherRunner + DedaubClient   │
                    │   + PermissionMapper + Scanner   │
                    │   + LLMClient + TrustScore       │
                    └────────────┬─────────────────────┘
                                 │  server action
                                 │  (useActionState)
                                 v
                   ┌─────────────────────────────────┐
                   │   src/app/                       │
                   │   Next.js 16 App Router          │
                   │   Landing (SSR)                  │
                   │   /scanner (client component)    │
                   └─────────────────────────────────┘

src/lib/schema/ — types + constants, single source of truth
```

**TypeScript end-to-end.** Server actions handle all web API logic — no separate backend, no separate language. Adding a new client surface (MCP server, CLI, Slack bot) means importing from `src/lib/core/` and writing the surface-specific glue.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full pipeline specification and end-to-end address analysis flow.

---

## The One Line

> **TrustLayer is the wallet-agnostic preflight check for AI agents. Before you connect your wallet, you check the score.**

---

## The Closer

In 2026, you wouldn't enter your credit card on a website without the padlock icon.

But people are connecting their wallets to AI agents every day — with zero visibility into what those agents can do.

**The padlock icon for AI agents doesn't exist yet.**

We're building it.
