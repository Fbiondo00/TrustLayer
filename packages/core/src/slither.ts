/**
 * Slither runner — shells out to the `slither` binary in an isolated tmp
 * directory, parses the JSON output, and emits one Finding per detector hit.
 *
 * When Slither doesn't run (binary missing, solc-select can't resolve the
 * pragma, source has unresolved imports), emits a single informational
 * `slither-not-run` finding instead. The score calculator uses that finding
 * to cap the final grade at B+ (80) — we don't claim A+ on contracts we
 * couldn't actually scan.
 *
 * Ported from `packages/core/src/slither.ts` in the NapulETH orchestrator.
 */

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import type { Finding, Severity } from "@trustlayer/schema";

function resolveSlitherBinary(): string {
  try {
    execSync("command -v slither", { stdio: "pipe" });
    return "slither";
  } catch {
    const candidates = [
      path.join(os.homedir(), "Library/Python/3.9/bin/slither"),
      path.join(os.homedir(), "Library/Python/3.10/bin/slither"),
      path.join(os.homedir(), "Library/Python/3.11/bin/slither"),
      path.join(os.homedir(), "Library/Python/3.12/bin/slither"),
      "/usr/local/bin/slither",
      "/opt/homebrew/bin/slither",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return "slither";
}

function severityFromString(s: string): Severity {
  const lower = s.toLowerCase();
  if (lower === "high" || lower === "medium" || lower === "low" || lower === "informational" || lower === "optimization") {
    return lower;
  }
  return "informational";
}

export class SlitherRunner {
  analyze(sourceCode: string): Finding[] {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trustlayer-"));
    const filePath = path.join(tmpDir, "Contract.sol");
    const outputPath = path.join(tmpDir, "output.json");

    fs.writeFileSync(filePath, sourceCode);

    const slitherBin = resolveSlitherBinary();
    const extraPaths = [
      path.join(os.homedir(), "Library/Python/3.9/bin"),
      path.join(os.homedir(), "Library/Python/3.10/bin"),
      path.join(os.homedir(), "Library/Python/3.11/bin"),
      path.join(os.homedir(), "Library/Python/3.12/bin"),
      "/opt/homebrew/bin",
      "/usr/local/bin",
    ].filter((p) => fs.existsSync(p));
    const env = {
      ...process.env,
      PATH: `${extraPaths.join(path.delimiter)}${path.delimiter}${process.env.PATH ?? ""}`,
    };

    const pragmaMatch = sourceCode.match(
      /pragma\s+solidity\s*(?:\^|>=|~)?=?\s*(\d+\.\d+\.\d+)/,
    );
    const requiredSolcVersion = pragmaMatch?.[1];
    if (requiredSolcVersion) {
      try {
        execSync(`solc-select install ${requiredSolcVersion}`, {
          stdio: "pipe",
          env,
          timeout: 60_000,
        });
      } catch {
        // already installed or unavailable — fall through
      }
      try {
        execSync(`solc-select use ${requiredSolcVersion}`, {
          stdio: "pipe",
          env,
          timeout: 10_000,
        });
      } catch {
        // solc-select use failed silently — Slither will use whatever's global
      }
    }

    try {
      execSync(
        `${slitherBin} ${filePath} --json ${outputPath} --disable-color`,
        {
          timeout: 120_000,
          stdio: "pipe",
          cwd: tmpDir,
          env,
        },
      );
    } catch (err) {
      if (!fs.existsSync(outputPath)) {
        const stderrRaw = (err as { stderr?: Buffer | string }).stderr;
        const stderrText =
          typeof stderrRaw === "string"
            ? stderrRaw
            : (stderrRaw?.toString("utf8") ?? "");
        const stderrTail = stderrText.slice(-800);
        fs.rmSync(tmpDir, { recursive: true });
        return [
          {
            id: "slither-not-run",
            severity: "informational" as Severity,
            title: "Slither did not run",
            description: `Slither did not run: ${err instanceof Error ? err.message : String(err)}. stderr: ${stderrTail}`,
            source: "system" as const,
          },
        ];
      }
    }

    if (!fs.existsSync(outputPath)) {
      fs.rmSync(tmpDir, { recursive: true });
      return [];
    }

    const raw = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    fs.rmSync(tmpDir, { recursive: true });

    const detectors: Array<Record<string, unknown>> =
      (raw as { results?: { detectors?: Array<Record<string, unknown>> } })?.results
        ?.detectors ?? [];

    return detectors.map((d) => {
      const check = String(d.check ?? "unknown");
      const firstElement = (d.elements as Array<Record<string, { name?: string }>> | undefined)?.[0];
      const reference =
        (d.first_markdown_element as string | undefined) ??
        firstElement?.source_mapping?.name ??
        "";
      return {
        id: check,
        severity: severityFromString(String(d.impact ?? "informational")),
        title: check,
        description: String(d.description ?? ""),
        detector: check,
        source: "slither" as const,
        reference,
      } satisfies Finding;
    });
  }
}
