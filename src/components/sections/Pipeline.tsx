"use client";

import { motion } from "framer-motion";
import { PIPELINE } from "@/lib/trust";
import { Reveal, SectionHeading } from "./Reveal";

export function Pipeline() {
  return (
    <section id="pipeline" className="relative isolate border-t border-border bg-bg-elevated/40 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-dotgrid opacity-40" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The pipeline"
          title={
            <>
              Eight steps.
              <br />
              <span className="text-gradient">Zero guesswork.</span>
            </>
          }
          description={
            <>
              Every agent contract runs through the same deterministic pipeline. No vibes. No vibes-based
              security. <span className="text-fg">Mechanical first, AI explains.</span>
            </>
          }
        />

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: (i % 4) * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="card-hover group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-surface/60 p-5"
            >
              {/* Connector arrow on the right (hidden on the last column of each row) */}
              {i !== PIPELINE.length - 1 && (
                <div className="pointer-events-none absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                  <svg width="22" height="8" viewBox="0 0 22 8" fill="none" className="text-border-strong">
                    <path d="M0 4h18m0 0L15 1m3 3l-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
                  Step {String(step.step).padStart(2, "0")}
                </span>
                {step.weight > 0 ? (
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-mono text-brand">
                    {step.weight}% weight
                  </span>
                ) : (
                  <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-mono text-fg-subtle">
                    setup
                  </span>
                )}
              </div>

              <h3 className="text-base font-medium text-fg">{step.name}</h3>
              <p className="text-xs leading-relaxed text-fg-muted">{step.blurb}</p>

              <div className="mt-auto flex items-center gap-1.5 pt-2 text-[11px] font-mono text-fg-subtle">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-brand">
                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {step.tool}
              </div>
            </motion.div>
          ))}
        </div>

        <Reveal delay={0.15}>
          <div className="mt-12 grid grid-cols-1 items-center gap-6 rounded-3xl border border-border bg-gradient-to-br from-brand-soft/40 via-surface to-bg p-8 sm:grid-cols-3 sm:p-10">
            <div className="sm:col-span-2">
              <div className="text-xs font-mono uppercase tracking-widest text-brand">Security override</div>
              <div className="mt-2 text-xl font-medium text-fg sm:text-2xl">
                The pipeline refuses to be impressed.
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                Any single High-severity finding caps the grade at D (44 max). Two or more caps it at F
                (20 max). If Slither can&apos;t run, the grade caps at B+ (80 max) — no exceptions.
              </p>
            </div>
            <div className="sm:border-l sm:border-border sm:pl-8">
              <ul className="space-y-3 text-sm font-mono">
                <li className="flex items-center justify-between gap-4">
                  <span className="text-fg-muted">2+ High</span>
                  <span className="text-danger">F · 20 max</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-fg-muted">1 High</span>
                  <span className="text-danger">D · 44 max</span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-fg-muted">No Slither</span>
                  <span className="text-caution">B+ · 80 max</span>
                </li>
                <li className="flex items-center justify-between gap-4 border-t border-border pt-3">
                  <span className="text-fg-muted">0 H + 0 M</span>
                  <span className="text-safe">+15 bonus</span>
                </li>
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
