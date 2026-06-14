"use client";

import type { AnomalyFlag, TXReport } from "@/lib/schema";

interface Props {
  report: TXReport;
}

const ANOMALY_COLOR: Record<AnomalyFlag, string> = {
  recently_created: "#fbbf24",
  high_failure_rate: "#fb7185",
  no_activity: "#fbbf24",
  single_large_drain: "#fb7185",
  interacts_with_flagged: "#fb7185",
  flash_and_drain_pattern: "#fb7185",
};

export function TXHistoryCard({ report }: Props) {
  const m = report.metrics;
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          TX history · {report.score}/100
        </h3>
        <span className="font-mono text-[11px] text-fg-subtle">
          {m.total_transactions} txs · {m.days_active}d active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Transactions" value={String(m.total_transactions)} />
        <Metric label="Success rate" value={`${Math.round(m.success_rate * 100)}%`} />
        <Metric label="Counterparties" value={String(m.unique_counterparties)} />
        <Metric label="Days active" value={String(m.days_active)} />
      </div>

      {report.anomaly_flags.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Anomalies ({report.anomaly_flags.length})</SectionLabel>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {report.anomaly_flags.map((flag) => (
              <li
                key={flag}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                style={{
                  color: ANOMALY_COLOR[flag],
                  background: `${ANOMALY_COLOR[flag]}11`,
                  borderColor: `${ANOMALY_COLOR[flag]}44`,
                }}
              >
                {flag.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg tabular-nums text-fg">{value}</div>
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
