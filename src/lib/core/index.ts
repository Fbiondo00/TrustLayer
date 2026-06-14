/**
 * Core pipeline + services — single import surface for the rest of the app.
 *
 * Mirrors `@trustlayer/core` from the NapulETH orchestrator. Phases 2-5 add
 * services one at a time. Currently exports the trust-score calculator only.
 */

export { TrustScoreCalculator } from "./trustscore";
