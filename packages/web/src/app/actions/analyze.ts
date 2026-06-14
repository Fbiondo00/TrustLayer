/**
 * Scanner server action — consumed by the /scanner route via useActionState.
 *
 * Receives the FormData from <InputForm />, builds an AnalysisInput, drives
 * the pipeline, accumulates step events into a state object the UI renders,
 * and returns the final AnalysisResult on the terminal event.
 *
 * Demo path (no env keys): still returns a real AnalysisResult — permissions
 * + slither + score + explanation always run; the rest emit skipped events.
 */

"use server";

import { getPipeline } from "@trustlayer/core";
import type {
  AnalysisInput,
  AnalysisResult,
  ChainId,
  InputType,
  PipelineEvent,
} from "@trustlayer/schema";
import { CHAIN_IDS } from "@trustlayer/schema";

export interface AnalysisStepState {
  step: number;
  step_id: string;
  status: string;
  message?: string;
  error?: string;
  duration_ms?: number;
}

export interface AnalysisState {
  result?: AnalysisResult;
  steps?: AnalysisStepState[];
  error?: string;
}

function isChainId(value: unknown): value is ChainId {
  return typeof value === "string" && (CHAIN_IDS as readonly string[]).includes(value);
}

function isInputType(value: unknown): value is InputType {
  return value === "address" || value === "source" || value === "bytecode";
}

export async function analyze(
  _prev: AnalysisState,
  formData: FormData,
): Promise<AnalysisState> {
  const inputTypeRaw = formData.get("input_type");
  const chainRaw = formData.get("chain");
  const address = (formData.get("address") as string | null) ?? undefined;
  const source = (formData.get("source") as string | null) ?? undefined;
  const bytecode = (formData.get("bytecode") as string | null) ?? undefined;
  const name = (formData.get("name") as string | null) ?? undefined;

  if (!isInputType(inputTypeRaw)) {
    return { error: "Missing or invalid input_type." };
  }
  const chain: ChainId = isChainId(chainRaw) ? chainRaw : "ethereum";

  const input: AnalysisInput = {
    input_type: inputTypeRaw,
    chain,
    address,
    source,
    bytecode,
    name: name && name.trim().length > 0 ? name : undefined,
  };

  if (inputTypeRaw === "address" && !address?.trim()) {
    return { error: "Address mode requires an address." };
  }
  if (inputTypeRaw === "source" && !source?.trim()) {
    return { error: "Source mode requires Solidity source." };
  }
  if (inputTypeRaw === "bytecode" && !bytecode?.trim()) {
    return { error: "Bytecode mode requires bytecode (hex starting with 0x)." };
  }

  const pipeline = getPipeline(input.chain);
  const steps: AnalysisStepState[] = [];
  let result: AnalysisResult | undefined;

  try {
    for await (const event of pipeline.runAnalysis(input)) {
      updateSteps(steps, event);
      if (event.step === 0 && event.status === "done" && event.result) {
        result = event.result;
      }
    }
  } catch (err) {
    return {
      steps,
      error: err instanceof Error ? err.message : "Pipeline failed unexpectedly.",
    };
  }

  if (!result) {
    return { steps, error: "Pipeline completed without producing a result." };
  }
  return { result, steps };
}

function updateSteps(steps: AnalysisStepState[], event: PipelineEvent): void {
  if (event.step === 0) return; // terminal event — handled via result
  const existing = steps.find((s) => s.step === event.step);
  if (existing) {
    existing.status = event.status;
    if (event.message !== undefined) existing.message = event.message;
    if (event.error !== undefined) existing.error = event.error;
    if (event.duration_ms !== undefined) existing.duration_ms = event.duration_ms;
  } else {
    steps.push({
      step: event.step,
      step_id: event.step_id,
      status: event.status,
      message: event.message,
      error: event.error,
      duration_ms: event.duration_ms,
    });
  }
}
