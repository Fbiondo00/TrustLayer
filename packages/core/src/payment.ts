/**
 * PaymentGate — on-chain $TRUST credit system (TrustLayerCredits contract).
 *
 * Gates scans behind pre-paid credits. Reads `ETH_RPC_URL` +
 * `PAYMENT_CONTRACT_ADDRESS` + `PAYMENT_SIGNER_PRIVATE_KEY` env vars. When
 * unset (or `DEMO_MODE=true`), methods return fake data instead of throwing —
 * so the web /scanner stays free and the CLI/MCP surfaces work end-to-end
 * without a deployed contract.
 *
 * Ported from NapulETH `packages/core/src/payment.ts`. Imports adapted from
 * `@trustlayer/schema` to `@trustlayer/schema`.
 */

import type {
  CreditBalance,
  PaymentReceipt,
  PaymentGate as PaymentGateInterface,
} from "@trustlayer/schema";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";

const TRUSTLAYER_CREDITS_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "consumer", type: "address" },
      { name: "scanId", type: "string" },
    ],
    name: "consumeCredit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Future API — not currently invoked by web/MCP/CLI surfaces. The web `/scanner`
 * stays free; PaymentGate is wired here so the $TRUST tokenomics roadmap can
 * flip it on by setting `PAYMENT_CONTRACT_ADDRESS` + `PAYMENT_SIGNER_PRIVATE_KEY`
 * + `DEMO_MODE=false` without touching call sites.
 */
export class PaymentGate implements PaymentGateInterface {
  private rpcUrl: string;
  private contractAddress: Hex;
  private signerPrivateKey?: Hex;

  constructor() {
    this.rpcUrl = process.env.ETH_RPC_URL ?? "";
    this.contractAddress = (process.env.PAYMENT_CONTRACT_ADDRESS ?? "") as Hex;
    this.signerPrivateKey = process.env.PAYMENT_SIGNER_PRIVATE_KEY as
      | Hex
      | undefined;
  }

  async checkCredits(address: string): Promise<CreditBalance> {
    if (!this.rpcUrl || !this.contractAddress) {
      // Demo mode: return fake balance.
      return { address, credits: 99 };
    }

    const client = createPublicClient({
      transport: http(this.rpcUrl),
    });

    const credits = await client.readContract({
      address: this.contractAddress,
      abi: TRUSTLAYER_CREDITS_ABI,
      functionName: "getBalance",
      args: [address as Hex],
    });

    return { address, credits: Number(credits) };
  }

  async consumeCredit(
    consumerAddress: string,
    scanId: string,
  ): Promise<PaymentReceipt> {
    if (
      process.env.DEMO_MODE === "true" ||
      !this.signerPrivateKey ||
      !this.contractAddress
    ) {
      // Demo mode: return fake receipt.
      return {
        consumer: consumerAddress,
        scan_id: scanId,
        credits_used: 1,
        tx_hash: `0x${scanId.replace(/-/g, "").slice(0, 64)}`,
      };
    }

    const publicClient = createPublicClient({
      transport: http(this.rpcUrl),
    });

    const walletClient = createWalletClient({
      account: this.signerPrivateKey as Hex,
      transport: http(this.rpcUrl),
    });

    const { request } = await publicClient.simulateContract({
      address: this.contractAddress,
      abi: TRUSTLAYER_CREDITS_ABI,
      functionName: "consumeCredit",
      args: [consumerAddress as Hex, scanId],
    });

    const txHash = await walletClient.writeContract(request);

    return {
      consumer: consumerAddress,
      scan_id: scanId,
      credits_used: 1,
      tx_hash: txHash,
    };
  }
}
