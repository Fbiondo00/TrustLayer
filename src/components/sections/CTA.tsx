"use client";

import { motion } from "framer-motion";

export function CTA() {
  return (
    <section
      id="scanner"
      className="relative isolate overflow-hidden border-t border-border py-28 sm:py-36"
    >
      {/* Glow backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[120px]" />
        <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30" />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Free · 30 seconds · No wallet needed
          </div>
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Check before
            <br />
            <span className="text-gradient">you connect.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-fg-muted sm:text-lg">
            Paste any agent address. Get a grade in under a minute. Decide with the same clarity a credit
            score gives your bank.
          </p>

          {/* Mock input */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex flex-1 items-center gap-3 rounded-full border border-border bg-surface/60 px-5 py-3.5 text-left backdrop-blur-md focus-within:border-brand/50">
              <span className="font-mono text-xs text-fg-subtle">0x</span>
              <input
                type="text"
                placeholder="paste agent contract address"
                className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
                aria-label="Agent contract address"
              />
            </div>
            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-bg shadow-[0_0_50px_-12px_rgba(94,234,212,0.6)] transition-all hover:bg-brand-strong hover:shadow-[0_0_70px_-10px_rgba(94,234,212,0.8)]"
            >
              Scan
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </motion.form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-fg-subtle">
            <span className="inline-flex items-center gap-2">
              <Dot /> Works on Ethereum, Base, Arbitrum, Optimism
            </span>
            <span className="inline-flex items-center gap-2">
              <Dot /> No signup · No API key
            </span>
            <span className="inline-flex items-center gap-2">
              <Dot /> Open-source
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-brand" />;
}
