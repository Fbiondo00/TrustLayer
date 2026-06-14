"use client";

import { scoreToGrade, type AnalysisMetadata, type TrustScore } from "@/lib/schema";

interface Props {
  score: TrustScore;
  metadata: AnalysisMetadata;
}

const CAP_LABEL: Record<string, string> = {
  two_or_more_high: "capped — 2+ High findings",
  one_high: "capped — 1 High finding",
  slither_not_run: "capped — Slither did not run",
};

export function ScorePanel({ score, metadata }: Props) {
  const meta = scoreToGrade(score.score);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/40">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Grade letter */}
        <div
          className="relative flex flex-col items-center justify-center p-8 lg:col-span-2"
          style={{
            background: `radial-gradient(40rem 20rem at 30% 0%, ${meta.color}22, transparent 60%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 20%, ${meta.glow}55, transparent 50%)`,
            }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <span
              className="font-mono text-7xl font-bold leading-none sm:text-8xl"
              style={{ color: meta.color, textShadow: `0 0 50px ${meta.glow}` }}
            >
              {score.grade}
            </span>
            <span
              className="mt-3 font-mono text-2xl tabular-nums"
              style={{ color: meta.color }}
            >
              {score.score}
              <span className="text-fg-subtle">/100</span>
            </span>
            <span className="mt-2 text-[11px] uppercase tracking-widest text-fg-subtle">
              {meta.label}
            </span>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="border-t border-border p-6 lg:col-span-3 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
              Layer contributions
            </h3>
            <span className="font-mono text-[11px] text-fg-subtle">
              {metadata.duration_ms}ms · {metadata.pipeline_version}
            </span>
          </div>
          <ul className="space-y-2">
            {Object.entries(score.layer_scores).map(([layer, value]) => {
              const weight = score.weights[layer as keyof typeof score.weights] ?? 0;
              const contribution = Math.round(((value as number) * weight) / 100);
              return (
                <li
                  key={layer}
                  className="grid grid-cols-12 items-center gap-3 text-xs"
                >
                  <span className="col-span-4 font-mono capitalize text-fg">
                    {layer}
                  </span>
                  <span className="col-span-2 font-mono tabular-nums text-fg-muted">
                    {weight}%
                  </span>
                  <div className="col-span-4 h-1.5 overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${value}%`,
                        background: `linear-gradient(90deg, ${meta.color}, ${meta.glow})`,
                      }}
                    />
                  </div>
                  <span className="col-span-2 text-right font-mono tabular-nums text-fg-muted">
                    {value} ·+{contribution}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {score.bonus > 0 && (
              <Badge color="#5eead4">+{score.bonus} safety bonus</Badge>
            )}
            {score.cap_reason && (
              <Badge color="#fbbf24">{CAP_LABEL[score.cap_reason] ?? score.cap_reason}</Badge>
            )}
            {metadata.layers_skipped.length > 0 && (
              <Badge color="#6b7488">
                {metadata.layers_skipped.length} layer{metadata.layers_skipped.length === 1 ? "" : "s"} skipped
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]"
      style={{
        color,
        borderColor: `${color}55`,
        background: `${color}11`,
      }}
    >
      {children}
    </span>
  );
}
