# TrustLayer — Demo Test Cases

Casi di test esaustivi per CLI, MCP server, e web — pronti per la demo all'hackathon. Ogni test indica: comando, input, risultato atteso, e cosa dimostra.

Per la **demo script** narrativa (4 minuti, pitch giudici) vedi [`DEMO.md`](./DEMO.md). Questo file è il **catalogo operativo** da tenere aperto in fase di testing / fallback.

---

## Setup

```bash
# Terminale 1 — web (demo UI)
pnpm web                                # http://localhost:3000

# Terminale 2 — MCP server (demo Claude Code)
pnpm mcp                                # stdio MCP su Claude Code

# CLI usata on-demand dal terminale
pnpm cli analyze <input> [...]          # vedi sezioni sotto
```

### Variabili d'ambiente minime (`.env` alla root del repo)

```bash
# EVM mainnet (per scansioni su address)
ETH_RPC_URL=https://eth.llamarpc.com
ETHERSCAN_API_KEY=...                   # gratis su etherscan.io

# Solana (facoltativo — fallback a public RPC rate-limited)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...

# AI layer (facoltativo — fallback a ScoreExplainer deterministico)
OPENAI_API_KEY=...                      # o REDHAT_API_KEY per assistai.it
```

I demo **locali** (source `.sol`) non richiedono nessun env var.

---

## 1. CLI — EVM source (fixture locali, zero API key)

Otto fixture in `packages/contracts/demo/`. Ognuna dimostra un family di vulnerabilità.

| # | Comando | Expected | Cosa dimostra |
|---|---|---|---|
| 1.1 | `pnpm cli analyze ./packages/contracts/demo/MaliciousAgent.sol` | **F 20/100**, 7+ high findings | Cap-20 (≥2 High) — ogni trap del permission mapper fires: selfdestruct, unlimited transfer, arbitrary call, owner drain |
| 1.2 | `pnpm cli analyze ./packages/contracts/demo/SafeAgent.sol` | **A+ 97/100**, 0 high | Bonus +15 (zero high/medium), tutti i pattern positivi attivi (withdrawal limits, whitelist, timelock) |
| 1.3 | `pnpm cli analyze ./packages/contracts/demo/Reentrancy.sol` | **D 35-44**, 1 high (reentrancy-eth) | Cap-44 (1 High) — singolo High ma score ancora clawed back |
| 1.4 | `pnpm cli analyze ./packages/contracts/demo/DAOHack.sol` | **D-F**, high reentrancy | Stesso pattern DAO storico (2017) — narrative per i giudici |
| 1.5 | `pnpm cli analyze ./packages/contracts/demo/FlashLoanVuln.sol` | **C-D**, medium | Flash loan manipulation pattern |
| 1.6 | `pnpm cli analyze ./packages/contracts/demo/AccessControl.sol` | **C-D**, high (suicide/arbitrary) | Missing access control on privileged functions |
| 1.7 | `pnpm cli analyze ./packages/contracts/demo/UncheckedCall.sol` | **B-C**, low/medium | `.call{}` return value non controllato |
| 1.8 | `pnpm cli analyze ./packages/contracts/demo/SafeContract.sol` | **A/A+** | Versione "pulita" di UncheckedCall per confronto |

### Edge cases EVM source

```bash
# File inesistente — la CLI tenta di leggerlo come source literal
pnpm cli analyze ./does-not-exist.sol
# Expected: error "compilation failed" oppure score su 1 char di source

# Source inline (no file)
pnpm cli analyze "pragma solidity ^0.8.0; contract Foo {}"
# Expected: score alto, no findings

# Source con syntax error
pnpm cli analyze "this is not solidity"
# Expected: "Step 2 (slither): compilation failed" + fallback a permission-only score
```

---

## 2. CLI — EVM mainnet address (richiede `ETHERSCAN_API_KEY` + `ETH_RPC_URL`)

