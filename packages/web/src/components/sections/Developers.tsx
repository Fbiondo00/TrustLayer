"use client";

import Link from "next/link";
import { Reveal, SectionHeading } from "./Reveal";

const SURFACES = [
  {
    label: "Web",
    title: "Browser scanner",
    body: "The consumer surface. Paste a contract address or Solidity source, get an A+ → F grade with the full breakdown. No install, no keys for the local demos.",
    href: "/scanner",
    cta: "Open scanner",
    install: `# No install — open the deployed URL
open https://trustlayer.app/scanner`,
  },
  {
    label: "MCP Server",
    title: "In-editor tool calls",
    body: "Seven tools for Claude Code, Cursor, Windsurf, or any MCP-aware client. Ask \"is agent 0x… safe?\" from your prompt and get the grade inline.",
    tools: [
      "trustlayer_analyze",
      "trustlayer_decompile",
      "trustlayer_token_risk",
      "trustlayer_permissions",
      "trustlayer_approvals",
      "trustlayer_score",
      "trustlayer_fix",
    ],
    install: `# .mcp.json (Claude Code / Cursor / Windsurf)
{
  "mcpServers": {
    "trustlayer": {
      "command": "pnpm",
      "args": ["mcp"],
      "env": {
        "ETHERSCAN_API_KEY": "<your-key>",
        "DEDAUB_API_KEY": "<your-key>",
        "ETH_RPC_URL": "<your-rpc-url>"
      }
    }
  }
}`,
  },
  {
    label: "CLI",
    title: "Terminal + CI",
    body: "Reproducible grades in any pipeline. Same engine, same scores — the agent surface for automation. Three commands cover live scans, instant replays, and LLM-driven patches.",
    tools: [
      "trustlayer analyze <input>",
      "trustlayer replay <id>",
      "trustlayer fix <source.sol>",
    ],
    install: `# Clone + install
git clone https://github.com/Fbiondo00/TrustLayer.git
cd TrustLayer && pnpm install

# Run
pnpm cli analyze 0xA0b…eB48
pnpm cli replay malicious-agent`,
  },
];

const DEMO_OUTPUT = `# pnpm fixtures

PASS: MaliciousAgent → F 20/100 (expected F 20/100)
      — cap=two_or_more_high, bonus=+0
PASS: SafeAgent → A+ 97/100 (expected A+ 97/100)
      — cap=none, bonus=+15`;

export function Developers() {
  return (
    <section id="devs" className="relative isolate py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="For developers"
          title={
            <>
              Three surfaces,
              <br />
              <span className="text-gradient">one engine.</span>
            </>
          }
          description={
            <>
              The pipeline runs in <span className="font-mono text-fg">src/lib/core/</span>. The web
              client, an MCP server, and a CLI all import the same orchestrator — the scores are
              identical across surfaces because the engine is identical.
            </>
          }
        />

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {SURFACES.map((surface) => (
            <Reveal key={surface.label}>
              <div className="card-hover flex h-full flex-col rounded-2xl border border-border bg-surface/50 p-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border bg-bg/60 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-widest text-brand">
                    {surface.label}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-fg">{surface.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{surface.body}</p>

                {surface.tools ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {surface.tools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-md border border-border bg-bg/40 px-2 py-1 font-mono text-[10.5px] text-fg-subtle"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                ) : null}

                {surface.install ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-border bg-bg/60">
                    <div className="border-b border-border px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-fg-subtle">
                      install
                    </div>
                    <pre className="overflow-x-auto px-3 py-2.5 text-[11px] leading-relaxed text-fg-muted">
                      <code>{surface.install}</code>
                    </pre>
                  </div>
                ) : null}

                {surface.href ? (
                  <div className="mt-6">
                    <Link
                      href={surface.href}
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-brand transition-colors hover:text-brand-bright"
                    >
                      {surface.cta}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col rounded-2xl border border-border bg-surface/50 p-6">
              <h3 className="text-base font-semibold text-fg">The seven MCP tools</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Each tool maps to one stage of the 8-step pipeline. Compose them in a chain or call
                the umbrella tool for the full grade in one shot.
              </p>
              <dl className="mt-4 space-y-2.5">
                <Row name="trustlayer_analyze" desc="Run the full 8-step pipeline on an agent contract." />
                <Row name="trustlayer_decompile" desc="Recover Solidity from bytecode via Dedaub." />
                <Row name="trustlayer_token_risk" desc="12 canonical TokIn risk flags on any token address." />
                <Row name="trustlayer_permissions" desc="Map the 12 permission patterns (6 neg, 6 pos)." />
                <Row name="trustlayer_approvals" desc="Scan ERC20 allowances for blast radius." />
                <Row name="trustlayer_score" desc="Recompute the grade without re-running analysis." />
                <Row name="trustlayer_fix" desc="LLM-patch a vulnerable contract (RAG-augmented)." />
              </dl>
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs leading-relaxed text-fg-muted">
                  Per-client install (Claude Code, Cursor, Windsurf, Continue, Zed), argument
                  reference, and troubleshooting in{" "}
                  <span className="font-mono text-brand">docs/MCP.md</span>.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-2 border-b border-border bg-surface/60 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-caution/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-safe/70" />
                <span className="ml-3 text-[11px] font-mono text-fg-subtle">
                  demo-verify.ts · deterministic
                </span>
              </div>
              <pre className="overflow-x-auto p-5 text-[12px] leading-relaxed text-fg-muted">
                <code>{DEMO_OUTPUT}</code>
              </pre>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <p className="mt-8 text-xs leading-relaxed text-fg-subtle">
            All three surfaces ship in this monorepo. Run the MCP server with{" "}
            <span className="font-mono">pnpm mcp</span> (stdio), the CLI with{" "}
            <span className="font-mono">pnpm cli &lt;command&gt;</span> — both consume
            the same <span className="font-mono">PipelineService</span> documented in{" "}
            <span className="font-mono">docs/ARCHITECTURE.md</span>. Full references:{" "}
            <span className="font-mono">docs/MCP.md</span>,{" "}
            <span className="font-mono">docs/CLI.md</span>, and{" "}
            <span className="font-mono">.mcp.json.example</span>.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Row({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="shrink-0 font-mono text-xs text-brand">{name}</dt>
      <dd className="text-xs leading-relaxed text-fg-muted">{desc}</dd>
    </div>
  );
}
