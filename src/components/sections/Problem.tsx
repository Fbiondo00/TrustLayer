"use client";

import { motion } from "framer-motion";
import { Reveal, SectionHeading } from "./Reveal";

const INCIDENTS = [
  {
    when: "May 2026",
    where: "Base",
    who: "Grok",
    amount: "$200K",
    headline: "Prompt-injected via a Morse-code tweet",
    body: "Someone posted a tweet in Morse code. Grok decoded it into a transfer command. BankrBot executed it. Funds gone in one click — no private key stolen.",
    tone: "danger" as const,
  },
  {
    when: "April 2026",
    where: "Multi-chain",
    who: "26 LLM routers",
    amount: "$500K",
    headline: "Routers caught injecting malicious tool calls",
    body: "Researchers found two dozen LLM routers quietly slipping hostile tool calls into the agent's reasoning trace. One of them drained half a million dollars before anyone noticed.",
    tone: "danger" as const,
  },
  {
    when: "February 2026",
    where: "Ethereum",
    who: "Lobstar Wilde",
    amount: "$450K",
    headline: "An agent that misconfigured itself",
    body: "Not even an attack. A misconfigured agent signed a transfer it never should have been allowed to sign. The permission was the vulnerability.",
    tone: "caution" as const,
  },
];

const toneClass = {
  danger: "text-danger border-danger/30 bg-danger/5",
  caution: "text-caution border-caution/30 bg-caution/5",
};

export function Problem() {
  return (
    <section id="problem" className="relative isolate py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The problem"
          title={
            <>
              Crypto's newest attack surface
              <br />
              <span className="text-gradient-warm">isn't a bug. It's the AI.</span>
            </>
          }
          description={
            <>
              You would never paste your seed phrase into a random website. But every day, people
              connect their wallet to AI agents with <span className="text-fg">zero visibility</span> into
              what those agents can do. The padlock icon for AI agents doesn&apos;t exist yet — so we
              built one.
            </>
          }
        />

        {/* Big number band */}
        <Reveal delay={0.1}>
          <div className="mt-14 grid grid-cols-1 gap-4 rounded-3xl border border-border bg-gradient-to-br from-surface to-bg-elevated p-8 sm:grid-cols-3 sm:p-10">
            <div className="sm:col-span-1">
              <div className="text-5xl font-semibold tracking-tight text-gradient-warm sm:text-7xl">
                $45M
              </div>
              <div className="mt-2 text-sm text-fg-muted">lost to AI-driven crypto attacks in Q1 2026 alone</div>
            </div>
            <div className="sm:col-span-2 sm:border-l sm:border-border sm:pl-8">
              <div className="grid grid-cols-2 gap-6">
                <Stat value="$7.63B" label="AI agent market in 2025 (Grand View)" />
                <Stat value="$182.97B" label="Projected market size by 2033" />
                <Stat value="0" label="wallet-agnostic preflight checks that exist today" />
                <Stat value="100%" label="of agents you connect to without a score" />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Incident timeline */}
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {INCIDENTS.map((it, i) => (
            <motion.article
              key={it.headline}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="card-hover group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface/60 p-6"
            >
              <div className={`absolute right-4 top-4 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${toneClass[it.tone]}`}>
                {it.tone}
              </div>
              <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-fg-subtle">
                <span>{it.when}</span>
                <span className="h-1 w-1 rounded-full bg-fg-subtle" />
                <span>{it.where}</span>
              </div>
              <div>
                <div className="text-3xl font-semibold tracking-tight text-gradient-warm">{it.amount}</div>
                <div className="mt-1 text-xs text-fg-muted">drained via {it.who}</div>
              </div>
              <h3 className="text-base font-medium text-fg">{it.headline}</h3>
              <p className="text-sm leading-relaxed text-fg-muted">{it.body}</p>
            </motion.article>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-12 max-w-2xl text-base text-fg-muted">
            <span className="font-semibold text-fg">MetaMask, OKX, and EIP-8004</span> all have agent
            protection — but only inside their own wallets.{" "}
            <span className="text-brand">TrustLayer runs before you connect, on any wallet, on any agent.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tracking-tight text-fg">{value}</div>
      <div className="mt-1 text-xs leading-relaxed text-fg-muted">{label}</div>
    </div>
  );
}
