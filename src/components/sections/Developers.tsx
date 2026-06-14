"use client";

import { Reveal, SectionHeading } from "./Reveal";

const TOOLS = [
  { name: "trustlayer_analyze", blurb: "Run the full 8-step pipeline on an agent contract." },
  { name: "trustlayer_decompile", blurb: "Recover Solidity from bytecode via Dedaub." },
  { name: "trustlayer_token_risk", blurb: "30+ TokIn risk flags on any token address." },
  { name: "trustlayer_permissions", blurb: "Map the 12 permission patterns (6 neg, 6 pos)." },
  { name: "trustlayer_approvals", blurb: "Scan ERC20 allowances for blast radius." },
  { name: "trustlayer_score", blurb: "Recompute the grade without re-running analysis." },
];

const SNIPPET = `{
  "tool": "trustlayer_analyze",
  "arguments": {
    "address": "0x5AfE...77c1",
    "chain": "base"
  }
}

→ {
  "grade": "A+",
  "score": 97,
  "layers": {
    "slither":    { "high": 0, "medium": 0 },
    "dedaub":     { "flags": 0 },
    "permissions": "limited + whitelisted",
    "approvals":  "no unlimited allowances",
    "history":    "no anomalies",
    "ai":         "Connect with confidence."
  }
}`;

export function Developers() {
  return (
    <section id="devs" className="relative isolate py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="For developers"
          title={
            <>
              Bring the score
              <br />
              <span className="text-gradient">into your editor.</span>
            </>
          }
          description={
            <>
              TrustLayer ships an MCP server with six tools. Claude Code, Cursor, or any MCP-aware
              client can ask <span className="font-mono text-fg">is agent 0x… safe?</span> and get the
              grade back inline. Wallet UX without leaving the prompt.
            </>
          }
        />

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tools */}
          <Reveal>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TOOLS.map((t) => (
                <div
                  key={t.name}
                  className="card-hover rounded-2xl border border-border bg-surface/50 p-5"
                >
                  <div className="font-mono text-xs text-brand">{t.name}</div>
                  <p className="mt-2 text-xs leading-relaxed text-fg-muted">{t.blurb}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Code panel */}
          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-3xl border border-border bg-bg shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-2 border-b border-border bg-surface/60 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-caution/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-safe/70" />
                <span className="ml-3 text-[11px] font-mono text-fg-subtle">trustlayer.mcp · tool call</span>
              </div>
              <pre className="overflow-x-auto p-5 text-[12px] leading-relaxed text-fg-muted">
                <code>{SNIPPET}</code>
              </pre>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
