'use client'

import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { gradeForScore } from '@/lib/trust'

type CaseStudy = {
  score: number
  client: string
  chain: string
  note: string
}

const caseStudies: CaseStudy[] = [
  {
    score: 100,
    client: 'WETH',
    chain: 'Ethereum',
    note: 'Zero High, zero Medium. +15 safety bonus applied.',
  },
  {
    score: 97,
    client: 'SafeAgent',
    chain: 'Solidity source',
    note: 'Whitelist, daily limit, 24h time-lock, reentrancy guard.',
  },
  {
    score: 83,
    client: 'USDC',
    chain: 'Ethereum',
    note: '3 Medium findings (constant-function-asm). Honest, not generous.',
  },
  {
    score: 20,
    client: 'MaliciousAgent',
    chain: 'Solidity source',
    note: 'Self-destruct, owner drain, arbitrary call. Cap-20 enforced.',
  },
]

function CaseStudyCard({ study }: { study: CaseStudy }) {
  const meta = gradeForScore(study.score)

  return (
    <div
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
        className="relative h-[200px] md:h-[260px] lg:h-[300px] overflow-hidden flex flex-col items-center justify-center gap-3"
        style={{
          background: `radial-gradient(35rem 18rem at 30% 0%, ${meta.color}22, transparent 60%), #0a0a0a`,
        }}
      >
        <span
          className="text-[110px] md:text-[140px] lg:text-[170px] font-bold leading-none"
          style={{ color: meta.color, textShadow: `0 0 50px ${meta.glow}` }}
        >
          {meta.grade}
        </span>
        <span className="text-[#F8FAFC] text-[16px] font-medium opacity-80">
          {study.score}/100 · {meta.label}
        </span>
      </div>

      <div className="flex flex-col gap-2 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#F8FAFC] text-[20px] font-bold">
            {study.client}
          </span>
          <span className="text-[#94A3B8] text-[13px] uppercase tracking-wider">
            {study.chain}
          </span>
        </div>
        <p className="text-[#94A3B8] text-[14px] leading-relaxed">
          {study.note}
        </p>
      </div>
    </div>
  )
}

export function CaseStudies() {
  const { ref: headingRef, isVisible: headingVisible } =
    useScrollAnimation<HTMLDivElement>()

  return (
    <section className="bg-[#000000]" aria-label="Verified scans">
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px] pb-[60px]">
        <div
          ref={headingRef}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 anim-fade-up"
          style={headingVisible ? { opacity: 1, transform: 'translateY(0)' } : {}}
        >
          <div className="flex flex-col gap-4">
            <span
              className="inline-flex items-center self-start text-[#F8FAFC] text-[14px] px-5 py-2.5 rounded-full"
              style={{ background: 'rgba(248,250,252,0.1)' }}
            >
              Verified scans
            </span>
            <h2 className="text-[#F8FAFC] text-[32px] md:text-[44px] lg:text-[56px] font-bold text-balance">
              Same input. Same grade. Every time.
            </h2>
            <p
              className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed"
              style={{ maxWidth: 700 }}
            >
              Five canonical targets. Paste the address tomorrow, next week, next
              month — the score doesn&apos;t move. Mechanical first, AI explains.
            </p>
          </div>

          <div
            className="flex items-center gap-2 flex-shrink-0 px-4 py-3 rounded-full border self-start md:self-auto"
            style={{ borderColor: 'rgba(248,250,252,0.15)' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="text-[var(--color-aevon-accent)]"
            >
              <path
                d="M3 8L6.5 11.5L13 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[#F8FAFC] text-[14px] whitespace-nowrap">
              Reproduced against mainnet
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px] pb-[80px] lg:pb-[180px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px]">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.client} study={study} />
          ))}
        </div>
      </div>
    </section>
  )
}
