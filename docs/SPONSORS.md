# TrustLayer — Sponsor-Track Alignment

TrustLayer is built around a deterministic 8-step pipeline that runs mechanical security tools (Slither, Dedaub, on-chain approval scan) and translates their findings into a single A+ → F trust grade. This doc lists the sponsor tracks where TrustLayer's technical choices align with the sponsor's technology or judging criteria.

For each sponsor: what we use from them, what we'd highlight in a pitch to their judges, and what we'd love feedback on.

---

## Main Track — AI × Web3 × Quantum

The track prompt asks teams to **create trust layers for AI**. TrustLayer is the most literal answer to that brief: a trust-scoring layer that runs *before* a wallet connects to any AI agent, mechanically. The pipeline doesn't trust the AI's stated intent — it scans the contract behind the agent, the wallet approvals the agent can use, and the on-chain history, then publishes a reproducible grade.

**What we'd highlight:** the 8-step pipeline reproduces five verified targets deterministically (MaliciousAgent F, SafeAgent A+, USDC B+, WETH A+, LINK A-). The same input always produces the same grade — a judge can paste the same address tomorrow and get the same score.

---

## Dedaub — Decompiler + TokIn

Dedaub is a core pipeline dependency, not a side feature. Two of the eight steps call Dedaub directly:

- **Step 2 — Decompile:** when the user submits an unverified address, we POST the bytecode to Dedaub's on-demand decompiler and feed the pseudo-Solidity to Slither.
- **Step 4 — Token Risk:** Dedaub TokIn supplies the 12 canonical risk flags (honeypot, hidden sell tax, transfer pause, owner can mint/burn/blacklist, etc.) that feed 20% of the final composite score.

**What we'd highlight:** we treat TokIn 500 responses (non-token / outage / bogus-key indistinguishable) as silent skips with a `_skipped` marker in the raw response — that's an engineering decision that came from actually shipping against the API, not just calling it.

**What we'd love feedback on:** we'd value Dedaub's take on the right trade-off between silent-skip and hard-error when the API surface is ambiguous. We've biased toward "don't break the pipeline," but a smarter signal-detection would help.

---

## SiteLab — Best Landing Page

TrustLayer ships a marketing landing (`/`) and a scanner interface (`/scanner`) built around a consistent purple-accented design system:

- Tailwind CSS v4 design tokens (`bg`, `bg-elevated`, `surface`, `brand`, `safe`, `caution`, `danger`, `fg`, `fg-muted`, `fg-subtle`) declared in `packages/web/src/app/globals.css`
- Server-rendered landing (SSR) for SEO and first paint
- Framer Motion entrance animations with `prefers-reduced-motion` honored
- React Three Fiber hero scene with a shield motif
- Mono-font tabular numerals on every metric so the score panel doesn't shift width

**What we'd highlight:** the `/scanner` route scores 100 / 100 / 100 / 100 on Lighthouse (accessibility, best-practices, SEO, agentic-browsing) — verified on every PR. The grade panel is color-coded, the pipeline progress strip animates each step, and the design system is consistent across landing and scanner.

**What we'd love feedback on:** SiteLab design tokens vs. our hand-rolled Tailwind theme — where the friction is, what we'd gain from a full SiteLab export.

---

## Mood Global Services — Best Innovative AI Use Case

TrustLayer's use of AI is deliberate and restrained: **the AI explains, it doesn't detect.** The 6-layer composite gives AI Intent Analysis only 5% weight (the smallest of any layer). Slither (30%) + Dedaub (20%) together carry 50% — both deterministic. This is the innovative framing: AI as translator of mechanical evidence, not as oracle.

The detection is reproducible. The AI's role is to take a structured list of findings and produce a plain-English paragraph a non-developer can act on. Hallucination in the explanation does not affect the score — the score is computed before the AI is called.

**What we'd highlight:** we picked Gemma 4 via AssistAI gateway (OpenAI-compatible) as the default, but the LLM layer is swappable to Granite via Ollama, OpenAI GPT-4, or Red Hat Sandbox in 30 seconds via the `ANALYSIS_MODEL` env var. The architecture treats the model as a plug-in, not a foundation.

**What we'd love feedback on:** the right weighting between "AI as detection" vs. "AI as explanation" for trust-score products. We landed on 5%, but the field is wide open.

---

## Blockchain for Good Alliance — AI / Web3 Tools for GOOD

Wallet drains hit retail users hardest — the people who cannot afford a $50K audit. TrustLayer gives anyone with a browser a trust grade for free. Paste a contract address, get an A+ or an F, decide whether to connect.

The demo fixtures (MaliciousAgent, SafeAgent) require no API keys, no login, no payment. They exercise the full scoring pipeline — permissions, slither (when Python is present), explanation — end to end. The free path *is* the product.

**What we'd highlight:** the cap-20 / cap-44 / cap-80 security overrides are user-protective by design. A contract with 2+ High Slither findings cannot score above F, no matter how the marketing copy reads. The user sees the cap reason on the result card. That's the "for GOOD" angle: the engine refuses to be impressed.

**What we'd love feedback on:** how to keep the free tier meaningful as the project scales, without ads or data selling.

---

## Sentry — Pipeline observability

TrustLayer's 8-step pipeline has well-defined failure modes: each external service (`SlitherRunner`, `DedaubClient`, `EtherscanClient`, `ApprovalScanner`, `LLMClient`) reports `isEnabled()` at construction and returns structured null/empty/synthetic-finding results when disabled. Every step emits a `pending → running → done | error | skipped` event with timing.

This is exactly the shape of system that benefits from Sentry: per-step error capture, performance traces on the slow steps (Slither subprocess, Dedaub on-demand decompile, multicall3 round-trip), and release health on pipeline versions.

**What we'd highlight:** the pipeline already produces structured `PipelineEvent` objects with `duration_ms` per step — Sentry integration is a thin adapter, not a refactor.

**What we'd love feedback on:** whether the SDK we'd choose (Next.js browser + server, since the pipeline runs in the server action) is the cleanest path to count toward Sentry's bounty criteria.

---

## How the bounties fit together

TrustLayer's pipeline is the same artifact across every sponsor track. The framing shifts per audience:

| Sponsor | Framing |
|---|---|
| Main track | "Create trust layers for AI" — literal answer |
| Dedaub | "We're a heavy Dedaub user — Step 2 and Step 4 call Dedaub APIs" |
| SiteLab | "Design-system-driven landing + scanner, 100/100 Lighthouse" |
| Mood Global | "AI as translator, not detector — 5% weight, mechanical-first" |
| BGA | "Free tier is the product — security shouldn't be a luxury" |
| Sentry | "8-step pipeline with structured events ready for tracing" |

One engine. Six framings. The product doesn't change between pitches.

---

## See also

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — pipeline spec and end-to-end address flow
- [`PITCH.md`](./PITCH.md) — problem, solution, market framing
- [`DEMO.md`](./DEMO.md) — 4-minute demo script
