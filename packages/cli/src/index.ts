#!/usr/bin/env node
/**
 * TrustLayer CLI — terminal client for the security orchestrator.
 *
 * Thin client over `@trustlayer/core`. Parses argv, dispatches to commands,
 * formats output. No security logic — everything goes through
 * PipelineService / LLMClient / RAGService.
 *
 * Commands:
 *   trustlayer analyze <input> [options]   Run the 8-step pipeline on the input
 *   trustlayer replay [<id>]               Replay cached result(s) instantly
 *   trustlayer fix <source.sol> [options]  LLM-patch a vulnerable contract
 *   trustlayer help                        Show this help
 */

import { loadEnv } from "./env";
import { analyze } from "./commands/analyze";
import { replay } from "./commands/replay";
import { fix } from "./commands/fix";

const HELP = `TrustLayer CLI — terminal client for the security orchestrator

Usage:
  trustlayer analyze <input> [options]   Run the 8-step pipeline on the input
  trustlayer replay [<id>]               Replay cached result(s) instantly
  trustlayer fix <source.sol> [options]  LLM-patch a vulnerable contract
  trustlayer help                        Show this help

Options for analyze:
  --type <type>      source | address | bytecode (default: auto-detect)
  --chain <chain>    ethereum | base | arbitrum | optimism (default: ethereum)
  --json             Output raw JSON instead of formatted text

Options for fix:
  --findings <path>  JSON file with findings array (default: derive from analyze)
  --attempts <n>     Fix attempt number, 0-indexed (informs prompt retries)
  --json             Output raw patched source only (no banner)

Input auto-detection (analyze):
  0x followed by 40 hex chars     → address
  existing file path              → source (file contents)
  otherwise                       → source (literal Solidity code)

Examples:
  trustlayer analyze 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
  trustlayer analyze ./MaliciousAgent.sol --chain ethereum
  trustlayer analyze "$(cat contract.sol)"
  trustlayer replay usdc-token
  trustlayer fix ./vulnerable.sol --findings ./findings.json

Environment (.env in CWD is auto-loaded):
  DEDAUB_API_KEY     Required for Dedaub decompile + TokIn
  ETH_RPC_URL        Required for address input + approvals scan
  ETHERSCAN_API_KEY  Required for source fetch + TX history
  OPENAI_API_KEY     Required for the AI step + fix command
`;

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string>;
  boolFlags: Set<string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  const boolFlags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        boolFlags.add(key);
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return {
    command: positional[0] ?? "",
    positional: positional.slice(1),
    flags,
    boolFlags,
  };
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "analyze":
      await analyze(args);
      break;
    case "replay":
      await replay(args);
      break;
    case "fix":
      await fix(args);
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${args.command || "(none)"}\n`);
      console.error(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
