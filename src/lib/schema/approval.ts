/**
 * Approvals layer — ERC20 allowance blast radius via multicall3.
 *
 * For a given agent address, we multicall `allowance(owner=common_wallets,
 * spender=agent)` across a known token list per chain. Any unlimited
 * allowance is a High finding. The blast-radius score factors in the number
 * of unlimiteds × token weight.
 */

import type { Finding } from "./finding";

export interface TokenAllowance {
  token: string;
  symbol: string;
  /** Owner wallet address. */
  owner: string;
  /** Approved amount (raw). */
  amount: string;
  /** True when amount = type(uint256).max or effectively unlimited. */
  unlimited: boolean;
  /** Decimals — used to format display strings. */
  decimals: number;
}

export interface ApprovalReport {
  score: number;
  /** Wallets checked. */
  owners_checked: number;
  /** Tokens checked per wallet. */
  tokens_checked: number;
  /** Allowances found. */
  allowances: TokenAllowance[];
  /** Subset of allowances that are unlimited. */
  unlimited_count: number;
  findings: Finding[];
  /** Whether the address had any approvals at all. */
  empty: boolean;
}

/**
 * Canonical token list per chain. Phase 4 (approval-scanner) iterates this.
 * Keep this short — multicall cost scales with wallets × tokens.
 */
export const APPROVAL_TOKENS: Record<
  string,
  { address: string; symbol: string; decimals: number }[]
> = {
  ethereum: [
    { address: "0xC02aA5397213FB2D1c7C20dd1B0C27e4F37C39a6", symbol: "WETH", decimals: 18 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", decimals: 18 },
    { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", decimals: 18 },
  ],
  base: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
  ],
  arbitrum: [
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", decimals: 18 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
  ],
  optimism: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", decimals: 6 },
  ],
};

/** Multicall3 contract address — same on every chain it's deployed to. */
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
