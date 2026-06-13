"use client";

import { Reveal } from "./Reveal";

const STACK = [
  "Slither",
  "Dedaub",
  "Trail of Bits",
  "Etherscan V2",
  "Foundry",
  "viem",
  "multicall3",
  "Gemma 4",
  "Next.js",
  "React Three Fiber",
];

export function LogoCloud() {
  const loop = [...STACK, ...STACK];
  return (
    <section aria-label="Built on" className="border-y border-border bg-bg-elevated/30 py-10">
      <Reveal>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-center text-[11px] font-mono uppercase tracking-widest text-fg-subtle">
            The mechanical stack — no vibes, no oracles
          </div>
          <div className="relative overflow-hidden mask-fade">
            <div className="flex w-max animate-marquee items-center gap-12">
              {loop.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="whitespace-nowrap text-lg font-semibold tracking-tight text-fg-muted/70 transition-colors hover:text-fg"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
