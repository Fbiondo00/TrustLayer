/**
 * Etherscan V2 client — unified source fetcher for all EVM chains.
 *
 * One endpoint (api.etherscan.io/v2/api), pass chainid as query param. One
 * API key works across all chains. Per-chain env var fallbacks
 * (BASESCAN_API_KEY etc.) are honored for users who created separate keys
 * before the V2 migration.
 *
 * Graceful degradation: returns `null` when no API key is configured OR when
 * the request fails OR when the contract isn't verified. The pipeline then
 * falls back to decompilation or emits a warning.
 */

import type { ChainId, EvmChainId } from "@trustlayer/schema";

const EXPLORER_API_V2 = "https://api.etherscan.io/v2/api";

const CHAIN_ID: Record<EvmChainId, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
};

const API_KEY_ENV: Record<EvmChainId, string[]> = {
  ethereum: ["ETHERSCAN_API_KEY"],
  base: ["BASESCAN_API_KEY", "ETHERSCAN_API_KEY"],
  arbitrum: ["ARBISCAN_API_KEY", "ETHERSCAN_API_KEY"],
  optimism: ["OPTIMISM_API_KEY", "ETHERSCAN_API_KEY"],
};

interface EtherscanSourceResponse {
  status: string;
  message: string;
  result: Array<{
    SourceCode: string;
    ContractName: string;
    CompilerVersion: string;
    ABI: string;
    Proxy: string;
    Implementation: string;
  }>;
}

export interface FetchedSource {
  source: string;
  contractName: string;
  compilerVersion: string;
  isProxy: boolean;
  implementationAddress?: string;
}

export class EtherscanClient {
  async fetchSource(address: string, chain: ChainId): Promise<FetchedSource | null> {
    if (chain === "solana") return null; // Etherscan is EVM-only
    const apiKey = this.resolveApiKey(chain);
    if (!apiKey) return null;

    const url = `${EXPLORER_API_V2}?chainid=${CHAIN_ID[chain]}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      return null;
    }

    if (!res.ok) return null;

    const data = (await res.json()) as EtherscanSourceResponse;
    if (data.status !== "1" || !Array.isArray(data.result) || data.result.length === 0) {
      return null;
    }

    const entry = data.result[0];
    if (!entry.SourceCode || entry.SourceCode.trim().length === 0) {
      return null;
    }

    const source = this.extractSource(entry.SourceCode);
    if (!source || source.trim().length === 0) return null;

    const isProxy = entry.Proxy === "1";
    const implementationAddress = isProxy && entry.Implementation ? entry.Implementation : undefined;

    return {
      source,
      contractName: entry.ContractName || "UnknownContract",
      compilerVersion: entry.CompilerVersion || "",
      isProxy,
      implementationAddress,
    };
  }

  isEnabled(chain: ChainId): boolean {
    return this.resolveApiKey(chain) !== undefined;
  }

  private extractSource(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const normalized = trimmed.startsWith("{{") && trimmed.endsWith("}}")
          ? trimmed.slice(1, -1)
          : trimmed;
        const parsed = JSON.parse(normalized) as {
          language?: string;
          sources?: Record<string, { content?: string }>;
        };
        if (parsed.sources) {
          return Object.values(parsed.sources)
            .map((s) => s.content ?? "")
            .filter((c) => c.length > 0)
            .join("\n\n");
        }
      } catch {
        // malformed JSON — fall through to treat as raw source
      }
    }
    return raw;
  }

  private resolveApiKey(chain: ChainId): string | undefined {
    if (chain === "solana") return undefined;
    for (const envVar of API_KEY_ENV[chain as EvmChainId]) {
      const key = process.env[envVar];
      if (key && key.trim().length > 0) return key;
    }
    return undefined;
  }
}
