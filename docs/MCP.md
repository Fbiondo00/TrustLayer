# TrustLayer — MCP Server Reference

The TrustLayer MCP server exposes **seven tools** over stdio that let any MCP-aware client (Claude Code, Cursor, Windsurf, Continue, Zed, …) call the security orchestrator inline. Ask "is agent `0x…` safe?" in your editor and get the A+ → F grade back in the same conversation — no copy-paste to a browser.

The server lives at [`src/mcp/server.ts`](../src/mcp/server.ts). It wraps the same `PipelineService` that powers `/scanner` and the CLI — identical scores across surfaces by construction.

## Install

### Option A — pnpm script (recommended)

After cloning the repo:

```bash
git clone https://github.com/Fbiondo00/TrustLayer.git
cd TrustLayer
pnpm install
```

Then point your MCP client at this repo:

```json
{
  "mcpServers": {
    "trustlayer": {
      "command": "pnpm",
      "args": ["trustlayer:mcp"],
      "env": {
        "ETHERSCAN_API_KEY": "<your-key>",
        "DEDAUB_API_KEY": "<your-key>",
        "ETH_RPC_URL": "<your-rpc-url>"
      }
    }
  }
}
```

`pnpm trustlayer:mcp` is wired to `tsx src/mcp/server.ts` in `package.json`. `tsx` handles TypeScript + path aliases (`@/lib/…`) at runtime — no build step needed.

### Option B — npx (no global install)

For clients that prefer `npx`:

```json
{
  "mcpServers": {
    "trustlayer": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/absolute/path/to/TrustLayer",
      "env": {
        "ETHERSCAN_API_KEY": "<your-key>",
        "DEDAUB_API_KEY": "<your-key>",
        "ETH_RPC_URL": "<your-rpc-url>"
      }
    }
  }
}
```

A canonical template is committed at [`.mcp.json.example`](../.mcp.json.example) — copy and fill in keys.

## Per-client setup

| Client | Config location | Format |
|---|---|---|
| **Claude Code** (project) | `TrustLayer/.mcp.json` | Same shape as above; Claude Code auto-discovers it on next session |
| **Claude Code** (user-global) | `~/.claude/mcp.json` | Add `trustlayer` under `mcpServers` |
| **Cursor** | `TrustLayer/.cursor/mcp.json` | Same shape; Cursor auto-discovers on workspace open |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | Same shape |
| **Continue** | `~/.continue/config.json` under `experimental.mcpServers` | Same shape |
| **Zed** | `~/.config/zed/settings.json` under `mcpServers` | Same shape |
| **Generic MCP Inspector** | Run `npx @modelcontextprotocol/inspector pnpm trustlayer:mcp` | Live tool explorer UI at `localhost:5173` |

After saving the config, restart the client. Verify with `tools/list` — you should see seven tools prefixed `trustlayer_`.

## Environment variables

The server reads the same env vars as `/scanner`. Only the demo path (Solidity source, no live chain calls) works without keys — for mainnet addresses you need all three.

