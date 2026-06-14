/**
 * Schema barrel — single import surface for the rest of the codebase.
 *
 * Consumers should import from `@/lib/schema` rather than reaching into
 * individual files. Internal cross-imports between schema files are fine.
 */

export * from "./score";
export * from "./finding";
export * from "./permission";
export * from "./tx-report";
export * from "./approval";
export * from "./token-risk";
export * from "./explanation";
export * from "./pipeline";
export * from "./services";
export * from "./rag";
export * from "./types";
export * from "./zod";
