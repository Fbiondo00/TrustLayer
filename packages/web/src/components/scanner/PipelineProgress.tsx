"use client";

import { PIPELINE_STEPS, PIPELINE_PHASES } from "@trustlayer/schema";
import type { AnalysisStepState } from "@/app/actions/analyze";

interface Props {
  steps: AnalysisStepState[];
  /** When true, the pipeline is running — show all steps as pending/running. */
  pending?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#6b7488",
  running: "#a78bfa",
  done: "#5eead4",
  skipped: "#6b7488",
  error: "#fb7185",
};

const STATUS_ICON: Record<string, string> = {
  pending: "○",
  running: "◐",
  done: "●",
  skipped: "○",
  error: "✕",
};

export function PipelineProgress({ steps, pending }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          Pipeline
        </h3>
        <span className="font-mono text-[11px] text-fg-subtle">
          {pending ? "running…" : `${steps.filter((s) => s.status === "done").length}/${steps.length} done`}
        </span>
      </div>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE_STEPS.map((meta) => {
          const state = steps.find((s) => s.step_id === meta.id);
          const status = pending && !state ? "running" : state?.status ?? "pending";
          const color = STATUS_COLOR[status] ?? STATUS_COLOR.pending;
          const phase = PIPELINE_PHASES[meta.phase];
          return (
            <li
              key={meta.id}
              className="rounded-xl border border-border bg-bg-elevated px-3 py-2.5"
              style={{ borderColor: status !== "pending" ? `${color}55` : undefined }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color }}
                  aria-hidden
                >
                  {STATUS_ICON[status]}
                </span>
                <span className="text-xs font-medium text-fg">{meta.name}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                  {phase.label}
                </span>
                {state?.duration_ms !== undefined && (
                  <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
                    {state.duration_ms}ms
                  </span>
                )}
              </div>
              {state?.message && status === "skipped" && (
                <p className="mt-1 font-mono text-[10px] text-fg-subtle">
                  {state.message}
                </p>
              )}
              {state?.error && status === "error" && (
                <p className="mt-1 font-mono text-[10px] text-danger">{state.error}</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
