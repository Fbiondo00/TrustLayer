# TrustLayer — Backend implementation guide

## Context

TrustLayer currently ships only the marketing surface (3D hero, problem/pipeline/score/demo/devs
sections). The "Scan an agent" CTA is a placeholder anchor. This guide describes how to grow the
codebase into a working scanner: paste an address or Solidity source → run an 8-step mechanical
analysis pipeline → display an A+ to F trust grade.

The scanner must be honest about what it can and cannot do. The landing's marketing copy makes
specific claims (8 steps, 6 layers, security caps, +15 safety bonus). The implementation must
satisfy every one of those claims, or degrade gracefully and say so out loud.

## Scope (hybrid: pure-TS always works, external APIs activate when env is present)

**In scope:**
- A schema package-inlined under `src/lib/schema/` exporting every type, Zod schema, and constant
  the rest of the codebase consumes (AnalysisInput, AnalysisResult, Finding, TrustScore,
  PermissionReport, TXReport, ApprovalReport, DEFAULT_SCORE_WEIGHTS, GRADE_THRESHOLDS,
  NEGATIVE_PERMISSIONS, POSITIVE_PERMISSIONS, PIPELINE_STEPS, ANOMALY_THRESHOLDS, RISK_FLAGS,
  ScoreExplanation, Zod input schemas).
- Pure-TS core services: `trustscore.ts` (6-layer composite + caps + bonus), `permissions.ts`
  (regex pattern matcher), `explanation.ts` (template-based score explainer).
- External-API core services, each env-gated and self-disabling when its var/bin is missing:
  `slither.ts` (Python subprocess), `dedaub.ts` (decompiler + TokIn), `etherscan.ts` (V2 source
  fetcher), `txhistory.ts` (uses Etherscan), `approval-scanner.ts` (viem multicall3),
  `llm.ts` (OpenAI-SDK gateway to AssistAI/Ollama).
- A pipeline orchestrator (`pipeline.ts`) that runs the 8 steps in order and yields progress
  events, plus a Next.js server action (`actions/analyze.ts`) exposing it to the client.
- A `/scanner` route with InputForm → live pipeline progress → results UI in the TrustLayer
  visual language.
- Refactor of the existing landing sections to consume the same schema constants (single source
  of truth for pipeline steps, weights, grade table).
- Demo mode: with zero env, the scanner still runs against pasted Solidity source (permissions +
  scoring + explanation live; Slither and external-API steps emit informational findings).

**Out of scope (deliberately):**
- On-chain smart contracts — they live deployed, not in this repo. Link to deployed addresses from
  the landing instead.
- MCP server — separate deployment surface, not needed for the scanner UI.
- RAG/embeddings — adds an embedding-store dependency for marginal scan-quality lift. The LLM step
  works without RAG context.
- Payment gate — referenced in the design but not wired into the user flow.

## Architecture after the work lands

```
src/
├── app/
│   ├── page.tsx                      (landing — already exists)
│   ├── scanner/page.tsx              (NEW — scanner route)
│   └── actions/analyze.ts            (NEW — server action)
├── components/
│   ├── sections/...                  (landing — already exists)
│   ├── scanner/                      (NEW — scanner UI)
│   │   ├── InputForm.tsx
│   │   ├── PipelineProgress.tsx
│   │   ├── ScorePanel.tsx
│   │   ├── FindingsList.tsx
│   │   ├── PermissionsCard.tsx
│   │   ├── TXHistoryCard.tsx
│   │   └── ApprovalsCard.tsx
│   └── three/...                     (3D hero — already exists)
├── lib/
│   ├── schema/                       (NEW — types + Zod + constants)
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── finding.ts
│   │   ├── score.ts
│   │   ├── permission.ts
│   │   ├── tx-report.ts
│   │   ├── approval.ts
│   │   ├── token-risk.ts
│   │   ├── pipeline.ts
│   │   ├── explanation.ts
│   │   ├── payment.ts
│   │   ├── services.ts
│   │   └── zod/{analyze,decompile,token-risk-input,score-input,fix-input}.ts
│   ├── core/                         (NEW — pipeline + services)
│   │   ├── index.ts
│   │   ├── pipeline.ts
│   │   ├── trustscore.ts
│   │   ├── permissions.ts
│   │   ├── explanation.ts
│   │   ├── slither.ts
│   │   ├── dedaub.ts
│   │   ├── etherscan.ts
│   │   ├── txhistory.ts
│   │   ├── approval-scanner.ts
│   │   ├── llm.ts
│   │   └── demo.ts                   (NEW — SafeAgent / MaliciousAgent fixtures)
│   ├── env.ts                        (NEW — typed env accessor)
│   └── trust.ts                      (REFACTORED — UI-only helpers, imports from schema)
```

## Phased commit plan (≈8 commits, each independently shippable)