| Variable | Required for | Notes |
|---|---|---|
| `ETHERSCAN_API_KEY` | `analyze` (address), `token_risk`, TX history step | Free tier works — [etherscan.io/login](https://etherscan.io/login) |
| `DEDAUB_API_KEY` | `decompile`, `token_risk` | Free tier — [dedaub.com](https://dedaub.com/) |
| `ETH_RPC_URL` | `analyze` (address), `approvals` | Any EVM RPC. Alchemy/Infura free tier is fine |
| `OPENAI_API_KEY` | `fix`, AI-intent step | Or `REDHAT_API_KEY` + `REDHAT_API_URL` for AssistAI gateway |
| `OPENAI_BASE_URL` | Optional — OpenAI-compatible endpoint | Default unset (uses OpenAI SDK default) |
| `ANALYSIS_MODEL` | Optional — override analysis model id | Defaults to `gemma4-thinker` |
| `FIX_MODEL` | Optional — override model id for `fix` | Defaults to `gemma4-coder` |
| `DEMO_MODE` | `true` = skip payment gating (default) | PaymentGate is future API, not enforced yet |

Demo keys note: when env vars are unset, the server still serves all seven tools, but `analyze`/`token_risk`/`approvals`/`decompile` return errors at runtime when they hit the network. `permissions`, `score`, and `fix` (when LLM keys present) work without chain access.

## The seven tools

### `trustlayer_analyze` — full pipeline

The umbrella tool. Runs all 8 steps (fetch → decompile → Slither → token risk → permissions → TX history → approvals → AI intent) on one input and returns the trust score plus the per-step event log.

**Arguments:**

| Arg | Type | Required | Description |
|---|---|---|---|
| `input_type` | `"source" \| "bytecode" \| "address"` | yes | What kind of input you're passing |
| `chain` | `"ethereum" \| "base" \| "arbitrum" \| "optimism"` | yes | Chain the target lives on |
| `source` | string | when `input_type="source"` | Solidity source code |
| `bytecode` | string | when `input_type="bytecode"` | Hex-encoded EVM bytecode (with or without `0x` prefix) |
| `address` | string (`0x` + 40 hex) | when `input_type="address"` | Deployed contract address |
| `name` | string | no | Optional label for the scan |

**Returns:** JSON with `{ pipeline: PipelineEvent[], result: AnalysisResult }`. The terminal event in `pipeline` carries the trust score, grade, findings, and per-layer sub-scores.

**Example invocation** (Cursor chat or Claude Code):

> Use trustlayer_analyze to check the SafeAgent demo source. Here it is: `<paste Solidity>`

The client converts that to a `tools/call` with `input_type="source"`, `chain="ethereum"`, `source=<pasted code>`, and you see the grade inline.

### `trustlayer_decompile` — bytecode → Solidity

Recover Solidity source from deployed bytecode via the Dedaub decompiler.

| Arg | Type | Required | Description |
|---|---|---|---|
| `bytecode` | string | yes | Hex-encoded EVM bytecode |

**Returns:** Decompiled Solidity source as plain text.

### `trustlayer_token_risk` — Dedaub TokIn flags

Run the 12 canonical token-risk flags on a deployed token: honeypot, hidden mint, sell tax, proxy, ownership takeable, etc.

| Arg | Type | Required |
|---|---|---|
| `chain` | `ChainId` | yes |
| `address` | `0x…` (40 hex) | yes |

**Returns:** JSON `{ score, flags[], findings[], buy_tax?, sell_tax?, is_token, honeypot, empty }`.

### `trustlayer_permissions` — pattern map

Static check on Solidity source for 6 negative capabilities (unlimited transfer, self-destruct, owner drain, arbitrary call, reentrancy exposure, no access control) and 6 positive patterns (whitelist, daily cap, time-lock, multi-sig, pausable, reentrancy guard).

| Arg | Type | Required |
|---|---|---|
| `source_code` | string | yes |

**Returns:** JSON with matched patterns, weights, and the resulting permission sub-score.

### `trustlayer_approvals` — ERC20 allowance blast radius

Multicall3 scan of every active ERC20 allowance granted **by** the target address. Flags unlimited approvals and computes a risk score.

| Arg | Type | Required |
|---|---|---|
| `chain` | `ChainId` | yes |
| `address` | `0x…` (40 hex) | yes |

**Returns:** JSON with per-token allowances, unlimited-approval flag, and the approvals sub-score.

### `trustlayer_score` — recompute grade

Pure function — re-derives the trust score from findings + sub-scores without re-running any pipeline step. Useful after manually editing findings.

| Arg | Type | Required | Description |
|---|---|---|---|
| `findings` | `{severity, check}[]` | yes | Findings with severity + detector name |
| `token_risk_flags` | string[] | no | Flags from `token_risk` |
| `permissions` | `{name, category, weight}[]` | no | Patterns from `permissions` |
| `tx_score` | number (0-100) | no | TX-history sub-score; 50 neutral if omitted |

**Returns:** JSON `{ score, grade, cap_reason, ... }`.

### `trustlayer_fix` — LLM patch

Generate a Solidity patch for the supplied findings. Augmented with RAG context from the SWC knowledge base. Requires `OPENAI_API_KEY` (or `REDHAT_API_KEY`).

| Arg | Type | Required | Description |
|---|---|---|---|
| `source_code` | string | yes | Vulnerable Solidity |
| `findings` | `{check, severity, description}[]` | yes | Findings to patch |
| `attempts` | integer 0-5 | no | Retry attempt number — adds "previous attempt failed, revise" note to the prompt |

**Returns:** Patched Solidity source as plain text. On LLM-disabled: `isError: true` with a hint to set `OPENAI_API_KEY`.

## Example sessions

### Quick grade check

> **You (in Claude Code):** Is `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` on ethereum safe?
>
> **Claude:** *(calls `trustlayer_analyze` with `input_type=address, chain=ethereum, address=0xA0b…`)* → B+ 83/100 — 18 findings (3 Medium). Mostly safe.

### Compose individual tools

Instead of the umbrella `analyze`, chain tools for finer control:

> 1. Call `trustlayer_decompile` on this bytecode.
> 2. Run `trustlayer_permissions` on the result.
> 3. Score it with `trustlayer_score` using the permissions + these manually-curated findings.

### Fix a vulnerability

> **You:** Here's a vulnerable contract `<paste>`. The findings are `[...]`. Patch it.
>
> **Claude:** *(calls `trustlayer_fix`)* → returns patched Solidity. You iterate with `attempts: 1` if the first patch is wrong.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `tools/list` returns empty | Server crashed at startup | Run `pnpm trustlayer:mcp` in a terminal — see the stderr |
| `trustlayer_analyze` returns "Etherscan 401" | Missing `ETHERSCAN_API_KEY` | Add to the `env` block in your MCP config |
| `trustlayer_fix` returns "LLM disabled" | Missing `OPENAI_API_KEY` | Add to env, or set `REDHAT_API_URL` + `REDHAT_API_KEY` |
| Tools load but `analyze` on address fails | Missing `ETH_RPC_URL` | Required for bytecode fetch + multicall approvals |
| Client can't find `tsx` | `npx` variant used without install | Either run `pnpm install` (Option A) or rely on `npx` to fetch `tsx` ad-hoc |
| Slither step skipped | Slither not installed on host | `pip3 install --user slither-analyzer solc-select` — caps grade at B+ otherwise |

## Transport

Stdio only. HTTP/SSE transport is not wired up — the server is designed for local-editor use, not remote hosting. If you need HTTP, wrap `src/mcp/server.ts` with `@modelcontextprotocol/sdk/server/streamableHttp.js` (the SDK supports it, we just don't expose it).

## See also

- [`.mcp.json.example`](../.mcp.json.example) — copy-paste config template
- [`CLI.md`](./CLI.md) — same engine, terminal surface
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the 8-step pipeline spec
- [`MAINNET-TESTS.md`](./MAINNET-TESTS.md) — USDC / WETH / LINK reproduction
