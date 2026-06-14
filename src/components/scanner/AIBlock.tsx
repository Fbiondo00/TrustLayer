"use client";

import type { ScoreExplanation } from "@/lib/schema";

interface Props {
  explanation: ScoreExplanation;
}

/**
 * The AI block is rendered as the explanation footer — it surfaces the
 * template-generated summary when the LLM step is disabled, and otherwise
 * shows the AI's plain-English analysis (already folded into explanation
 * via the score explainer's `ai` layer summary).
 *
 * When the LLM is enabled, explanation.layers[5].summary contains the AI
 * output; when disabled, it's the mechanical-only fallback.
 */
export function AIBlock({ explanation }: Props) {
  const aiLayer = explanation.layers.find((l) => l.layer === "AI intent");
  const text = aiLayer?.summary ?? "AI analysis unavailable.";
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          AI intent analysis
        </h3>
        <span
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: aiLayer?.tone === "safe" ? "#5eead4" : aiLayer?.tone === "caution" ? "#fbbf24" : "#fb7185" }}
        >
          {aiLayer?.tone ?? "—"}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-fg-muted whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}