### Phase 1 — Schema layer + landing refactor
**What lands:** `src/lib/schema/*` with every type, Zod schema, and constant the rest of the
codebase needs. `src/lib/trust.ts` becomes a thin UI-only helper that re-exports
`DEFAULT_SCORE_WEIGHTS`, `GRADE_THRESHOLDS`, `PIPELINE_STEPS`, `scoreToGrade` from
`@/lib/schema`. `Score.tsx` and `Pipeline.tsx` import their weights/steps from schema.
**Verify:** `pnpm typecheck` clean; landing renders identically; Lighthouse still green.
**Commit:** `feat(schema): add types, zod inputs, and shared constants`

### Phase 2 — Trust score calculator
**What lands:** `src/lib/core/trustscore.ts` implementing the `TrustScoreCalculator` class with
the exact 6-layer composite, the +15 safety bonus (0 High AND 0 Medium), and the security caps:
2+ High → 20 (F max), 1 High → 44 (D max), `slither-not-run` finding → 80 (B+ max). Slither
penalty weights: High −25, Medium −10, Low −3, Informational/Optimization 0. Plus a fixture
check proving each cap fires.
**Verify:** fixture run shows: 4 High → score 20 grade F; 1 High → score ≤ 44 grade D; Slither
not-run → score ≤ 80 grade B+; 0 H + 0 M → +15 bonus applied.
**Commit:** `feat(core): trust score calculator with caps + safety bonus`

### Phase 3 — Permissions mapper
**What lands:** `src/lib/core/permissions.ts` implementing the regex-based `PermissionMapper`
over `NEGATIVE_PERMISSIONS` (transfer_unlimited −30, self_destruct −25, owner_drain −25,
arbitrary_call −20, reentrancy_exposed −15, no_access_control −20) and `POSITIVE_PERMISSIONS`
(limited_withdrawal +15, whitelist +15, time_lock +10, multi_sig +10, reentrancy_guard +10,
ownable +5). Returns a `PermissionReport` with risk_level and score 0-100.
**Verify:** run it against a contract body that contains `transfer(...)` with no cap and no
`onlyOwner` — expect negative patterns flagged. Against one with `onlyOwner`, whitelist,
`nonReentrant` — expect positive patterns flagged.
**Commit:** `feat(core): permission mapper (regex-based, 6 neg + 6 pos patterns)`

### Phase 4 — External-API services with graceful degradation
**What lands:** `slither.ts` (shells out to `slither` binary, auto-resolves solc via
`solc-select`, 120s timeout, isolated tmp dir), `dedaub.ts` (decompiler POST +
`tokenRisk` GET against `api.dedaub.com` and `tokin-api.dedaub.com`), `etherscan.ts` (V2
source fetch, multi-file double-brace JSON parser), `txhistory.ts` (uses Etherscan txlist),
`approval-scanner.ts` (viem `multicall3` over a known token+spender list per chain),
`llm.ts` (OpenAI SDK pointed at `OPENAI_BASE_URL`, defaults to local Ollama).
Each service reads its env var(s) at construction and exposes `isEnabled()`. When disabled,
the pipeline gets an informational finding or skips the step.
**Add deps:** `viem`, `openai` in `package.json`.
**Document:** `README.md` section listing every env var (`DEDAUB_API_KEY`, `ETHERSCAN_API_KEY`,
`ETH_RPC_URL`, `OPENAI_API_KEY`/`REDHAT_API_KEY`, `OPENAI_BASE_URL`,
`POLYGON_RPC_URL`/`ARBITRUM_RPC_URL`/`OPTIMISM_RPC_URL`) and what each unlocks. Document the
Slither install (`pip3 install --user slither-analyzer solc-select`).
**Verify:** `pnpm typecheck` clean; with no env, every service reports disabled and the
pipeline still completes on pasted source.
**Commit:** `feat(core): external services (Slither/Dedaub/Etherscan/LLM) with env gating`