| # | Comando | Expected | Note |
|---|---|---|---|
| 2.1 | `pnpm cli analyze 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | **A/A+** | USDC (ethereum) — proxy EIP-1967, auditato, verifies legato ai downgrade Slither |
| 2.2 | `pnpm cli analyze 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | **A+ 100** | WETH (ethereum) — simple wrapper, no upgrade risk |
| 2.3 | `pnpm cli analyze 0x514910771AF9Ca656af840dff83E8264EcF986CA` | **A-** | LINK (ethereum) |
| 2.4 | `pnpm cli analyze 0x43062070d5d32ec5724e385c4bb8f2aa54b338df --chain arbitrum` | **B+** | Camelot DEX (arbitrum) |
| 2.5 | `pnpm cli analyze 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --chain base` | **A+** | USDC native (base) |
| 2.6 | `pnpm cli analyze 0x4200000000000000000000000000000000000006 --chain base` | **A+** | WETH (base) |

### Edge cases address

```bash
# Indirizzo checksum errato
pnpm cli analyze 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
# Expected: error o auto-correction (case-sensitive check)

# Indirizzo non contratto (EOA)
pnpm cli analyze 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045    # vitalik.eth
# Expected: "no bytecode" o N/A

# Indirizzo su chain sbagliata
pnpm cli analyze 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --chain arbitrum
# Expected: bytecode vuoto, score N/A o fallback
```

---

## 3. CLI — Solana (richiede `HELIUS_RPC_URL` opzionale)

| # | Comando | Expected | Cosa dimostra |
|---|---|---|---|
| 3.1 | `pnpm cli analyze TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --chain solana` | **A 93/100** | SPL Token Program — authority renounced, tx history ok, verification stub |
| 3.2 | `pnpm cli analyze 9xQeWvG816bUx9EPa9S6DvtVh1T8q4k7PFOxtvQ5PaGv --chain solana` | **N/A — wallet, not a program** | Short-circuit al step 1: gli address che non sono program vengono riconosciuti e marcati N/A invece di forzare un punteggio |
| 3.3 | `pnpm cli analyze J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn --chain solana` | **A-/B+** | Jito Solana — programma con authority attiva |

### Edge cases Solana

```bash
# Address troppo corto
pnpm cli analyze Tokenkeg --chain solana
# Expected: error format

# Address mainnet ma programma morto / non caricato
pnpm cli analyze <random-32-bytes-base58> --chain solana
# Expected: "account not found" dal RPC
```

---

## 4. CLI — Output JSON (per integrazioni / scripting)

```bash
# Output completo in JSON
pnpm cli analyze TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --chain solana --json | jq '.result.score'

# Salva risultato in file
pnpm cli analyze ./packages/contracts/demo/MaliciousAgent.sol --json > /tmp/scan.json
jq '{score: .result.score.score, grade: .result.score.grade, findings: (.result.findings | length)}' /tmp/scan.json

# Estrai solo findings high
pnpm cli analyze 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --json \
  | jq '.result.findings[] | select(.severity == "high")'
```

---

## 5. MCP — natural language in Claude Code

Start MCP server in un terminale: `pnpm mcp`. Poi in Claude Code (stesso repo), poni queste domande. Ognuna testa un aspetto diverso del sistema.

| # | Prompt | Expected |
|---|---|---|
| 5.1 | "Is USDC at `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` safe?" | Verdetto narrativo contestuale, A/A+, breakdown per layer (slither/dedaub/permissions/approvals/tx) |
| 5.2 | "Check the Solana Token Program" | Auto-detect chain Solana, A 93/100, spiega upgrade authority renounced + 32% error rate |
| 5.3 | "Scan `./packages/contracts/demo/MaliciousAgent.sol` and tell me the worst finding" | F 20, identifica self-destruct o arbitrary call come top finding |
| 5.4 | "Compare SafeAgent and MaliciousAgent" | Due scansioni in parallelo, contrasto A+ vs F |
| 5.5 | "What's the trust score of WETH on Ethereum?" | A+ 100, simple wrapper, no upgrade risk |
| 5.6 | "Is this wallet safe: `9xQeWvG816bUx9EPa9S6DvtVh1T8q4k7PFOxtvQ5PaGv` on Solana?" | N/A — wallet detected, not a program (short-circuit message) |
| 5.7 | "Analyze `0x43062070d5d32ec5724e385c4bb8f2aa54b338df` on Arbitrum" | Camelot, B+, giustifica risk |

