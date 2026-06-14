/**
 * TX-history layer — anomaly detection on past on-chain calls.
 *
 * Pulls the agent's txlist via Etherscan V2, then runs simple statistical
 * checks against ANOMALY_THRESHOLDS. Anything that crosses a threshold
 * becomes an anomaly flag and reduces this layer's score.
 */

import type { Finding } from "./finding";

export type AnomalyFlag =
  | "recently_created"
  | "high_failure_rate"
  | "no_activity"
  | "single_large_drain"
  | "interacts_with_flagged"
  | "flash_and_drain_pattern";

export interface TXMetrics {
  total_transactions: number;
  success_rate: number;
  unique_counterparties: number;
  days_active: number;
  /** Total value transferred through this address, in ETH (2-decimal precision, raw / 1e14). */
  total_value_transferred: string;
}

/**
 * Thresholds for anomaly detection. Tuned to flag the kinds of patterns that
 * preceded real agent-drain incidents (high failure rate, single large drain,
 * brand-new contracts, no activity at all).
 */
export const ANOMALY_THRESHOLDS = {
  /** Contract age below this many days triggers recently_created. */
  recently_created_days: 7,
  /**
   * Contracts with this many or more observed transactions are treated as
   * established — recently_created is skipped because Etherscan only returns
   * the latest 10k txs, which on a high-throughput contract (USDC, WETH)
   * can span less than a day even though the contract is years old.
   */
  established_activity_threshold: 1000,
  /** Failure rate above this triggers high_failure_rate. */
  high_failure_rate: 0.3,
  /** Total transactions below this triggers no_activity. */
  low_activity_threshold: 5,
  /** Single tx value in ETH above this triggers single_large_drain. */
  single_large_drain_eth: 50,
} as const;

export interface TXReport {
  metrics: TXMetrics;
  anomaly_flags: AnomalyFlag[];
  score: number;
  /** Findings derived from anomaly flags (Slither-compatible severity). */
  findings: Finding[];
  /** Whether the address had any on-chain history at all. */
  empty: boolean;
}
