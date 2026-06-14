"use client";

import { useMemo, useState } from "react";
import type { Finding, Severity } from "@trustlayer/schema";
import { SEVERITY_ORDER } from "@trustlayer/schema";

interface Props {
  findings: Finding[];
}

const SEVERITY_COLOR: Record<Severity, string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#a78bfa",
  informational: "#9aa3b8",
  optimization: "#60a5fa",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  informational: "Info",
  optimization: "Optimization",
};

type Filter = "all" | Severity;

export function FindingsList({ findings }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<Severity, number> = {
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
      optimization: 0,
    };
    for (const f of findings) c[f.severity]++;
    return c;
  }, [findings]);

  const filtered = useMemo(() => {
    if (filter === "all") return findings;
    return findings.filter((f) => f.severity === filter);
  }, [findings, filter]);

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          Findings · {findings.length}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            All {findings.length}
          </FilterButton>
          {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => (
            <FilterButton
              key={s}
              color={SEVERITY_COLOR[s]}
              active={filter === s}
              onClick={() => setFilter(s)}
            >
              {SEVERITY_LABEL[s]} {counts[s]}
            </FilterButton>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-fg-subtle">
          No findings at this filter.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((f, i) => (
            <li
              key={`${f.id}-${i}`}
              className="grid grid-cols-1 gap-1 rounded-xl border border-border bg-bg-elevated p-3 sm:grid-cols-[auto_1fr]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                  style={{
                    color: SEVERITY_COLOR[f.severity],
                    background: `${SEVERITY_COLOR[f.severity]}1a`,
                    border: `1px solid ${SEVERITY_COLOR[f.severity]}44`,
                  }}
                >
                  {SEVERITY_LABEL[f.severity]}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                  {f.source}
                </span>
              </div>
              <div className="sm:pl-3">
                <div className="text-sm font-medium text-fg">{f.title}</div>
                {f.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                    {f.description}
                  </p>
                )}
                {f.reference && (
                  <p className="mt-1 font-mono text-[10px] text-fg-subtle">{f.reference}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterButton({
  active,
  color = "#a78bfa",
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest transition-all ${
        active ? "text-bg" : "text-fg-muted hover:text-fg"
      }`}
      style={{
        color: active ? "#05060a" : color,
        background: active ? color : "transparent",
        borderColor: `${color}55`,
      }}
    >
      {children}
    </button>
  );
}
