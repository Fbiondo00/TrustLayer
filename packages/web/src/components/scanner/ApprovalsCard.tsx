"use client";

import type { ApprovalReport } from "@trustlayer/schema";

interface Props {
  report: ApprovalReport;
}

export function ApprovalsCard({ report }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          Wallet approvals · {report.score}/100
        </h3>
        <span
          className="font-mono text-[11px] uppercase tracking-widest"
          style={{ color: RISK_COLOR[report.riskLevel] }}
        >
          {report.riskLevel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Allowances" value={String(report.allowances.length)} />
        <Metric label="Tokens" value={String(report.tokenCount)} />
        <Metric
          label="Unlimited"
          value={String(report.unlimitedCount)}
          accent={report.unlimitedCount > 0 ? "#fb7185" : undefined}
        />
      </div>

      <ul className="mt-4 space-y-1.5">
        {report.allowances.slice(0, 8).map((a, i) => (
          <li
            key={`${a.token}-${a.spender}-${i}`}
            className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-border bg-bg-elevated p-3 text-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-fg">{a.tokenSymbol}</span>
                {a.isUnlimited && (
                  <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-danger">
                    unlimited
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-fg-subtle">
                → {a.spenderLabel ?? `${a.spender.slice(0, 8)}…${a.spender.slice(-4)}`}
              </div>
            </div>
            <span className="self-center font-mono tabular-nums text-fg-muted">
              {formatAmount(a.amount, a.decimals)}
            </span>
          </li>
        ))}
      </ul>

      {report.allowances.length > 8 && (
        <p className="mt-3 font-mono text-[10px] text-fg-subtle">
          + {report.allowances.length - 8} more…
        </p>
      )}
    </div>
  );
}

function formatAmount(raw: string, decimals: number): string {
  try {
    const bi = BigInt(raw);
    if (bi >= BigInt(2) ** BigInt(255)) return "MAX";
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = bi / divisor;
    const fraction = bi % divisor;
    if (whole > 0n) {
      const fracStr = fraction.toString().padStart(decimals, "0").slice(0, 2);
      return `${whole.toString()}.${fracStr}`;
    }
    return raw;
  } catch {
    return raw;
  }
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
        {label}
      </div>
      <div
        className="mt-1 font-mono text-lg tabular-nums"
        style={{ color: accent ?? "var(--color-fg)" }}
      >
        {value}
      </div>
    </div>
  );
}

const RISK_COLOR: Record<ApprovalReport["riskLevel"], string> = {
  safe: "#5eead4",
  low: "#5eead4",
  medium: "#fbbf24",
  high: "#fb7185",
  critical: "#fb7185",
};
