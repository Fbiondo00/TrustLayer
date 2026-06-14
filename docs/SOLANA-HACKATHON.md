# Solana Hackathon — $1000 USDC Prize Submission

> **Category:** AI Agents on Solana
> **Strategy:** Low participation — submit anyway, reframe the pitch, nail the demo.
> **Status:** Pre-submission

---

## Strategic Context

I giudici hanno segnalato di iscriversi comunque: partecipazione bassa, probabilità di vincere alta anche senza fit perfetto. Questo documento definisce:

1. Il pitch adattato alla categoria "AI Agents on Solana"
2. Il test plan per validare ogni cosa prima della presentazione
3. Lo script del demo (90 secondi)
4. Risk register + backup plan

**ROI target:** 1° posto ($600) o 2° posto ($400) con minimo sforzo di dev aggiuntivo.

---

## Part 1 — Il Pitch (5 slide, 3 minuti)

### Slide 1 — Hook (10 sec)

> **Title:** TrustLayer — The Security Layer for AI Agents on Solana
> **Subtitle:** Any agent touching Solana queries us before acting.

### Slide 2 — Problema (30 sec)

> "AI agents are coming to Solana. None of them know what's safe."

Bullets:
- Rug pulls su nuovi lanci SPL
- Programmi malevoli con upgrade authority attiva
- Infinite approvals a spender sconosciuti

Dato: citation on Solana scam volume YTD (DexScreener / CoinMarketCap).

### Slide 3 — Soluzione (40 sec)

> "TrustLayer gives every agent a trust score before they touch anything on Solana."

Diagramma:
```
Agent ─► MCP call ─► TrustLayer pipeline ─► Score ─► Decision
                       (5 layers)
```

I 5 layer su Solana:
1. **Authority** — program upgrade authority frozen / live
2. **TX history** — error rate, anomaly detection
3. **Approvals** — SPL token accounts owned, delegate-drain risk
4. **Verification** — source verification status
5. **AI** — intent analysis

### Slide 4 — Demo (90 sec) ← la più importante

Vedi Part 3 per lo script minuto per minuto.

### Slide 5 — Vision / Traction (20 sec)

> "Multi-chain (EVM + Solana). MCP-native. Today a tool, tomorrow the guardrail of every Solana agent."

Menzionare:
- Compatible con Claude Code, Cursor, Windsurf
- Open-source core
- Pipeline riproducibile (USDC = A+, scam = F)

---

## Part 2 — Test Plan (validare PRIMA del pitch)

Eseguire in ordine. Per ognuno annotare il risultato. Se diverge dall'expected, fixare o cambiare demo.

### Test 1 — Smoke test USDC (baseline A+)

**Mint:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

```
trustlayer_analyze(
  input_type="address",
  chain="solana",
  address="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
)
```

- ✅ Expected: grade A+, score ≥ 90, no severity ≥ medium
- ❌ Se fallisce: NON presentare, fixare prima

### Test 2 — Stablecoin USDT

**Mint:** `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

- ✅ Expected: A / A+

### Test 3 — Token scam noto (TROVARE UNO)

Processo:
1. Vai su `dexscreener.com` → filtra Solana
2. Cerca token con flag `honeypot` o community tag `SCAM`
3. Salva il mint address

- ✅ Expected: grade C / D / F, score < 60, severity ≥ high
- 🎬 Questo è il "villain" del demo — la pipeline "salva" l'agent dal toccarlo

**Fallback se non trovi scam al volo:**
- Prova `BQcdHdAQW1hczDbBi9hiegXAR7A98Q9jx3X3iBBBDiq4` (soUSDT, pattern sospetti)

### Test 4 — Edge case: address non-token

**Mint:** `7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV`

- ✅ Expected: "wallet, non program" — informational, no crash
- 🎬 Dimostra robustezza della pipeline (gestione input errati)

### Test 5 — Stress test RPC

Lanciare 5 scan in rapida sequenza:
1. `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC)
2. `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` (USDT)
3. `So11111111111111111111111111111111111111112` (wSOL)
4. `ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx` (ATLAS)
5. `9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM` (AUDIO)

- ✅ Expected: tutte completano, nessun "RPC rate limited"
- ❌ Se `sol-approvals-fetch-failed` compare > 1 volta: fix retry/backoff o NON mostrare layer Approvals nel demo

### Test 6 — Demo flow end-to-end (CRITICO)

Simula il pitch da capo a fondo:

