"use client";

import { motion } from "framer-motion";
import { Scene } from "@/components/three";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const STATS = [
  { value: "$45M", label: "lost to AI agents in Q1 2026" },
  { value: "8", label: "steps in the analysis pipeline" },
  { value: "A+ → F", label: "the only grade you need" },
];

export function Hero() {
  return (
    <section className="relative isolate flex min-h-screen flex-col overflow-hidden pt-16">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      {/* 3D Canvas — full-bleed behind text, takes pointer events for parallax */}
      <div className="absolute inset-0 -z-10">
        <Scene intensity="normal" className="!absolute inset-0" score={97} />
      </div>

      {/* Bottom fade to bg for clean transition */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-bg to-transparent" />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <motion.a
            href="#problem"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs text-fg-muted backdrop-blur-md hover:border-brand/40 hover:text-fg"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            Live incident: Grok drained via Morse-code tweet — $200K on Base
          </motion.a>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Before you connect,
            <br />
            <span className="text-gradient">check the score.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-fg-muted"
          >
            <span className="font-semibold text-fg">TrustLayer</span> is the credit score for AI agents — a
            wallet-agnostic preflight check that grades any agent contract from A+ to F.
            <span className="text-fg/90"> Mechanical first, AI explains.</span>
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="pointer-events-auto mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#scanner"
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-bg shadow-[0_0_50px_-12px_rgba(94,234,212,0.6)] transition-all hover:bg-brand-strong hover:shadow-[0_0_70px_-10px_rgba(94,234,212,0.8)]"
            >
              Try the scanner
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="#pipeline"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-6 py-3 text-sm font-semibold text-fg backdrop-blur-md transition-all hover:border-border-strong hover:bg-surface"
            >
              See the 8-step pipeline
            </a>
          </motion.div>

          <motion.dl
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="pointer-events-auto mt-14 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3"
          >
            {STATS.map((s) => (
              <div key={s.label} className="border-l border-border pl-4">
                <dt className="text-2xl font-semibold tracking-tight text-gradient">{s.value}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-fg-muted">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </div>

      {/* Floating grade badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute right-4 top-24 hidden lg:block"
      >
        <div className="glass flex flex-col items-center rounded-2xl px-4 py-3 shadow-[0_0_40px_-12px_rgba(94,234,212,0.45)]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted">Live grade</span>
          <span className="text-3xl font-semibold text-safe">A+</span>
          <span className="text-[10px] text-fg-muted">97 / 100</span>
        </div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-2 text-[11px] uppercase tracking-widest text-fg-subtle"
      >
        <span>Scroll</span>
        <span className="h-8 w-px animate-pulse bg-gradient-to-b from-fg-subtle to-transparent" />
      </motion.div>
    </section>
  );
}
