"use client";

import { motion, type Variants } from "framer-motion";
import { Scene } from "@/components/three";
import { LiveScanFeed } from "./LiveScanFeed";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.05 + i * 0.09, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function Hero() {
  return (
    <section className="relative isolate flex min-h-screen flex-col overflow-hidden pt-16">
      {/* 3D Canvas — ambient brand presence (shield composition). Dimmed + softened
          via CSS so it reads as atmospheric depth, not a focal point. */}
      <div className="absolute inset-0 -z-20 opacity-70 [filter:blur(0.4px)_brightness(0.85)]">
        <Scene intensity="normal" className="!absolute inset-0" score={97} />
      </div>

      {/* Aurora wash — brand-colored atmospheric layer above the canvas */}
      <div className="aurora-hero pointer-events-none absolute inset-0 -z-10" />

      {/* Faint scan-line texture for the "verification / credit-score" vibe */}
      <div className="scan-lines pointer-events-none absolute inset-0 -z-10 opacity-50" />

      {/* Legibility veils — soften the canvas so text reads cleanly */}
      <div className="pointer-events-none absolute inset-0 -z-[5] bg-gradient-to-r from-bg via-bg/65 to-bg/20 lg:from-bg lg:via-bg/50 lg:to-bg/10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-72 bg-gradient-to-t from-bg via-bg/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-32 bg-gradient-to-b from-bg/80 to-transparent" />

      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-[5] h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-40 sm:px-6 lg:px-8">
        <div className="max-w-2xl lg:max-w-3xl">
          <motion.a
            href="#problem"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="pointer-events-auto group inline-flex items-center gap-2.5 rounded-full border border-danger/30 bg-danger/[0.06] py-1.5 pl-2 pr-4 text-xs text-fg/90 backdrop-blur-md transition-colors hover:border-danger/50 hover:bg-danger/[0.1]"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-danger">
              Live
            </span>
            <span className="hidden sm:inline text-fg-muted">·</span>
            <span className="hidden sm:inline text-fg-muted group-hover:text-fg">
              Grok drained via Morse-code tweet — $200K on Base
            </span>
            <span className="sm:hidden text-fg-muted">Grok · $200K drained</span>
          </motion.a>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[5.25rem]"
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
            className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-fg-muted sm:text-xl"
          >
            <span className="font-semibold text-fg">TrustLayer</span> is the credit score for AI
            agents — a wallet-agnostic preflight check that grades any agent contract from{" "}
            <span className="text-fg">A+ to F</span>.{" "}
            <span className="text-fg/90">Mechanical first, AI explains.</span>
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
              className="group relative inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-bg shadow-[0_0_60px_-12px_rgba(167,139,250,0.65),0_8px_24px_-12px_rgba(167,139,250,0.5)] transition-all hover:bg-brand-strong hover:shadow-[0_0_80px_-10px_rgba(167,139,250,0.9),0_10px_30px_-12px_rgba(167,139,250,0.6)]"
            >
              Scan an agent
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 6h8M6 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a
              href="#pipeline"
              className="group inline-flex items-center gap-2.5 rounded-full border border-border-strong bg-bg-elevated/70 px-6 py-3.5 text-sm font-semibold text-fg backdrop-blur-md transition-all hover:border-brand/50 hover:bg-bg-elevated"
            >
              See the pipeline
              <svg
                className="h-3.5 w-3.5 text-fg-muted transition-colors group-hover:text-brand"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 4h8M2 6h6M2 8h8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </motion.div>
        </div>
      </div>

      {/* Bottom: live scan feed + scroll hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-4 sm:px-6 lg:px-8">
        <LiveScanFeed />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.9, duration: 0.8 }}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-fg-subtle"
        >
          <span>See the pipeline</span>
          <span className="relative flex h-8 w-px">
            <span className="absolute inset-0 animate-pulse bg-gradient-to-b from-brand via-fg-subtle to-transparent" />
          </span>
        </motion.div>
      </div>
    </section>
  );
}
