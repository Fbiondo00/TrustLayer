"use client";

import { motion } from "framer-motion";
import { Reveal, SectionHeading } from "./Reveal";

const LAYERS = [
  { name: "Slither", weight: 30, tool: "Trail of Bits", color: "#5eead4", blurb: "~90 static vulnerability detectors." },
  { name: "Dedaub TokIn", weight: 20, tool: "Dedaub", color: "#60a5fa", blurb: "30+ token risk flags from on-chain metadata." },
  { name: "Permissions", weight: 20, tool: "Heuristics", color: "#a78bfa", blurb: "9 patterns — 5 negative, 4 positive." },
  { name: "Wallet approvals", weight: 15, tool: "multicall3", color: "#34d399", blurb: "ERC20 allowance blast radius across chains." },
  { name: "TX history", weight: 10, tool: "Etherscan V2", color: "#fbbf24", blurb: "Anomaly detection on past calls." },
  { name: "AI intent", weight: 5, tool: "Gemma 4", color: "#fb7185", blurb: "Translates findings into plain English." },
];

export function Score() {
  return (
    <section id="score" className="relative isolate py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The score"
          title={
            <>
              One number.
              <br />
              <span className="text-gradient">Six layers underneath.</span>
            </>
          }
          description={
            <>
              The grade is a weighted blend of six mechanical layers — Slither carries the heaviest
              weight, AI carries the least. Detection is deterministic. Reproducible. Auditable.
            </>
          }
        />

        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-5">
          {/* Layers */}
          <div className="lg:col-span-3">
            <div className="space-y-3">
              {LAYERS.map((layer, i) => (
                <motion.div
                  key={layer.name}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="grid grid-cols-12 items-center gap-4 rounded-xl border border-border bg-surface/40 px-4 py-3.5"
                >
                  <div className="col-span-12 flex items-center justify-between sm:col-span-4">
                    <div>
                      <div className="text-sm font-medium text-fg">{layer.name}</div>
                      <div className="text-[11px] font-mono text-fg-subtle">{layer.tool}</div>
                    </div>
                    <span
                      className="font-mono text-sm tabular-nums"
                      style={{ color: layer.color }}
                    >
                      {layer.weight}%
                    </span>
                  </div>
                  <div className="col-span-9 sm:col-span-6">
                    <div className="h-2 overflow-hidden rounded-full bg-bg">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${layer.weight * 3.2}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${layer.color}, ${layer.color}80)`,
                          boxShadow: `0 0 12px -2px ${layer.color}80`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 hidden text-[11px] leading-tight text-fg-muted sm:col-span-2 sm:block">
                    {layer.blurb}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Gauge / live readout */}
          <div className="lg:col-span-2">
            <Reveal delay={0.1}>
              <div className="sticky top-24 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-bg-elevated via-surface to-bg p-8">
                <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand/20 blur-3xl" />
                <div className="relative">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-fg-muted">
                    Live grade
                  </div>
                  <div className="mt-2 flex items-end gap-4">
                    <div className="text-7xl font-semibold tracking-tight text-safe">A+</div>
                    <div className="pb-2">
                      <div className="text-sm font-mono text-fg-muted">97 / 100</div>
                      <div className="text-[11px] text-fg-subtle">SafeAgent · audited</div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3 text-sm">
                    <Row label="Slither" value="0 High · 0 Med" tone="safe" />
                    <Row label="Dedaub" value="0 risk flags" tone="safe" />
                    <Row label="Permissions" value="Limited + whitelisted" tone="safe" />
                    <Row label="Approvals" value="No unlimited allowances" tone="safe" />
                    <Row label="TX history" value="No anomalies" tone="safe" />
                    <Row label="AI summary" value="Connect with confidence" tone="brand" />
                  </div>

                  <div className="mt-8 rounded-2xl border border-border bg-bg/60 p-4 text-xs leading-relaxed text-fg-muted">
                    <span className="font-mono text-caution">Safety bonus applied</span> — 0 High and 0
                    Medium findings unlock +15 points.
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "safe" | "brand" | "caution" | "danger";
}) {
  const toneClass = {
    safe: "text-safe",
    brand: "text-brand",
    caution: "text-caution",
    danger: "text-danger",
  }[tone];
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
      <span className="text-fg-muted">{label}</span>
      <span className={`font-mono text-xs ${toneClass}`}>{value}</span>
    </div>
  );
}
