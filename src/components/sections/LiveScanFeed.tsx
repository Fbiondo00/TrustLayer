"use client";

import { motion } from "framer-motion";
import type { TrustGrade } from "@/lib/trust";

interface ScanEntry {
  address: string;
  grade: TrustGrade;
  score: number;
  finding: string;
  ago: string;
  chain: "ETH" | "BASE" | "ARB" | "OP";
}

const FEED: ScanEntry[] = [
  { address: "0xeV1L…a89c", grade: "F", score: 20, finding: "Unlimited transfer · 4 High", ago: "0.4s", chain: "BASE" },
  { address: "0x5AfE…77c1", grade: "A+", score: 97, finding: "Audited · timelocked", ago: "1s", chain: "ETH" },
  { address: "0x7A13…9dE2", grade: "D", score: 41, finding: "Arbitrary external call", ago: "6s", chain: "ARB" },
  { address: "0xDeAd…beEf", grade: "F", score: 14, finding: "Self-destruct · no ACL", ago: "18s", chain: "BASE" },
  { address: "0xC02a…6CC2", grade: "A+", score: 100, finding: "WETH · informational only", ago: "3s", chain: "ETH" },
  { address: "0x9BcE…01fa", grade: "A-", score: 89, finding: "1 Medium · 37 detectors", ago: "12s", chain: "ETH" },
  { address: "0xA0b8…eB48", grade: "B+", score: 83, finding: "USDC · 3 Medium", ago: "31s", chain: "ETH" },
];

const GRADE_STYLES: Record<TrustGrade, { color: string; bg: string }> = {
  "A+": { color: "#5eead4", bg: "rgba(94,234,212,0.12)" },
  "A": { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  "A-": { color: "#c4b5fd", bg: "rgba(196,181,253,0.12)" },
  "B+": { color: "#a3e635", bg: "rgba(163,230,53,0.12)" },
  "B": { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  "B-": { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  "C+": { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  "C": { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  "D": { color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  "F": { color: "#fb7185", bg: "rgba(251,113,133,0.14)" },
};

function ScanCard({ entry, live }: { entry: ScanEntry; live?: boolean }) {
  const style = GRADE_STYLES[entry.grade];
  return (
    <motion.div
      initial={false}
      className={`relative flex shrink-0 items-center gap-3.5 overflow-hidden rounded-2xl border px-4 py-2.5 backdrop-blur-sm transition-colors ${
        live
          ? "border-brand/40 bg-brand/[0.06]"
          : "border-border bg-surface/40"
      }`}
    >
      {live && (
        <>
          <span className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-brand to-transparent" />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-brand/35 to-transparent"
            style={{ filter: "blur(3px)" }}
            initial={{ x: "-150%" }}
            animate={{ x: "450%" }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.4 }}
          />
        </>
      )}
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
        {entry.chain}
      </span>
      <span
        className="grid h-9 w-9 place-items-center rounded-lg font-mono text-xs font-semibold"
        style={{
          color: style.color,
          background: style.bg,
          boxShadow: `inset 0 0 0 1px ${style.color}40, 0 0 12px -2px ${style.color}66`,
        }}
      >
        {entry.grade}
      </span>
      <div className="flex w-[150px] flex-col">
        <span className="font-mono text-xs text-fg">{entry.address}</span>
        <span className="mt-0.5 truncate font-mono text-[10px] text-fg-subtle">
          {entry.finding}
        </span>
      </div>
      {live ? (
        <span className="flex items-center gap-1 font-mono text-[10px] text-brand">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          scanning
        </span>
      ) : (
        <span className="font-mono text-[10px] text-fg-subtle">{entry.ago}</span>
      )}
    </motion.div>
  );
}

export function LiveScanFeed() {
  const doubled = [...FEED, ...FEED];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.8 }}
      className="pointer-events-none relative w-full overflow-hidden mask-fade"
    >
      <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-fg-muted">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
        </span>
        Live trust feed
        <span className="text-fg-subtle">·</span>
        <span className="text-fg-subtle">7 agents graded in the last minute</span>
      </div>
      <div className="relative flex overflow-hidden">
        <div
          className="flex shrink-0 items-center gap-3 pr-3"
          style={{ animation: "marquee 50s linear infinite" }}
        >
          {doubled.map((e, i) => (
            <ScanCard key={i} entry={e} live={i === 0} />
          ))}
        </div>
        <div
          className="flex shrink-0 items-center gap-3 pr-3"
          style={{ animation: "marquee 50s linear infinite" }}
          aria-hidden
        >
          {doubled.map((e, i) => (
            <ScanCard key={`dup-${i}`} entry={e} live={i === 0} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
