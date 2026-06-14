/**
 * Zod input validators for the MCP server + CLI tools.
 *
 * Each schema mirrors the input shape of one orchestrator method, so MCP and
 * CLI get runtime validation for free. Adapts the NapulETH `packages/schema`
 * Zod schemas to TrustLayer's `AnalysisInput` shape (separate `address?` /
 * `source?` / `bytecode?` fields rather than a single `input_data` string)
 * and TrustLayer's `ChainId` enum (`ethereum` / `base` / `arbitrum` /
 * `optimism` — no `polygon`).
 *
 * Inline (single file) rather than the NapulETH `zod/` subdirectory because
 * TrustLayer's schema/ folder is flat by convention.
 */

import { z } from "zod";

export const chainEnum = z.enum(["ethereum", "base", "arbitrum", "optimism", "solana"]);

/** EVM address format: 0x-prefixed 40 hex chars. */
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
/** Solana address format: base58, 32-44 chars. */
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Chain-aware address validator. EVM chains (ethereum/base/arbitrum/optimism)
 * expect 0x-prefixed 40-hex. Solana expects base58 32-44. Without this the MCP
 * tool rejects every Solana address at the schema boundary.
 */
const addressForChain = z
  .string()
  .superRefine((val, ctx) => {
    // `chain` lives on the parent object — read it from ctx.path's sibling.
    // zod doesn't give us the parent directly here, so we accept either regex
    // and let downstream code verify the match per chain. This is still safe:
    // the regexes are mutually exclusive (no string matches both).
    if (!EVM_ADDRESS_RE.test(val) && !SOLANA_ADDRESS_RE.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Expected EVM address (0x + 40 hex) or Solana address (base58, 32-44 chars)",
      });
    }
  });

/**
 * Strict variant used after the chain is known — branches on the regex.
 * Caller wraps the discriminator (e.g. `chain === "solana"`) and uses this
 * to give a precise error message.
 */
export function addressRegexForChain(
  chain: "ethereum" | "base" | "arbitrum" | "optimism" | "solana",
): RegExp {
  return chain === "solana" ? SOLANA_ADDRESS_RE : EVM_ADDRESS_RE;
}

/**
 * Full analysis input — discriminated union matching `AnalysisInput` in
 * `types.ts`. Each variant requires the field that carries its payload.
 */
export const AnalyzeInputSchema = z.discriminatedUnion("input_type", [
  z.object({
    input_type: z.literal("source"),
    chain: chainEnum,
    source: z.string().min(1),
    name: z.string().optional(),
  }),
  z.object({
    input_type: z.literal("bytecode"),
    chain: chainEnum,
    bytecode: z.string().min(1),
    name: z.string().optional(),
  }),
  z.object({
    input_type: z.literal("address"),
    chain: chainEnum,
    address: addressForChain,
    name: z.string().optional(),
  }),
]);

export const DecompileInputSchema = z.object({
  bytecode: z.string().min(1).describe("Hex-encoded bytecode to decompile"),
});

export const TokenRiskInputSchema = z.object({
  chain: chainEnum.describe("Chain the token is deployed on"),
  address: z
    .string()
    .superRefine((val, ctx) => {
      if (!EVM_ADDRESS_RE.test(val) && !SOLANA_ADDRESS_RE.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Expected EVM address (0x + 40 hex) or Solana address (base58, 32-44 chars)",
        });
      }
    })
    .describe("Token contract address"),
});

export const PermissionsInputSchema = z.object({
  source_code: z.string().min(1).describe("Solidity source code to scan for permission patterns"),
});

export const ApprovalsInputSchema = z.object({
  chain: chainEnum.describe("Chain the wallet lives on"),
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .describe("Wallet address to scan ERC20 allowances for"),
});

export const ScoreInputSchema = z.object({
  findings: z
    .array(
      z.object({
        severity: z.string(),
        check: z.string(),
      }),
    )
    .describe("List of findings with severity and check name"),
  token_risk_flags: z
    .array(z.string())
    .optional()
    .describe("Token risk flags from Dedaub TokIn"),
  permissions: z
    .array(
      z.object({
        name: z.string(),
        category: z.enum(["negative", "positive"]),
        weight: z.number(),
      }),
    )
    .optional()
    .describe("Permission entries from PermissionMapper"),
  tx_score: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("TX history sub-score (0-100). 50 neutral when skipped."),
});

export const FixInputSchema = z.object({
  source_code: z.string().min(1).describe("Solidity source code to fix"),
  findings: z
    .array(
      z.object({
        check: z.string(),
        severity: z.string(),
        description: z.string(),
      }),
    )
    .describe("Findings the LLM should patch"),
  attempts: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe("Fix attempt number (0-indexed) — informs prompt retries"),
});
