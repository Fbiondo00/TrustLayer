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
    bio: 'The pipeline orchestrator. Eight steps, weighted composite, security overrides (cap-20, cap-44, cap-80). Shared with every surface.',
    label: 'src',
    code: 'import { PipelineService } from "@trustlayer/core"',
  },
  {
    name: '@trustlayer/web',
    title: 'Scanner + landing',
    bio: 'Next.js 16, React 19, Tailwind v4. Server-rendered. 100/100 Lighthouse on /scanner. Same purple design system across landing and product.',
    label: 'next.js',
    code: 'POST /scanner → analyze({ source, chain })',
  },
  {
    name: '@trustlayer/mcp-server',
    title: 'Seven MCP tools',
    bio: 'trustlayer_analyze, decompile, token_risk, permissions, approvals, score, fix. Drop into Claude Code or Cursor with one .mcp.json entry.',
    label: 'mcp',
    code: '{ "command": "pnpm", "args": ["mcp"] }',
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
          description="TrustLayer is an open-source pnpm monorepo. Five packages, one orchestrator. Every commit is on GitHub."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px]">
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
                className="relative h-[180px] md:h-[200px] overflow-hidden flex flex-col justify-between p-5"
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
                  className="block text-[13px] md:text-[14px] leading-relaxed font-mono break-all"
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