### Phase 5 — Pipeline + server action
**What lands:** `src/lib/core/pipeline.ts` — `PipelineService.runAnalysis(input)` is an
`AsyncGenerator<PipelineEvent>` that runs the 8 steps in order. Step 1 fetches source (Etherscan
first, then bytecode via RPC). Step 2 decompiles via Dedaub when source isn't verified. Step 3
runs Slither (skipped on decompiled source, which doesn't compile). Steps 4-7 are token-risk /
permissions / TX-history / approvals (only for `input_type=address`). Step 8 is the LLM intent
explanation. Final event yields the full `AnalysisResult`. Plus
`src/app/actions/analyze.ts` exposing it via `useActionState`.
**Verify:** with no env, calling `analyze()` on pasted Solidity source yields a result with
`permissions`, `score` (capped at 80 since Slither skipped), and an informational
`slither-not-run` finding. No crashes.
**Commit:** `feat(core): pipeline orchestrator + analyze server action`

### Phase 6 — Scanner route + UI components
**What lands:** `src/app/scanner/page.tsx` and `src/components/scanner/*`. The InputForm has
an input-type selector (address / source / bytecode), a chain selector, the input field, and
the scan button. While the pipeline runs, a live progress strip shows the 8 steps ticking
through `pending → running → done | error`. On completion, the result cards render: a score
panel with A+ → F color mapping, a findings list with severity chips, a permissions card, a
TX history card (when present), an approvals card (when present), and the AI analysis block.
**Update** landing `#scanner` CTAs: href → `/scanner`.
**Verify:** paste a clean contract source → A-range grade; paste one with `transfer(...)` and
no access control → negative permissions flagged, score in the C/D range. Mobile + desktop.
**Commit:** `feat(scanner): live /scanner route wired to the real pipeline`

### Phase 7 — Demo mode + fixtures
**What lands:** `src/lib/core/demo.ts` exporting two contract bodies as strings
(`MALICIOUS_AGENT_SOURCE`, `SAFE_AGENT_SOURCE`) and a `runDemo(mode)` helper that calls the real
pipeline on the local source. The `/scanner` page gets two buttons: "Try MaliciousAgent" and
"Try SafeAgent" that prefill the form. This makes the demo reproducible offline with zero env.
**Verify:** click "Try SafeAgent" → pipeline runs all enabled steps → A-range grade displayed.
**Commit:** `feat(scanner): one-click demo fixtures (MaliciousAgent + SafeAgent)`

### Phase 8 — Honest copy + final polish
**What lands:** Small copy updates to `Problem.tsx`, `Developers.tsx` to keep claims in sync
with what the scanner actually does (no over-promising). `README.md` updated with run + deploy
instructions and the env var matrix. Lighthouse pass on `/scanner`.
**Verify:** full landing → scanner → result flow on desktop and mobile; Lighthouse ≥ 95 across
the board on `/scanner`.
**Commit:** `docs+polish: align landing copy, document env vars, lighthouse pass`

## Refactor summary (existing files that change)

- `src/lib/trust.ts` — strip the local `PIPELINE`, `GRADES` weight data, and `DEMO_AGENTS` type
  fields that overlap with schema. Keep only UI helpers (grade → color/label mapping). Re-export
  from `@/lib/schema`.
- `src/components/sections/Demo.tsx` — align the local `DemoAgent` type with `AnalysisResult`
  from schema; keep the same visual.
- `src/components/sections/Pipeline.tsx` — pull `PIPELINE_STEPS` from schema (currently uses a
  local duplicate). Layer weights come from `DEFAULT_SCORE_WEIGHTS`.
- `src/components/sections/Score.tsx` — derive the `LAYERS` array from
  `DEFAULT_SCORE_WEIGHTS` so the visual cannot drift from the calculator.
- `src/components/sections/Navbar.tsx` and `Hero.tsx` — `#scanner` href becomes `/scanner`.
- `src/app/page.tsx` — no structural change; the landing stays as is.
- `package.json` — add `viem`, `openai`. Bump nothing.

## Risks and how we handle them

- **Slither needs Python on the host.** On serverless deploys it will skip and emit
  `slither-not-run`, capping the grade at B+ (80). This is the documented, honest behavior.
  The README will state this clearly so demo-time expectations match.
- **External APIs need keys.** Without keys, the scanner still runs (permissions + scoring on
  pasted source). With keys, address-mode unlocks Etherscan/Dedaub/TX/approvals/LLM. The README
  will list every var.
- **Demo data honesty.** The landing's "F 20/100" claim for MaliciousAgent is design-time copy,
  not a verified scan. We'll keep the marketing copy as-is (it's the target grade, explicitly
  stated) but the scanner itself will show whatever grade the real pipeline produces. No fake
  fixtures claiming to be real scans.
- **Type collision.** The existing `src/lib/trust.ts` `TrustGrade` type is slightly different
  from the schema's `ScoreGrade` (subset, missing B-/C+). The refactor aligns to the schema's
  superset and keeps a UI helper that maps any grade to color/label.
- **solc-select global state.** Not thread-safe (single global solc version). Acceptable for a
  serial pipeline; document that concurrent scans would need per-process isolation.

## Verification end-to-end

1. `pnpm install && pnpm dev` — both landing and `/scanner` render with no console errors.
2. `pnpm typecheck` — strict mode, no errors.
3. `pnpm build` — clean production build, both routes prerenderable where possible.
4. Manual flow on `/scanner`:
   - Click "Try SafeAgent" → expect A-range grade, positive permissions visible.
   - Click "Try MaliciousAgent" → expect C/D-range grade, negative permissions flagged
     (`transfer_unlimited`, `no_access_control`), explanation cites the cap reason.
   - Paste arbitrary Solidity → expect permissions + score; Slither step shows skipped if no Python.
5. With env vars set: paste a real mainnet ERC20 address → expect Etherscan + TokIn + TX +
   approvals steps to run, full 6-layer score.
6. Lighthouse on `/scanner` ≥ 95 a11y/SEO/best-practices.
7. `git log --oneline` shows ~8 clean incremental commits in the conventional format.
