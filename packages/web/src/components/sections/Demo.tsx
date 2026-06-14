"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_AGENTS, gradeForScore, type DemoAgent } from "@/lib/trust";
import { Reveal, SectionHeading } from "./Reveal";

export function Demo() {
  const [active, setActive] = useState<"evil" | "safe">("evil");
  const current: DemoAgent = active === "evil" ? DEMO_AGENTS.evil : DEMO_AGENTS.safe;
  const meta = gradeForScore(current.score);

  return (
    <section id="demo" className="relative isolate border-t border-border bg-bg-elevated/40 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The demo"
          title={
            <>
              Same interface.
              <br />
              <span className="text-gradient">The score tells you everything.</span>
            </>
          }
          description={
            <>
              Two agents. Two addresses. One pipeline. Toggle between a hostile contract and a hardened
              one — the grade does the talking.
            </>
          }
        />

        {/* Toggle */}
        <Reveal delay={0.1}>
          <div className="mt-10 flex w-fit items-center gap-1 rounded-full border border-border bg-surface/60 p-1">
            {(["evil", "safe"] as const).map((key) => {
              const label = key === "evil" ? "MaliciousAgent" : "SafeAgent";
              const isActive = active === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-bg" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="demo-pill"
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          key === "evil"
                            ? "linear-gradient(90deg,#fb7185,#f43f5e)"
                            : "linear-gradient(90deg,#34d399,#10b981)",
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Card */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-2 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface to-bg-elevated p-8 sm:p-10"
            >
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-fg-subtle">
                    {current.address}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">{current.name}</div>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">{current.summary}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div
                    className="text-7xl font-semibold leading-none tracking-tight"
                    style={{ color: meta.color, textShadow: `0 0 50px ${meta.glow}40` }}
                  >
                    {current.grade}
                  </div>
                  <div className="mt-2 font-mono text-sm text-fg-muted">{current.score} / 100</div>
                  <div
                    className="mt-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest"
                    style={{
                      color: meta.color,
                      borderColor: `${meta.color}40`,
                      background: `${meta.color}10`,
                    }}
                  >
                    {meta.label}
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-10">
                <div className="mb-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-fg-subtle">
                  <span>Trust score</span>
                  <span>0 → 100</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-bg">
                  <div className="absolute inset-y-0 left-0 w-[39%] bg-danger/40" />
                  <div className="absolute inset-y-0 left-[39%] w-[16%] bg-caution/40" />
                  <div className="absolute inset-y-0 left-[55%] w-[30%] bg-safe/40" />
                  <motion.div
                    key={`bar-${active}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${current.score}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${meta.color}, ${meta.glow})`,
                      boxShadow: `0 0 14px -2px ${meta.color}80`,
                    }}
                  />
                  {/* Marker for current score */}
                  <div
                    className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
                    style={{ left: `${current.score}%` }}
                  />
                </div>
              </div>

              {/* Findings */}
              <div className="mt-8">
                <div className="mb-3 text-[11px] font-mono uppercase tracking-widest text-fg-subtle">
                  {current.findings.length > 0 ? "Top findings" : "No flagged findings"}
                </div>
                {current.findings.length > 0 ? (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {current.findings.map((f) => {
                      const tone =
                        f.severity === "high"
                          ? "text-danger border-danger/40 bg-danger/5"
                          : f.severity === "medium"
                          ? "text-caution border-caution/40 bg-caution/5"
                          : f.severity === "low"
                          ? "text-info border-info/40 bg-info/5"
                          : "text-fg-muted border-border bg-surface/40";
                      return (
                        <li
                          key={f.label}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${tone}`}
                        >
                          <span className="font-mono uppercase tracking-widest">{f.severity}</span>
                          <span className="text-right text-fg">{f.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="rounded-lg border border-safe/30 bg-safe/5 px-3 py-3 text-xs text-safe">
                    Clean across all 6 layers — connect with confidence.
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Verdict panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`verdict-${active}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="lg:col-span-1"
            >
              <div
                className="flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-8"
                style={{
                  borderColor: `${meta.color}40`,
                  background: `linear-gradient(160deg, ${meta.color}15, transparent 60%)`,
                }}
              >
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: meta.color }}>
                    Verdict
                  </div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: meta.color }}>
                    {active === "evil" ? "Do not connect." : "Safe to connect."}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                    {active === "evil"
                      ? "Unlimited transfer permissions, no access control, and four High-severity findings — the security override caps this at F (20/100) no matter how well the other layers score."
                      : "Audited, withdrawal-capped, operator-whitelisted, and locked behind a 24-hour timelock. Zero High, zero Medium, so the +15 safety bonus applies."}
                  </p>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <Metric label="Analysis time" value="28s" />
                  <Metric label="Layers run" value="6 / 6" />
                  <Metric label="Detectors" value="~90" />
                  <Metric label="Chains" value="4" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Token strip */}
        <Reveal delay={0.15}>
          <div className="mt-6 grid grid-cols-1 gap-3 rounded-3xl border border-border bg-surface/40 p-4 sm:grid-cols-3">
            {DEMO_AGENTS.tokens.map((t) => {
              const tm = gradeForScore(t.score);
              return (
                <div
                  key={t.name}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg/60 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-fg">{t.name}</div>
                    <div className="text-[11px] font-mono text-fg-subtle">{t.address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold" style={{ color: tm.color }}>
                      {t.grade}
                    </div>
                    <div className="text-[10px] font-mono text-fg-muted">{t.score}/100</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-fg-subtle">{label}</div>
      <div className="mt-1 text-lg font-semibold text-fg">{value}</div>
    </div>
  );
}
