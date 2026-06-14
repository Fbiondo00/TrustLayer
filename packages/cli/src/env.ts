/**
 * Minimal .env loader — no `dotenv` dep.
 *
 * Reads `<cwd>/.env`, sets each `KEY=VALUE` pair into `process.env` unless the
 * variable is already set (CLI args / shell env take precedence).
 *
 * Prefers INIT_CWD (user's actual CWD) when pnpm runs us via --filter, since
 * process.cwd() points to the package dir.
 */

import fs from "fs";
import path from "path";

export function loadEnv(): void {
  const base = process.env.INIT_CWD || process.cwd();
  const envPath = path.resolve(base, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
