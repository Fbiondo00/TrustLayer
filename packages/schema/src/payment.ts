/**
 * Payment types — `$TRUST` credit system (TrustLayerCredits contract).
 *
 * The web /scanner stays free; PaymentGate is callable from CLI/MCP surfaces
 * and surfaces the full tokenomics vision. Disabled (returns fake data) when
 * `PAYMENT_CONTRACT_ADDRESS` / `PAYMENT_SIGNER_PRIVATE_KEY` are unset, so it
 * never throws in demo mode.
 */

export interface CreditBalance {
  address: string;
  credits: number;
}

export interface PaymentReceipt {
  consumer: string;
  scan_id: string;
  credits_used: number;
  tx_hash: string;
}

export interface ScanCredits {
  address: string;
  credits_purchased: number;
  credits_remaining: number;
  total_spent_wei: string;
}

export interface PaymentGate {
  checkCredits(address: string): Promise<CreditBalance>;
  consumeCredit(consumerAddress: string, scanId: string): Promise<PaymentReceipt>;
}
