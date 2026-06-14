"use client";

import type { ScoreExplanation } from "@trustlayer/schema";

interface Props {
  explanation: ScoreExplanation;
}

const TONE_COLOR = {
  safe: "#5eead4",
  caution: "#fbbf24",
  danger: "#fb7185",
} as const;

export function ExplanationCard({ explanation }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          Why this score
        </h3>
        <span className="font-mono text-sm text-fg">{explanation.verdict}</span>
      </div>

      <p className="text-base leading-relaxed text-fg">{explanation.summary}</p>

      {explanation.reasons.length > 0 && (
        <div className="mt-5">
          <SectionLabel>Reasons</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {explanation.reasons.map((r, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-xl border border-border bg-bg-elevated p-3 text-xs text-fg-muted"
              >
                <span className="font-mono text-fg-subtle">›</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {explanation.recommendations.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Recommendations</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {explanation.recommendations.map((r, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-xl border border-brand/40 bg-brand-soft/30 p-3 text-xs text-fg"
              >
                <span className="font-mono text-brand">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <SectionLabel>Layer summaries</SectionLabel>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {explanation.layers.map((l, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-border bg-bg-elevated p-2.5"
            >
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: TONE_COLOR[l.tone] }}
                aria-hidden
              />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                  {l.layer}
                </div>
                <div className="text-xs text-fg-muted">{l.summary}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
      {children}
    </span>
  );
}