### MCP — stress test

```text
# Prompt ambiguo (deve chiedere chiarimento)
"Is it safe?"
# Expected: ask for input (address or source)

# Address su chain non supportata
"Check 0x... on polygon"
# Expected: chain non ancora supportata, offer to scan on ethereum

# Source troppo lungo (>100KB)
# Expected: truncate warning, analizza primo chunk
```

---

## 6. Web — UI interactions

Apri `http://localhost:3000` e verifica:

| # | Azione | Expected |
|---|---|---|
| 6.1 | Click logo "TRUSTLAYER" in navbar | Va a `/` (home) |
| 6.2 | Da `/scanner`, click logo | Torna a `/` senza mostrare "Skip to content" popup |
| 6.3 | Premi `Tab` da tastiera sulla home | "Skip to content" compare in top-left (focus-visible) |
| 6.4 | Click "Scan a contract" nella navbar | Va a `/scanner` |
| 6.5 | Su `/scanner`, incolla address mainnet (USDC) | Scan parte, score rendering animato |
| 6.6 | Su `/scanner`, incolla address Solana (Token Program) | Auto-detect Solana chain |
| 6.7 | Scroll verso footer | Logo appare in footer, click → torna a `/` |
| 6.8 | Mobile (resize < 1024px) | Hamburger menu, navbar mobile overlay full-screen |
| 6.9 | Click "Skip to content" via keyboard | Focus salta a `#main` content |
| 6.10 | Apri `/scanner` diretto (deep link) | Pagina renderizza senza bisogno di passare dalla home |

---

## 7. Fail-safe matrix (cosa fare se X fallisce)

| Problema | Cause probabili | Fix |
|---|---|---|
| `Step X (slither): compilation failed` | Python / solc-select non installati | Su Mac: `brew install python solc-select && solc-select install 0.8.20 && solc-select use 0.8.20` |
| `set ETH_RPC_URL or ETHERSCAN_API_KEY` | `.env` non caricato | Verifica `cat .env \| grep ETH_RPC_URL`. Il loader usa `INIT_CWD` — lancia `pnpm cli` dalla root del repo |
| `ERR_PNPM_IGNORED_BUILDS` | pnpm 11 blocca native builds | Verifica `pnpm-workspace.yaml#allowBuilds` contenga `bufferutil` e `utf-8-validate` |
| MCP non si connette a Claude Code | Server MCP non running | Verifica `pnpm mcp` in un terminale separato, configura `.mcp.json` se serve |
| Solana scan timeout | Public RPC rate-limited | Setta `HELIUS_RPC_URL` con key gratuita |
| Score "N/A" su contratto valido | Etherscan non trova sorgente | Verifica contratto verificato su Etherscan; se proxy, prova con implementation address |
| Vercel deploy fallisce | Lockfile out of sync | `pnpm install --no-frozen-lockfile && git add pnpm-lock.yaml && git commit` |

---

## 8. Smoke test di regressione (pre-demo, 5 minuti)

Lancia in sequenza per avere confidenza che tutto funzioni prima del pitch:

```bash
# 1. Typecheck
pnpm typecheck                                # expected: 7/7 PASS

# 2. Fixture locali (no network)
pnpm cli analyze ./packages/contracts/demo/MaliciousAgent.sol --json | jq '.result.score.score'
# expected: 20

pnpm cli analyze ./packages/contracts/demo/SafeAgent.sol --json | jq '.result.score.score'
# expected: 97

# 3. EVM mainnet (network)
pnpm cli analyze 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --json | jq '.result.score'
# expected: A o A+

# 4. Solana
pnpm cli analyze TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --chain solana --json | jq '.result.score.score'
# expected: 93

# 5. Web
open http://localhost:3000

# 6. MCP (se Claude Code è installato)
# Lancia pnpm mcp, poi in Claude Code chiedi "is USDC safe?"
```

Se tutti e 6 i check passano, il sistema è pronto per la demo.
