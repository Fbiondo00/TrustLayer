"use client";

import { motion } from "framer-motion";
import {
  PIPELINE_STEPS,
  PIPELINE_PHASES,
  type PipelineStepMeta,
} from "@trustlayer/schema";
import { Reveal, SectionHeading } from "./Reveal";

function StepCard({ step, index }: { step: PipelineStepMeta; index: number }) {
  const phase = PIPELINE_PHASES[step.phase];
  return (
    <Reveal delay={(index % 4) * 0.06}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface/50 backdrop-blur-sm transition-colors hover:border-border-strong"
      >
        {/* Phase color accent — left edge */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] transition-opacity duration-300"
          style={{
            background: `linear-gradient(to bottom, transparent, ${phase.color} 25%, ${phase.color} 75%, transparent)`,
          }}
        />

        {/* Background watermark — step number in phase color */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-8 right-2 select-none text-[150px] font-bold leading-none opacity-[0.05] transition-opacity duration-300 group-hover:opacity-[0.1]"
          style={{ color: phase.color }}
        >
          {String(step.step).padStart(2, "0")}
        </span>

        <div className="relative flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest"
              style={{
                color: phase.color,
                borderColor: `rgba(${phase.rgb},0.35)`,
                background: `rgba(${phase.rgb},0.08)`,
              }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{ background: phase.color, boxShadow: `0 0 6px ${phase.color}` }}
              />
              {phase.label}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              {String(step.step).padStart(2, "0")} / 08
            </span>
          </div>

          <h3 className="mt-5 text-lg font-semibold tracking-tight text-fg">
            {step.name}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">
            {step.blurb}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-2 text-[11px] font-mono text-fg-subtle">
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{ color: phase.color }}
              >
                <path
                  d="M2 5l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {step.tool}
            </div>
            {step.weight > 0 ? (
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-mono"
                style={{
                  color: phase.color,
                  borderColor: `rgba(${phase.rgb},0.35)`,
                  background: `rgba(${phase.rgb},0.08)`,
                }}
              >
                {step.weight}%
              </span>
            ) : (
              <span className="rounded-full border border-border bg-bg-elevated px-2 py-0.5 text-[10px] font-mono text-fg-subtle">
                setup
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
}

function PhaseLegend() {
  const phases = Object.values(PIPELINE_PHASES);
  return (
    <Reveal>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-mono uppercase tracking-widest text-fg-subtle">
          Phase flow
        </span>
        <span aria-hidden className="h-px w-6 bg-border" />
        {phases.map((p, i) => (
          <div key={p.id} className="inline-flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }}
              />
              <span className="text-[11px] font-mono uppercase tracking-widest text-fg-muted">
                {p.label}
              </span>
            </div>
            {i < phases.length - 1 && (
              <span aria-hidden className="text-fg-subtle">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function SecurityOverride() {
  return (
    <Reveal>
      <div className="grid grid-cols-1 items-center gap-6 rounded-3xl border border-border bg-gradient-to-br from-brand-soft/40 via-surface to-bg p-8 sm:grid-cols-3 sm:p-10">
        <div className="sm:col-span-2">
          <div className="text-xs font-mono uppercase tracking-widest text-brand">
            Security override
          </div>
          <div className="mt-2 text-xl font-medium text-fg sm:text-2xl">
            The pipeline refuses to be impressed.
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Any single High-severity finding caps the grade at D (44 max). Two or more caps it at
            F (20 max). If Slither can&apos;t run, the grade caps at B+ (80 max) — no exceptions.
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
  );
}

export function Pipeline() {
  return (
    <section id="pipeline" className="relative isolate border-t border-border">
      {/* Ambient phase-color wash — extremely subtle, just enough to bind the grid to the palette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] opacity-[0.35]"
        style={{
          background:
            "radial-gradient(40rem 24rem at 12% 0%, rgba(167,139,250,0.10), transparent 60%), radial-gradient(40rem 24rem at 38% 0%, rgba(251,113,133,0.08), transparent 60%), radial-gradient(40rem 24rem at 64% 0%, rgba(96,165,250,0.10), transparent 60%), radial-gradient(40rem 24rem at 90% 0%, rgba(94,234,212,0.10), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
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
              Every agent contract runs through the same deterministic pipeline.{" "}
              <span className="text-fg">Mechanical first, AI explains.</span>
            </>
          }
        />

        <div className="mt-10">
          <PhaseLegend />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} />
          ))}
        </div>

        <div className="mt-16">
          <SecurityOverride />
        </div>
      </div>
    </section>
  );
}
