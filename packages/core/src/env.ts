/**
 * Typed env accessor — single source of truth for `process.env` reads.
 *
 * Every other module should call `getEnv`/`getOptionalEnv` rather than reading
 * `process.env` directly, so we have one place to swap in runtime config
 * (Vercel, .env.local, etc.) and one place to keep the demo-mode flag.
 */

export function getEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) return undefined;
  return value;
}

/**
 * Demo mode = no external API keys configured. The pipeline runs end-to-end
 * on pasted Solidity, skips network-dependent steps, caps the score at B+,
 * and the UI surfaces a "demo mode" banner.
 */
export function isDemoMode(): boolean {
  const keys = [
    "ETHERSCAN_API_KEY",
    "DEDAUB_API_KEY",
    "OPENAI_API_KEY",
    "REDHAT_API_KEY",
    "ETH_RPC_URL",
  ];
  return !keys.some((k) => getOptionalEnv(k));
}
