/**
 * TX-history layer — anomaly detection on past on-chain calls.
 *
 * Pulls the agent's txlist via Etherscan V2, then runs simple statistical
 * checks against ANOMALY_THRESHOLDS. Anything that crosses a threshold
 * becomes a Finding and reduces this layer's score.
 */

import type { Finding } from "./finding";

export type TXAnomalyType =
  | "high_frequency"
  | "large_transfer"
  | "new_contract"
  | "swept_balance"
  | "unusual_recipient"
  | "failed_call_cluster";

export interface TXAnomaly {
  type: TXAnomalyType;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  /** TX hash or count, depending on type. */
  evidence?: string;
}

/**
 * Thresholds for anomaly detection. Tuned to flag the kinds of patterns that
 * preceded real agent-drain incidents (high-frequency bursts before a drain,
 * very large transfers, brand-new contracts, etc.).
 */
export const ANOMALY_THRESHOLDS = {
  /** Transactions per minute before flagging high_frequency. */
  txPerMinute: 10,
  /** Single transfer above this USD value triggers large_transfer. */
  largeTransferUsd: 50_000,
  /** Contract age below this many seconds triggers new_contract. */
  newContractSeconds: 24 * 60 * 60,
  /** Balance left after a sweep — if below this share of pre-sweep balance. */
  sweepBalanceRatio: 0.05,
  /** Failed calls in a 10-minute window. */
  failedCallCluster: 5,
} as const;

export interface TXReport {
  score: number;
  anomaly_count: number;
  anomalies: TXAnomaly[];
  findings: Finding[];
  /** How many transactions were analyzed. */
  sample_size: number;
  /** Whether the address had any on-chain history at all. */
  empty: boolean;
}
