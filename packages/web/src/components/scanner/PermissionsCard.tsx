"use client";

import type { PermissionPatternId, PermissionReport } from "@trustlayer/schema";

interface Props {
  report: PermissionReport;
}

export function PermissionsCard({ report }: Props) {
  const negatives = report.matched.filter((m) => NEG_IDS.has(m.id as NegId));
  const positives = report.matched.filter(
    (m) => !NEG_IDS.has(m.id as NegId),
  );

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          Permissions · {report.score}/100
        </h3>
        <span
          className="font-mono text-[11px] uppercase tracking-widest"
          style={{ color: RISK_COLOR[report.risk_level] }}
        >
          {report.risk_level}
        </span>
      </div>

      {negatives.length > 0 && (
        <div className="mb-4">
          <SectionLabel color="#fb7185">
            Dangerous capabilities ({negatives.length})
          </SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {negatives.map((f) => (
              <PermissionRow
                key={f.id}
                title={f.title}
                description={f.description}
                delta={report.deltas[f.id as PermissionPatternId] ?? 0}
                deltaColor="#fb7185"
              />
            ))}
          </ul>
        </div>
      )}

      {positives.length > 0 && (
        <div>
          <SectionLabel color="#5eead4">
            Safety guards ({positives.length})
          </SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {positives.map((f) => (
              <PermissionRow
                key={f.id}
                title={f.title}
                description={f.description}
                delta={report.deltas[f.id as PermissionPatternId] ?? 0}
                deltaColor="#5eead4"
              />
            ))}
          </ul>
        </div>
      )}

      {report.matched.length === 0 && (
        <p className="py-6 text-center font-mono text-sm text-fg-subtle">
          No permission patterns matched. Baseline clean.
        </p>
      )}
    </div>
  );
}

function PermissionRow({
  title,
  description,
  delta,
  deltaColor,
}: {
  title: string;
  description?: string;
  delta: number;
  deltaColor: string;
}) {
  return (
    <li className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-border bg-bg-elevated p-3">
      <div>
        <div className="text-sm font-medium text-fg">{title}</div>
        {description && (
          <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
        )}
      </div>
      <span
        className="self-start font-mono text-xs tabular-nums"
        style={{ color: deltaColor }}
      >
        {delta > 0 ? `+${delta}` : delta}
      </span>
    </li>
  );
}

function SectionLabel({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-widest"
      style={{ color }}
    >
      {children}
    </span>
  );
}

const RISK_COLOR: Record<PermissionReport["risk_level"], string> = {
  safe: "#5eead4",
  caution: "#fbbf24",
  danger: "#fb7185",
};

type NegId =
  | "transfer_unlimited"
  | "self_destruct"
  | "owner_drain"
  | "arbitrary_call"
  | "reentrancy_exposed"
  | "no_access_control";

const NEG_IDS = new Set<NegId>([
  "transfer_unlimited",
  "self_destruct",
  "owner_drain",
  "arbitrary_call",
  "reentrancy_exposed",
  "no_access_control",
]);
