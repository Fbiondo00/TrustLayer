# TrustLayer — CLI Reference

The `trustlayer` CLI is a terminal client over the same orchestrator that powers `/scanner`. Three commands cover the full lifecycle: live scans, instant cache replays, and LLM-driven patches.

## Install

The CLI ships inside this repo (no separate package). Three ways to invoke:

### pnpm script (recommended)

After cloning:

```bash
git clone https://github.com/Fbiondo00/TrustLayer.git
cd TrustLayer
pnpm install
pnpm trustlayer:cli <command> [options]
```

`pnpm trustlayer:cli` is wired to `tsx src/cli/index.ts` in `package.json`. `tsx` handles TypeScript + path aliases (`@/lib/…`) at runtime — no build step needed.

### Direct tsx invocation

```bash
pnpm tsx src/cli/index.ts <command> [options]
```

Useful when iterating on CLI internals (faster cold start than the wrapper script).

### Global binary (optional)

If you want to call `trustlayer` from anywhere:

```bash
# Link the binary
pnpm link --global

# Then from any directory:
trustlayer analyze 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

This requires `~/.local/bin` (or equivalent) on your `PATH`. The binary delegates to the local `tsx + src/cli/index.ts` — you still need to be inside the repo (or set `TRUSTLAYER_REPO`) for it to resolve `@/lib/…`.

### Environment

`.env` in the current working directory is auto-loaded — same env vars as the web app. See [Environment](#environment) below for the full matrix.

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

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Unknown command, missing required env var, or runtime error |

The CLI never silently swallows errors — every failure path prints `✗ <message>` to stderr before exiting. Pipe-friendly: when using `--json`, error messages still go to stderr (stdout only gets valid JSON on success), so `| jq` won't choke on partial output.

## Recipes

### Pipe to `jq` for quick filtering

```bash
# Just the score + grade
pnpm trustlayer:cli analyze 0xA0b...eB48 --json | jq '.result.score'

# Just the high-severity findings
pnpm trustlayer:cli analyze 0xA0b...eB48 --json | \
  jq '.result.findings[] | select(.severity == "high")'

# Score a folder of contracts and fail CI on anything below B
for sol in contracts/demo/*.sol; do
  grade=$(pnpm trustlayer:cli analyze "$sol" --json | jq -r '.result.grade')
  echo "$sol → $grade"
done
```

### Batch replay all demo entries

```bash
# No env vars needed — replays are local-only
pnpm trustlayer:cli replay
```

### Fix-and-iterate loop

```bash
# 1. Capture findings from a fresh analyze
pnpm trustlayer:cli analyze ./vulnerable.sol --json | \
  jq '.result.findings' > findings.json

# 2. Patch
pnpm trustlayer:cli fix ./vulnerable.sol --findings findings.json --out patched.sol

# 3. Re-analyze the patch — if findings remain, retry with attempts=1
pnpm trustlayer:cli analyze ./patched.sol --json | jq '.result.findings'
pnpm trustlayer:cli fix ./vulnerable.sol --findings findings.json --attempts 1 --out patched2.sol
```

## CI/CD integration

The CLI is designed for unattended pipelines. A typical workflow gates PRs on a minimum grade.

### GitHub Actions

```yaml
# .github/workflows/trustlayer.yml
name: TrustLayer scan
on: [pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Install Slither
        run: pip3 install --user slither-analyzer solc-select

      - name: Scan target contract
        env:
          ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
          DEDAUB_API_KEY: ${{ secrets.DEDAUB_API_KEY }}
          ETH_RPC_URL: ${{ secrets.ETH_RPC_URL }}
        run: |
          pnpm trustlayer:cli analyze ${{ inputs.target }} --json > scan.json
          grade=$(jq -r '.result.grade' scan.json)
          score=$(jq -r '.result.score' scan.json)
          echo "Grade: $grade ($score/100)"

          # Fail the build if score < 80 (B+ or higher required)
          if [ "$score" -lt 80 ]; then
            echo "::error::TrustLayer grade $grade ($score/100) is below the B+ threshold"
            exit 1
          fi
```

Notes:
- `--frozen-lockfile` ensures reproducible builds.
- Slither must be installed on the runner — without it, the score caps at B+ (`slither_not_run` cap reason).
- The CLI exits `0` on success even when the grade is F. CI gating logic reads the JSON and decides — don't rely on exit code for grade-based gating.

### Git pre-commit hook

```bash
# .git/hooks/pre-commit (or via husky / lefthook)
#!/bin/sh
files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.sol$')
[ -z "$files" ] && exit 0

for f in $files; do
  score=$(pnpm trustlayer:cli analyze "$f" --json 2>/dev/null | jq -r '.result.score // 0')
  if [ "$score" -lt 60 ]; then
    echo "✗ $f scored $score/100 — fix vulnerabilities before committing"
    exit 1
  fi
done
```

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

- [`MCP.md`](./MCP.md) — same engine, MCP server surface (Claude Code / Cursor / Windsurf)
- [`MAINNET-TESTS.md`](./MAINNET-TESTS.md) — USDC / WETH / LINK reproduction with env vars
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — full pipeline spec
- [`DEMO.md`](./DEMO.md) — 4-minute demo flow
- [`.mcp.json.example`](../.mcp.json.example) — MCP server config (same engine, in-editor tool calls)
