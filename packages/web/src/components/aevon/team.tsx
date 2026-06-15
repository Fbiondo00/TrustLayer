'use client'

import { SectionHeading } from './section-heading'

type Member = {
  name: string
  title: string
  bio: string
  label: string
  code: string
}

const team: Member[] = [
  {
    name: '@trustlayer/core',
    title: 'Scoring engine',
    bio: 'The pipeline. Slither for static bugs, Dedaub for token risks, plus permissions, wallet approvals, transaction history, and AI intent. Outputs one score from 0 to 100 with a letter grade.',
    label: 'pipeline',
    code: 'new PipelineService().runAnalysis({ source, chain })',
  },
  {
    name: '@trustlayer/cli',
    title: 'Terminal scanner',
    bio: 'Run a scan from any shell. Accepts a Solidity file, an EVM address, or a Solana program. Prints a formatted report by default, or raw JSON with --json for piping into scripts.',
    label: 'cli',
    code: 'pnpm cli analyze 0xA0b8...3606eB48',
  },
  {
    name: '@trustlayer/web',
    title: 'Scanner + landing',
    bio: 'Next.js 16, React 19, Tailwind v4. The landing tells the story; /scanner runs the same pipeline as the CLI in real time, in the browser.',
    label: 'web',
    code: 'open localhost:3000/scanner',
  },
  {
    name: '@trustlayer/mcp-server',
    title: 'AI agent tool',
    bio: 'Model Context Protocol server. Hook it into Claude Code or Cursor, then ask about any contract in plain English. TrustLayer runs the pipeline behind the scenes and the agent explains the result.',
    label: 'mcp',
    code: 'pnpm mcp  # stdio, drop into your AI tool',
  },
  {
    name: '@trustlayer/schema',
    title: 'Shared types',
    bio: 'TypeScript types for findings, scores, and pipeline events. Imported by every other package so the CLI, web, and MCP server never drift out of sync.',
    label: 'types',
    code: 'import type { Finding, ScoreGrade } from "@trustlayer/schema"',
  },
  {
    name: '@trustlayer/contracts',
    title: 'Demo fixtures',
    bio: 'Eight Solidity contracts with known bugs: reentrancy, DAO hack, flash loan manipulation, missing access control. Used to verify the pipeline still flags what it should.',
    label: 'sol',
    code: 'MaliciousAgent.sol  →  F (20/100)',
  },
]

export function Team() {
  return (
    <section
      id="about"
      className="bg-[#000000] pb-[80px] lg:pb-[180px]"
      aria-label="Packages"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <SectionHeading
          eyebrow="About"
          title="Built in the open"
          description="Six packages, one pipeline. The same scoring engine runs whether you call it from the terminal, the browser, or your AI agent. Every commit is public on GitHub."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[30px]">
          {team.map((member) => (
            <div
              key={member.name}
              className="group flex flex-col rounded-lg overflow-hidden border transition-colors duration-300"
              style={{ borderColor: 'rgba(248,250,252,0.1)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(248,250,252,0.3)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(248,250,252,0.1)')
              }
            >
              <div
                className="relative h-[160px] md:h-[180px] overflow-hidden flex flex-col justify-between p-5"
                style={{
                  background:
                    'radial-gradient(30rem 15rem at 20% 0%, rgba(167,139,250,0.10), transparent 60%), #0a0a0a',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: '#ef4444' }}
                      aria-hidden="true"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: '#fbbf24' }}
                      aria-hidden="true"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: '#a3e635' }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-[#94A3B8] text-[11px] uppercase tracking-widest font-mono">
                    {member.label}
                  </span>
                </div>

                <code
                  className="block text-[12px] md:text-[13px] leading-relaxed font-mono break-all"
                  style={{ color: '#c4b5fd' }}
                >
                  <span className="text-[#94A3B8]">$ </span>
                  {member.code}
                </code>
              </div>

              <div className="flex flex-col gap-2 p-5 pt-6">
                <h3 className="text-[#F8FAFC] text-[20px] font-bold font-mono">
                  {member.name}
                </h3>
                <p className="text-[#94A3B8] text-[14px]">{member.title}</p>
                <p className="text-[#F8FAFC] text-[15px] leading-relaxed mt-2">
                  {member.bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
