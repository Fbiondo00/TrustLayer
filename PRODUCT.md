---
name: TrustLayer
description: Open-source trust-scoring orchestrator for smart contracts. Slither + Dedaub + heuristics + AI, composed into a single 0–100 score with a letter grade. Runs as CLI, web app, and MCP server.
register: brand
---

# TrustLayer

**What it is:** A security pipeline that takes a smart contract (Solidity source, EVM address, or Solana program) and produces a letter grade from A+ to F, plus a list of specific findings.

**Who it's for:** Web3 developers, auditors, and AI agents who need a fast first-pass trust signal on contracts they're about to interact with.

**Where it runs:**

- **CLI** — `pnpm cli analyze <input>` from the terminal
- **Web** — Next.js 16 app with a `/scanner` page for interactive demos
- **MCP server** — drop into Claude Code or Cursor; the AI calls TrustLayer as a tool

**How it scores:** Eight layers (Slither, Dedaub, permissions, wallet approvals, transaction history, AI intent) contribute to a weighted composite. Three hard caps override the math: ≥2 High findings → max 20, 1 High → max 44, Slither not run → max 80.

**Status:** Hackathon-ready demo. Open source on GitHub.
