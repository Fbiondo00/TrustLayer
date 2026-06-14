/**
 * Approval scanner — ERC20 allowance blast radius via viem multicall3.
 *
 * For a given address, multicall `allowance(owner=address, spender=known)`
 * across the canonical token list and curated spender list per chain. Any
 * unlimited allowance is a red flag; high-value allowances (>10 ETH-equiv)
 * are warnings.
 *
 * Graceful degradation: `isEnabled()` requires the chain's RPC env var OR a
 * generic `ETH_RPC_URL` fallback. When disabled, the pipeline skips this step.
 *
 * Ported from `packages/core/src/approval-scanner.ts` in the NapulETH orchestrator.
 */

import { createPublicClient, http, erc20Abi, getAddress } from "viem";
import { mainnet, base, arbitrum, optimism } from "viem/chains";

import {
  WHITELISTED_SPENDERS,
  DEFAULT_TOKEN_LIST,
} from "@/lib/schema";
import type {
  ChainId,
  AllowanceEntry,
  ApprovalRiskTier,
  ApprovalReport,
  RiskLevel,
  Finding,
} from "@/lib/schema";

const MAX_UINT256_HALF = BigInt(2) ** BigInt(255);
const HIGH_VALUE_THRESHOLD = BigInt(10) * BigInt(10) ** BigInt(18);

const CHAIN_VIEM = {
  ethereum: mainnet,
  base,
  arbitrum,
  optimism,
} as const;

const RPC_ENV: Record<ChainId, string> = {
  ethereum: "ETH_RPC_URL",
  base: "BASE_RPC_URL",
  arbitrum: "ARBITRUM_RPC_URL",
  optimism: "OPTIMISM_RPC_URL",
};

export class ApprovalScanner {
  private rpcOverrides: Partial<Record<ChainId, string>>;

  constructor(rpcOverrides?: Partial<Record<ChainId, string>>) {
    this.rpcOverrides = rpcOverrides ?? {};
  }

  isEnabled(chain: ChainId): boolean {
    const url =
      this.rpcOverrides[chain] ??
      process.env[RPC_ENV[chain]] ??
      process.env.ETH_RPC_URL;
    return typeof url === "string" && url.trim().length > 0;
  }

  async scan(address: string, chain: ChainId): Promise<ApprovalReport> {
    const url =
      this.rpcOverrides[chain] ??
      process.env[RPC_ENV[chain]] ??
      process.env.ETH_RPC_URL;
    if (!url) {
      throw new Error(`ApprovalScanner disabled (no RPC for chain ${chain})`);
    }

    const client = createPublicClient({
      chain: CHAIN_VIEM[chain],
      transport: http(url),
    });

    const owner = getAddress(address);
    const tokens = DEFAULT_TOKEN_LIST[chain];
    const spenders = WHITELISTED_SPENDERS[chain];

    const calls = tokens.flatMap((token) =>
      spenders.map((spender) => ({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "allowance" as const,
        args: [owner, spender.address as `0x${string}`],
      })),
    );

    const results = await client.multicall({ contracts: calls });

    const allowances: AllowanceEntry[] = [];
    let idx = 0;
    for (const token of tokens) {
      for (const spender of spenders) {
        const r = results[idx++];
        if (r?.status === "success" && r.result) {
          const amount = r.result as bigint;
          if (amount > 0n) {
            const isUnlimited = amount >= MAX_UINT256_HALF;
            allowances.push({
              token: token.address,
              tokenSymbol: token.symbol,
              spender: spender.address,
              spenderLabel: spender.label,
              amount: amount.toString(),
              decimals: token.decimals,
              isUnlimited,
              riskTier: this.classifyRisk(amount, isUnlimited),
            });
          }
        }
      }
    }

    allowances.sort((a, b) => {
      if (a.isUnlimited !== b.isUnlimited) return a.isUnlimited ? -1 : 1;
      const diff = BigInt(b.amount) - BigInt(a.amount);
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });

    const unlimitedCount = allowances.filter((a) => a.isUnlimited).length;
    const tokenCount = new Set(
      allowances.map((a) => a.token.toLowerCase()),
    ).size;
    const score = this.calculateScore(allowances);
    const findings = allowancesToFindings(allowances);

    return {
      address,
      chain,
      allowances,
      tokenCount,
      unlimitedCount,
      score,
      riskLevel: this.scoreToRiskLevel(score),
      findings,
      empty: allowances.length === 0,
    };
  }

  private classifyRisk(amount: bigint, isUnlimited: boolean): ApprovalRiskTier {
    if (isUnlimited) return "unlimited";
    if (amount >= HIGH_VALUE_THRESHOLD) return "high_value";
    return "limited";
  }

  private calculateScore(allowances: AllowanceEntry[]): number {
    let score = 100;
    for (const a of allowances) {
      switch (a.riskTier) {
        case "unlimited":
          // Whitelisted spenders (DEX routers) are expected; unknown spenders are red flags.
          score -= a.spenderLabel ? 8 : 20;
          break;
        case "high_value":
          score -= 5;
          break;
        case "limited":
          score -= 1;
          break;
        case "none":
          break;
      }
    }
    return Math.max(0, Math.min(100, score));
  }

  private scoreToRiskLevel(score: number): RiskLevel {
    if (score >= 85) return "safe";
    if (score >= 65) return "low";
    if (score >= 45) return "medium";
    if (score >= 25) return "high";
    return "critical";
  }
}

function allowancesToFindings(allowances: AllowanceEntry[]): Finding[] {
  const findings: Finding[] = [];
  for (const a of allowances) {
    if (a.riskTier === "unlimited") {
      findings.push({
        id: `approval-unlimited-${a.token}-${a.spender}`.toLowerCase(),
        severity: a.spenderLabel ? "medium" : "high",
        title: `Unlimited ${a.tokenSymbol} approval`,
        description: `Address approved ${a.spenderLabel ?? a.spender} to spend unlimited ${a.tokenSymbol}.`,
        source: "approvals",
      });
    } else if (a.riskTier === "high_value") {
      findings.push({
        id: `approval-high-${a.token}-${a.spender}`.toLowerCase(),
        severity: "low",
        title: `High-value ${a.tokenSymbol} approval`,
        description: `Address approved ${a.spenderLabel ?? a.spender} to spend a large ${a.tokenSymbol} amount.`,
        source: "approvals",
      });
    }
  }
  return findings;
}
