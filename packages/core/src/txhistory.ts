/**
 * TX-history analyzer — pulls txlist via Etherscan V2 and detects anomalies.
 *
 * Score starts at 100 and applies fixed penalties per anomaly flag, with
 * small bonuses for longevity (>90d, >365d) and clean history (>95% success
 * over >10 txs).
 *
 * Graceful degradation: `isEnabled()` requires ETHERSCAN_API_KEY. The pipeline
 * skips this step entirely when the key is missing.
 *
 * Ported from `packages/core/src/txhistory.ts` in the NapulETH orchestrator.
 */

import { ANOMALY_THRESHOLDS } from "@trustlayer/schema";
import type { AnomalyFlag, Finding, TXMetrics, TXReport } from "@trustlayer/schema";

interface EtherscanTX {
  hash: string;
  from: string;
  to: string;
  value: string;
  isError: string;
  timeStamp: string;
}

export class TXHistoryAnalyzer {
  private readonly apiKey: string;
  // Etherscan V2 unified endpoint. chainid=1 = ethereum mainnet.
  private readonly baseUrl = "https://api.etherscan.io/v2/api?chainid=1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ETHERSCAN_API_KEY ?? "";
  }

  isEnabled(): boolean {
    return this.apiKey.trim().length > 0;
  }

  async analyze(address: string): Promise<TXReport> {
    if (!this.isEnabled()) {
      throw new Error("TXHistoryAnalyzer is disabled (ETHERSCAN_API_KEY not set)");
    }
    const txs = await this.fetchTransactions(address);
    const metrics = this.calculateMetrics(txs, address);
    const anomalyFlags = this.detectAnomalies(metrics, txs);
    const score = this.calculateScore(metrics, anomalyFlags);
    const findings = anomalyFlagsToFindings(anomalyFlags);
    return {
      metrics,
      anomaly_flags: anomalyFlags,
      score,
      findings,
      empty: txs.length === 0,
    };
  }

  private async fetchTransactions(address: string): Promise<EtherscanTX[]> {
    const url = `${this.baseUrl}&module=account&action=txlist&address=${address}&sort=desc&apikey=${this.apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const data = (await res.json()) as { status: string; result: EtherscanTX[] | string };
    if (data.status !== "1" || !Array.isArray(data.result)) return [];
    return data.result;
  }

  private calculateMetrics(txs: EtherscanTX[], address: string): TXMetrics {
    const total = txs.length;
    const failed = txs.filter((tx) => tx.isError === "1").length;
    const successRate = total > 0 ? (total - failed) / total : 1;

    const counterparties = new Set<string>();
    for (const tx of txs) {
      const peer = tx.from.toLowerCase() === address.toLowerCase() ? tx.to : tx.from;
      counterparties.add(peer.toLowerCase());
    }

    let totalValue = BigInt(0);
    let firstTs = Number.MAX_SAFE_INTEGER;
    let lastTs = 0;
    for (const tx of txs) {
      totalValue += BigInt(tx.value);
      const ts = parseInt(tx.timeStamp, 10);
      if (ts < firstTs) firstTs = ts;
      if (ts > lastTs) lastTs = ts;
    }

    const daysActive =
      total > 0 ? Math.max(1, Math.ceil((lastTs - firstTs) / 86400)) : 0;

    return {
      total_transactions: total,
      success_rate: Math.round(successRate * 100) / 100,
      unique_counterparties: counterparties.size,
      days_active: daysActive,
      total_value_transferred: (totalValue / BigInt(1e14)).toString(),
    };
  }

  private detectAnomalies(metrics: TXMetrics, txs: EtherscanTX[]): AnomalyFlag[] {
    const flags: AnomalyFlag[] = [];

    if (
      metrics.days_active <= ANOMALY_THRESHOLDS.recently_created_days &&
      metrics.days_active > 0 &&
      metrics.total_transactions < ANOMALY_THRESHOLDS.established_activity_threshold
    ) {
      flags.push("recently_created");
    }
    if (metrics.success_rate < 1 - ANOMALY_THRESHOLDS.high_failure_rate) {
      flags.push("high_failure_rate");
    }
    if (metrics.total_transactions <= ANOMALY_THRESHOLDS.low_activity_threshold) {
      flags.push("no_activity");
    }
    for (const tx of txs) {
      const valueEth = Number(BigInt(tx.value) / BigInt(1e14)) / 10000;
      if (valueEth >= ANOMALY_THRESHOLDS.single_large_drain_eth) {
        flags.push("single_large_drain");
        break;
      }
    }
    return flags;
  }

  private calculateScore(metrics: TXMetrics, anomalies: AnomalyFlag[]): number {
    let score = 100;
    for (const flag of anomalies) {
      switch (flag) {
        case "recently_created": score -= 20; break;
        case "high_failure_rate": score -= 20; break;
        case "single_large_drain": score -= 15; break;
        case "no_activity": score -= 10; break;
        case "interacts_with_flagged": score -= 15; break;
        case "flash_and_drain_pattern": score -= 25; break;
      }
    }
    if (metrics.days_active > 90) score += 5;
    if (metrics.days_active > 365) score += 5;
    if (metrics.success_rate > 0.95 && metrics.total_transactions > 10) score += 5;
    return Math.max(0, Math.min(100, score));
  }
}

function anomalyFlagsToFindings(flags: AnomalyFlag[]): Finding[] {
  return flags.map((flag) => ({
    id: `tx-${flag}`,
    severity: anomalySeverity(flag),
    title: flag.replace(/_/g, " "),
    description: anomalyDescription(flag),
    source: "txHistory",
  }));
}

function anomalySeverity(flag: AnomalyFlag): Finding["severity"] {
  switch (flag) {
    case "flash_and_drain_pattern":
    case "single_large_drain":
      return "high";
    case "recently_created":
    case "high_failure_rate":
    case "interacts_with_flagged":
      return "medium";
    case "no_activity":
      return "low";
  }
}

function anomalyDescription(flag: AnomalyFlag): string {
  switch (flag) {
    case "recently_created": return "Address is less than 7 days old.";
    case "high_failure_rate": return "More than 30% of transactions have reverted.";
    case "no_activity": return "Address has 5 or fewer total transactions.";
    case "single_large_drain": return "A single transaction moved ≥ 50 ETH.";
    case "interacts_with_flagged": return "Address has transacted with a flagged counterparty.";
    case "flash_and_drain_pattern": return "Address exhibits a flash-loan-and-drain pattern.";
  }
}
