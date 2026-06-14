/**
 * Minimal .env loader — no `dotenv` dep.
 *
 * Reads `<cwd>/.env`, sets each `KEY=VALUE` pair into `process.env` unless the
 * variable is already set (CLI args / shell env take precedence).
 */

import fs from "fs";
import path from "path";

export function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
