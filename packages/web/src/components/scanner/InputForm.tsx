"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { analyze, type AnalysisState } from "@/app/actions/analyze";
import type { ChainId, InputType } from "@trustlayer/schema";
import { CHAIN_IDS, CHAIN_LABEL } from "@trustlayer/schema";
import { DEMO_FIXTURES } from "@trustlayer/core/demo";
import { PipelineProgress } from "./PipelineProgress";
import { ScorePanel } from "./ScorePanel";
import { FindingsList } from "./FindingsList";
import { PermissionsCard } from "./PermissionsCard";
import { TXHistoryCard } from "./TXHistoryCard";
import { ApprovalsCard } from "./ApprovalsCard";
import { AIBlock } from "./AIBlock";
import { ExplanationCard } from "./ExplanationCard";

const INPUT_TYPES: Array<{ id: InputType; label: string; hint: string }> = [
  { id: "source", label: "Solidity source", hint: "Paste a contract" },
  { id: "address", label: "Deployed address", hint: "0x… on mainnet / base / arb / op" },
  { id: "bytecode", label: "Bytecode", hint: "0x-prefixed runtime bytecode" },
];

export function InputForm() {
  const [state, formAction, isPending] = useActionState<AnalysisState, FormData>(
    analyze,
    {},
  );
  const [inputType, setInputType] = useState<InputType>("source");
  const [chain, setChain] = useState<ChainId>("ethereum");
  const [source, setSource] = useState<string>("");
  const [bytecode, setBytecode] = useState<string>("");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (state.result || state.error) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state.result, state.error]);

  function loadDemo(id: "malicious" | "safe") {
    const fixture = DEMO_FIXTURES.find((f) => f.id === id);
    if (!fixture) return;
    setInputType("source");
    setSource(fixture.source);
  }

  return (
    <div className="space-y-10">
      <DemoButtons onPick={loadDemo} />

      <form action={formAction} className="space-y-5">
        <fieldset className="rounded-2xl border border-border bg-surface/40 p-1.5">
          <legend className="sr-only">Input type</legend>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            {INPUT_TYPES.map((opt) => {
              const active = opt.id === inputType;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInputType(opt.id)}
                  className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                    active ? "bg-brand-soft ring-1 ring-brand" : "hover:bg-bg-elevated"
                  }`}
                  aria-pressed={active}
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      active ? "bg-brand" : "bg-fg-subtle/60"
                    }`}
                  />
                  <span>
                    <span className="block text-sm font-medium text-fg">{opt.label}</span>
                    <span
                      className={`block font-mono text-[11px] ${
                        active ? "text-fg-muted" : "text-fg-subtle"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <input type="hidden" name="input_type" value={inputType} />

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="chain"
              className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg-subtle"
            >
              Chain
            </label>
            <select
              id="chain"
              name="chain"
              value={chain}
              onChange={(e) => setChain(e.target.value as ChainId)}
              className="rounded-lg border border-border bg-bg-elevated px-3 py-2 font-mono text-sm text-fg outline-none transition-colors focus:border-brand"
            >
              {CHAIN_IDS.map((c) => (
                <option key={c} value={c}>
                  {CHAIN_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          {inputType === "address" && (
            <p className="font-mono text-[11px] text-fg-subtle">
              Token-risk, TX-history, and approvals layers need their env keys
              (DEDAUB / ETHERSCAN / RPC).
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="scan-input"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg-subtle"
          >
            {inputType === "source"
              ? "Solidity source"
              : inputType === "address"
                ? "Contract address"
                : "Runtime bytecode (hex)"}
          </label>
          {inputType === "address" ? (
            <input
              id="scan-input"
              name="address"
              type="text"
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 font-mono text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle/60 focus:border-brand"
            />
          ) : (
            <textarea
              id="scan-input"
              name={inputType === "source" ? "source" : "bytecode"}
              rows={inputType === "source" ? 14 : 6}
              value={inputType === "source" ? source : bytecode}
              onChange={(e) =>
                inputType === "source"
                  ? setSource(e.target.value)
                  : setBytecode(e.target.value)
              }
              placeholder={
                inputType === "source"
                  ? "// Paste your Solidity source here"
                  : "0x60806040526040519080601f630152a260..."
              }
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 font-mono text-xs leading-relaxed text-fg outline-none transition-colors placeholder:text-fg-subtle/60 focus:border-brand"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-bg shadow-[0_0_60px_-12px_rgba(167,139,250,0.65),0_8px_24px_-12px_rgba(167,139,250,0.5)] transition-all hover:bg-brand-strong hover:shadow-[0_0_80px_-10px_rgba(167,139,250,0.9)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Spinner /> Scanning…
              </>
            ) : (
              <>
                Scan
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          <p className="font-mono text-[11px] text-fg-subtle">
            8 steps · mechanical first, AI explains.
          </p>
        </div>

        {state.error && (
          <div
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {state.error}
          </div>
        )}
      </form>

      <div ref={resultsRef}>
        {isPending && <PipelineProgress steps={[]} pending />}
        {!isPending && state.steps && state.steps.length > 0 && (
          <PipelineProgress steps={state.steps} />
        )}
        {!isPending && state.result && <ResultGrid state={state} />}
      </div>
    </div>
  );
}

function ResultGrid({ state }: { state: AnalysisState }) {
  const r = state.result!;
  return (
    <div className="space-y-6">
      <ScorePanel score={r.score} metadata={r.metadata} />
      <ExplanationCard explanation={r.explanation} />
      <FindingsList findings={r.findings} />
      {r.permissions && <PermissionsCard report={r.permissions} />}
      {r.txHistory && !r.txHistory.empty && <TXHistoryCard report={r.txHistory} />}
      {r.approvals && !r.approvals.empty && <ApprovalsCard report={r.approvals} />}
      <AIBlock explanation={r.explanation} />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function DemoButtons({ onPick }: { onPick: (id: "malicious" | "safe") => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          One-click fixtures
        </h3>
        <span className="font-mono text-[10px] text-fg-subtle">
          reproducible demo · no env required
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DEMO_FIXTURES.map((fixture) => (
          <button
            key={fixture.id}
            type="button"
            onClick={() => onPick(fixture.id)}
            className="group flex flex-col gap-1 rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left transition-all hover:border-brand hover:bg-brand-soft/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-fg">{fixture.label}</span>
              <span
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{
                  color:
                    fixture.id === "malicious"
                      ? "#fb7185"
                      : "#5eead4",
                }}
              >
                {fixture.hint}
              </span>
            </div>
            <span className="text-xs leading-relaxed text-fg-muted">
              {fixture.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 6h8m0 0L6.5 2.5M10 6L6.5 9.5" />
    </svg>
  );
}
