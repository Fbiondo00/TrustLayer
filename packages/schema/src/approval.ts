/**
 * Approvals layer — ERC20 allowance blast radius via multicall3.
 *
 * For a given agent address, we multicall `allowance(owner=address,
 * spender=known_spenders)` across a curated token list per chain. Any
 * unlimited allowance is a red flag. Score factors in the number of
 * unlimiteds and high-value allowances.
 *
 * Ported from `packages/schema/src/approval.ts` in the NapulETH orchestrator.
 */

import type { ChainId, EvmChainId } from "./types";
import type { Finding } from "./finding";

export type ApprovalRiskTier = "unlimited" | "high_value" | "limited" | "none";

/** Aggregate risk level for the whole approval scan, derived from the score. */
export type RiskLevel = "safe" | "low" | "medium" | "high" | "critical";

export interface AllowanceEntry {
  token: string;
  tokenSymbol: string;
  /** Spender address approved to move the tokens. */
  spender: string;
  /** Human-readable label for the spender (e.g. "Uniswap V2 Router"). */
  spenderLabel?: string;
  /** Approved amount (raw uint256, as string to avoid overflow). */
  amount: string;
  /** Decimals of the token — used to format display strings. */
  decimals: number;
  /** True when amount = type(uint256).max or effectively unlimited. */
  isUnlimited: boolean;
  /** Derived risk tier based on amount + unlimited flag. */
  riskTier: ApprovalRiskTier;
}

export interface ApprovalReport {
  /** The address that was scanned. */
  address: string;
  /** The chain the scan ran on. */
  chain: ChainId;
  /** Allowances found, sorted: unlimited first, then by amount desc. */
  allowances: AllowanceEntry[];
  /** Distinct tokens with non-zero allowances. */
  tokenCount: number;
  /** Allowances that are unlimited. */
  unlimitedCount: number;
  /** Layer score 0-100. */
  score: number;
  /** Aggregate risk level derived from score. */
  riskLevel: RiskLevel;
  /** Findings derived from allowances (one per unlimited or high-value). */
  findings: Finding[];
  /** Whether the address had any approvals at all. */
  empty: boolean;
}

/**
 * Curated spender list per chain. Whitelisted spenders (DEX routers) reduce
 * the per-allowance penalty — they're expected to have approvals. Unknown
 * spenders carry the full penalty.
 */
export const WHITELISTED_SPENDERS: Record<
  EvmChainId,
  Array<{ address: string; label: string }>
> = {
  ethereum: [
    { address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", label: "Uniswap V2 Router" },
    { address: "0xE592427A0AEce92De3Edee1F18E0157C05861564", label: "Uniswap V3 SwapRouter" },
    { address: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", label: "Uniswap V3 SwapRouter02" },
    { address: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF", label: "0x Exchange Proxy" },
    { address: "0x1111111254EEB25477B68fb85Ed929f73A960582", label: "1inch v5 Router" },
    { address: "0x881D40237659C251811CEC9c364ef91dC08D300C", label: "MetaMask Swap Router" },
  ],
  base: [
    { address: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", label: "Uniswap V3 Router (Base)" },
    { address: "0x8cFe327CEc66d1C090Dd72bd0FF11D690C33a2Eb", label: "BaseSwap Router" },
  ],
  arbitrum: [
    { address: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", label: "Uniswap V3 Router (Arbitrum)" },
  ],
  optimism: [
    { address: "0xE592427A0AEce92De3Edee1F18E0157C05861564", label: "Uniswap V3 Router (OP)" },
  ],
};

/**
 * Canonical token list per chain. Kept short — multicall cost scales with
 * spenders × tokens.
 */
export const DEFAULT_TOKEN_LIST: Record<
  EvmChainId,
  Array<{ address: string; symbol: string; decimals: number }>
> = {
  ethereum: [
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", decimals: 18 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", decimals: 18 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", decimals: 8 },
  ],
  base: [
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
  arbitrum: [
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
    { address: "0xFd086bC7CD5C481D1C53F69940194d9c6C8606c3", symbol: "USDT", decimals: 6 },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", decimals: 18 },
  ],
  optimism: [
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
};

/** Multicall3 contract address — same on every chain it's deployed to. */
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
