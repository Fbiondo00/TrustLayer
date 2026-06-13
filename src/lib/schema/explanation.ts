/**
 * Score explanation — what the LLM/template layer produces in step 8.
 *
 * The explanation lives at the bottom of every analysis result. It must:
 * - State the grade in plain English.
 * - Justify the score with the dominant findings / caps / bonus.
 * - Recommend an action (connect / review / do not connect).
 *
 * `src/lib/core/explanation.ts` (Phase 2) builds this template-first; the LLM
 * step (`src/lib/core/llm.ts`, Phase 4) rewrites it when its env var is set.
 */

export type ExplanationTone = "safe" | "caution" | "danger";

export interface ScoreExplanationLayer {
  /** Display name (e.g. "Slither", "Permissions"). */
  layer: string;
  /** One-sentence plain-English readout. */
  summary: string;
  tone: ExplanationTone;
}

export interface ScoreExplanation {
  /** Plain-English summary shown at the top — 1 to 2 sentences. */
  summary: string;
  /** Headline verdict — short phrase like "Connect with confidence." */
  verdict: string;
  /** Per-layer contributions in plain English. */
  layers: ScoreExplanationLayer[];
  /** Why the score is what it is — caps, bonus, dominant findings. */
  reasons: string[];
  /** Suggested next steps for the user (connect / don't connect / review). */
  recommendations: string[];
}