1. Apri Claude Code / Cursor con MCP TrustLayer configurato
2. Prompt: *"Should I swap 0.5 SOL for this token? <USDC mint>"*
3. L'agent DEVE chiamare TrustLayer MCP automaticamente
4. Output: score + verdict in linguaggio naturale
5. Ripeti con address "scam" → score F → l'agent rifiuta lo swap

- ⏱️ Cronometra: deve stare entro 90 secondi

---

## Part 3 — Demo Script (90 secondi)

| Tempo | Azione | Cosa dire |
|---|---|---|
| 0:00 | Apri terminale con Claude Code pronto | "Let me show you a real agent on Solana." |
| 0:10 | Digita: "Is USDC safe to interact with?" | "I ask my agent if USDC is safe." |
| 0:20 | L'agent chiama TrustLayer MCP (visibile nel log) | "Notice — it queries TrustLayer before answering." |
| 0:35 | Risposta: A+, score 100 | "Clean bill of health. Agent proceeds." |
| 0:45 | Prompt: "And this one? `<scam-mint>`" | "Now I give it a known rug." |
| 0:55 | L'agent chiama TrustLayer | "Same pipeline, very different result." |
| 1:10 | Risposta: D / F, severity high | "Pipeline flags it. Agent refuses the swap." |
| 1:25 | Slide di chiusura | "This is the agentic security layer on Solana." |

---

## Part 4 — Risk Register & Backup Plan

### Rischi e mitigazioni

| Rischio | Probabilità | Mitigation |
|---|---|---|
| RPC Solana down durante il demo | Media | Pre-registrare backup video del demo |
| MCP server non risponde | Bassa | Testare 5 min prima del pitch, riavviare se needed |
| Domanda: "ma questo è davvero un agent?" | Alta | "Yes — the LLM IS the agent. We're its eyes on Solana risk." |
| Domanda: "quanti utenti avete?" | Alta | "Pre-launch. Focused on integrations with agent frameworks (Eliza, SendAI, Cursor)." |
| Domanda: "revenue model?" | Media | "Open-source core, paid API tier for high-volume agents." |
| Domanda: "perché non RugCheck?" | Alta | "RugCheck is a point tool. TrustLayer is the API layer for any agent — composable, multi-chain, MCP-native." |

### Backup video del demo

**Obbligatorio registrare prima del pitch:**
- Schermata con Claude Code + MCP che esegue i 2 scan (USDC + scam)
- 60-90 secondi totali
- Mostrare in caso di RPC live failure

---

## Part 5 — Pre-Pitch Checklist

- [ ] Test 1 (USDC) eseguito e risultato annotato
- [ ] Test 2 (USDT) eseguito
- [ ] Test 3 (scam token) — address trovato e testato
- [ ] Test 4 (edge case wallet) eseguito
- [ ] Test 5 (stress RPC) eseguito senza failure
- [ ] Test 6 (demo flow end-to-end) cronometrato sotto i 90 secondi
- [ ] 1 token "scam" address salvato come variabile per il demo
- [ ] Demo script provato ≥ 3 volte in cronometro
- [ ] Backup video demo registrato
- [ ] Slide deck (5 slide) pronto in PDF + cloud backup
- [ ] MCP server up e configurato nel tool che userai
- [ ] Q&A prep — risposte pronte alle 4 domande del risk register

---

## Part 6 — Known Limitations (trasparenza col giudice)

Se chiesto, sii onesto su questi gap:

| Gap | Status | Mitigation nella risposta |
|---|---|---|
| Source verification Solana | Stub (SolanaFM non cablato) | "Hook is stubbed for hackathon; full integration is a 1-day job." |
| AI layer Solana | Defaults to 50 (neutral) | "AI verification layer is multi-chain by design; Solana-specific dataset is next." |
| Approvals layer rate-limiting | Sensibile a RPC | "Already detected; retry/backoff is on the roadmap." |

---

## Submission Logistics

_(da compilare quando apri la submission form)_

- **Hackathon:** _(inserire nome)_
- **Categoria:** AI Agents on Solana
- **Prize:** $1000 USDC (1° = $600, 2° = $400)
- **Submission deadline:** _(inserire data)_
- **Demo video URL:** _(da caricare)_
- **Repo URL:** github.com/.../TrustLayer
- **Live demo URL:** _(se deployato)_
- **Pitch deck URL:** _(da caricare)_

---

## Next Action

**Inizia dal Test 1.** Lancia la scan USDC e annota il risultato. Poi procedi in ordine fino al Test 6. Una volta validati tutti, si costruisce pitch deck + demo recording.

Tempo stimato totale (post-validation): 4-6 ore di lavoro, di cui la maggior parte su pitch deck e demo recording.
