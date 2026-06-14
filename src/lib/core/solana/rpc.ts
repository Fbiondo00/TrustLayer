/**
 * Solana RPC client — JSON-RPC 2.0 over HTTP.
 *
 * Endpoint resolution order:
 *   1. HELIUS_RPC_URL env (recommended, higher rate limits)
 *   2. SOLANA_RPC_URL env (any RPC provider — QuickNode, Triton, etc.)
 *   3. Public mainnet endpoint `https://api.mainnet-beta.solana.com` (rate-limited,
 *      no API key, suitable for low-volume demos only)
 *
 * Returns are typed to the slice of `SolanaRPCResponse` we actually consume.
 * Untyped fields are passed through as `unknown` for forward compat.
 */

const PUBLIC_MAINNET = "https://api.mainnet-beta.solana.com";

export interface SolanaAccountInfo {
  lamports: number;
  owner: string;
  executable: boolean;
  rentEpoch: number;
  /** Base58-encoded account data. Length depends on account type. */
  data: [string, string];
  /** True if the account has no data (closed/empty). */
  isWriteable?: boolean;
}

export interface SolanaSignature {
  signature: string;
  err: unknown | null;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus: string | null;
}

export interface SolanaTokenAccount {
  pubkey: string;
  account: {
    owner: string;
    data: [string, string];
  };
}

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function resolveEndpoint(): string {
  const helius = process.env.HELIUS_RPC_URL;
  if (helius && helius.trim().length > 0) return helius;
  const custom = process.env.SOLANA_RPC_URL;
  if (custom && custom.trim().length > 0) return custom;
  return PUBLIC_MAINNET;
}

export class SolanaRpcClient {
  private readonly endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint ?? resolveEndpoint();
  }

  /** True when an RPC endpoint is configured (always true — falls back to public). */
  isEnabled(): boolean {
    return this.endpoint.length > 0;
  }

  /** True when the configured endpoint is the rate-limited public mainnet. */
  isPublicFallback(): boolean {
    return this.endpoint === PUBLIC_MAINNET;
  }

  private async call<T>(method: string, params: unknown[]): Promise<T> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    });
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(`Solana RPC ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { result?: T; error?: { message: string } };
    if (json.error) {
      throw new Error(`Solana RPC error on ${method}: ${json.error.message}`);
    }
    return json.result as T;
  }

  /**
   * Fetch account info. Returns null for non-existent accounts.
   * Encoding "base58" gives a compact form suitable for parsing account types
   * like the upgradeable loader's ProgramData account (≈ 180 bytes).
   */
  async getAccountInfo(address: string): Promise<SolanaAccountInfo | null> {
    const result = await this.call<{ value: SolanaAccountInfo | null }>(
      "getAccountInfo",
      [address, { encoding: "base58", commitment: "confirmed" }],
    );
    return result?.value ?? null;
  }

  /** Recent transaction signatures (newest first). Limit capped at 1000 by RPC. */
  async getSignaturesForAddress(
    address: string,
    limit = 200,
  ): Promise<SolanaSignature[]> {
    const result = await this.call<SolanaSignature[]>("getSignaturesForAddress", [
      address,
      { limit },
    ]);
    return result ?? [];
  }

  /**
   * SPL Token accounts owned by `address`. Covers both Token program and
   * Token-2022 program — callers can post-filter by `account.owner` to split.
   */
  async getTokenAccountsByOwner(address: string): Promise<SolanaTokenAccount[]> {
    const calls = [
      { programId: TOKEN_PROGRAM_ID },
      { programId: TOKEN_2022_PROGRAM_ID },
    ];
    const results = await Promise.all(
      calls.map((cfg) =>
        this.call<{ value: SolanaTokenAccount[] }>("getTokenAccountsByOwner", [
          address,
          cfg,
          { encoding: "base58", commitment: "confirmed" },
        ]),
      ),
    );
    return results.flatMap((r) => r?.value ?? []);
  }
}
