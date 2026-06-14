'use client'

import { SectionHeading } from './section-heading'

type Package = {
  name: string
  tagline: string
  description: string
  features: string[]
}

const packages: Package[] = [
  {
    name: 'Web Scanner',
    tagline: 'Paste. Scan. Decide.',
    description:
      'Open /scanner in your browser. No install, no keys for the demo fixtures. Mainnet scans need an Etherscan key.',
    features: [
      'Source, bytecode, or address input',
      'Live pipeline progress strip',
      'Color-coded grade panel',
      'Per-step event log',
    ],
  },
  {
    name: 'MCP Server',
    tagline: 'Ask Claude Code.',
    description:
      'Seven tools over stdio. Configure your editor once, then ask "is agent 0x… safe?" in plain English and get the grade inline.',
    features: [
      'trustlayer_analyze (full pipeline)',
      'decompile, token_risk, permissions, approvals, score, fix',
      'Works with Claude Code, Cursor, Windsurf, Continue, Zed',
      '.mcp.json template included',
    ],
  },
  {
    name: 'CLI',
    tagline: 'Pipe-friendly. CI-ready.',
    description:
      'Script the pipeline. trustlayer analyze prints formatted reports or raw JSON for jq. Gate PRs on minimum grade in three lines of YAML.',
    features: [
      'analyze, replay, fix commands',
      '--type, --chain, --json flags',
      'GitHub Actions + pre-commit recipes',
      'Exit codes for unattended pipelines',
    ],
  },
]

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="flex-shrink-0 mt-0.5"
    >
      <path
        d="M3 8L6.5 11.5L13 5"
        stroke="#F8FAFC"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Packages() {
  return (
    <section
      id="packages"
      className="bg-[#000000] pb-[80px] lg:pb-[180px]"
      aria-label="Service packages"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <SectionHeading
          eyebrow="Get started"
          title="Three ways to use TrustLayer"
          description="Same engine, three surfaces. Pick the one that fits your workflow."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px]">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className="flex flex-col gap-6 p-6 rounded-lg border h-full transition-colors duration-300"
              style={{ borderColor: 'rgba(248,250,252,0.1)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(248,250,252,0.3)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(248,250,252,0.1)')
              }
            >
              <div>
                <h3 className="text-[#F8FAFC] text-[24px] font-bold">
                  {pkg.name}
                </h3>
                <p className="text-[#94A3B8] text-[17px] mt-1">
                  {pkg.tagline}
                </p>
              </div>

              <p className="text-[#F8FAFC] text-[15px] leading-relaxed">
                {pkg.description}
              </p>

              <hr
                style={{
                  borderColor: 'rgba(248,250,252,0.15)',
                  borderTopWidth: '1px',
                }}
              />

              <div className="flex flex-col gap-3 flex-1">
                <span className="text-[#94A3B8] text-[12px] uppercase tracking-wider font-medium">
                  Includes
                </span>
                <ul className="flex flex-col gap-2.5" role="list">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span className="text-[#F8FAFC] text-[15px]">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href="/scanner"
                className="flex items-center justify-center w-full py-3 rounded-full bg-[var(--color-aevon-accent)] text-[#F8FAFC] text-[14px] font-medium hover:bg-[var(--color-aevon-accent-hover)] transition-colors duration-200 min-h-[44px] mt-auto"
              >
                Open scanner
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
