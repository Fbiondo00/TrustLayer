# TrustLayer — CLI Reference

The `trustlayer` CLI is a terminal client over the same orchestrator that powers `/scanner`. Three commands cover the full lifecycle: live scans, instant cache replays, and LLM-driven patches.

## Install

The CLI ships inside this repo (no separate package). Run via pnpm:

```bash
pnpm trustlayer:cli <command> [options]
```

Or invoke directly with `tsx`:

```bash
pnpm tsx src/cli/index.ts <command> [options]
```

`.env` in the current working directory is auto-loaded — same env vars as the web app.

## Commands

### `trustlayer analyze <input>`

Runs the full 8-step pipeline and prints a formatted report. Input can be Solidity source, EVM bytecode, or a deployed address.

```bash
# Address (auto-detected from 0x-prefix + 40 hex chars)
trustlayer analyze 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

# Source file
trustlayer analyze ./contracts/demo/MaliciousAgent.sol

# Inline source
trustlayer analyze "$(cat contract.sol)"

# Force input type
trustlayer analyze 0x6080... --type bytecode --chain ethereum

# Raw JSON output (pipe into jq, etc.)
trustlayer analyze 0x... --json
```

Flags:

| Flag | Values | Default |
|---|---|---|
| `--type` | `source` \| `address` \| `bytecode` | auto-detect |
| `--chain` | `ethereum` \| `base` \| `arbitrum` \| `optimism` | `ethereum` |
| `--json` | (boolean) | off |

### `trustlayer replay [<id>]`

Prints cached pipeline results instantly. Useful for stage demos when network or external APIs are flaky.

```bash
# Replay everything in the cache
trustlayer replay

# Replay one specific entry
trustlayer replay malicious-agent
```

Cache file: `src/lib/core/__fixtures__/.demo-cache.json`. Entries today:

| id | Score | Grade |
|---|---|---|
| `malicious-agent` | 20/100 | F |
| `safe-agent` | 97/100 | A+ |
| `usdc-token` | 83/100 | B+ |

### `trustlayer fix <source.sol>`

LLM-patches a vulnerable Solidity contract. Requires `OPENAI_API_KEY` (or `REDHAT_API_KEY`).

```bash
# Patch in-place findings (use --findings JSON)
trustlayer fix ./vulnerable.sol --findings ./findings.json

# Read source from stdin
cat contract.sol | trustlayer fix -

# Write to a specific output path
trustlayer fix ./vulnerable.sol --findings ./findings.json --out ./patched.sol

# Retry with the previous attempt's context (0-indexed)
trustlayer fix ./vulnerable.sol --findings ./findings.json --attempts 1
```

Flags:

| Flag | Values | Default |
|---|---|---|
| `--findings` | path to JSON file with `[{check, severity, description}]` | (none — LLM derives) |
| `--attempts` | integer 0-5 | `0` |
| `--out` | path | (stdout) |
| `--json` | (boolean — banner suppressed) | off |

### `trustlayer help`

Prints the full usage banner.

## Environment

The CLI reads the same env vars as the web app, auto-loaded from `.env` in the working directory:

| Variable | Used by |
|---|---|
| `ETHERSCAN_API_KEY` | Step 1 source fetch + Step 6 TX history |
| `ETH_RPC_URL` | Step 1 bytecode fetch + Step 7 multicall approvals |
| `DEDAUB_API_KEY` | Step 2 decompile + Step 4 TokIn risk |
| `OPENAI_API_KEY` | Step 8 AI intent + `fix` command |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible endpoint override |
| `REDHAT_API_URL` + `REDHAT_API_KEY` | Red Hat / AssistAI LLM gateway (overrides OpenAI) |
| `ANALYSIS_MODEL` | Override LLM model id |
| `FIX_MODEL` | Override LLM model id for the `fix` command |

Slither must be on the host for B+ or higher grades:

```bash
pip3 install --user slither-analyzer solc-select
```

## See also

- [`MAINNET-TESTS.md`](./MAINNET-TESTS.md) — USDC / WETH / LINK reproduction with env vars
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — full pipeline spec
- [`DEMO.md`](./DEMO.md) — 4-minute demo flow
- [`.mcp.json.example`](../.mcp.json.example) — MCP server config (same engine, in-editor tool calls)
