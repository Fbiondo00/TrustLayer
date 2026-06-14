'use client'

import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { SectionHeading } from './section-heading'

type Stat = {
  number: string
  label: string
}

const stats: Stat[] = [
  {
    number: '$45M+',
    label: 'Lost to AI-agent security attacks in Q1 2026 alone. The preflight check exists because the damage is real.',
  },
  {
    number: '5',
    label: 'Chains supported: Ethereum, Base, Arbitrum, Optimism, Solana. EVM gets the full 8-step pipeline; Solana runs a streamlined 4-step variant.',
  },
  {
    number: '100/100',
    label: 'Lighthouse score on /scanner — accessibility, best-practices, SEO, agentic browsing. Verified on every PR.',
  },
]

export function Stats() {
  return (
    <section
      id="results"
      className="bg-[#000000] pb-[80px] lg:pb-[180px]"
      aria-label="Agency statistics"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <SectionHeading
          title="Numbers that compound"
          description="Real figures from a deterministic engine. Same inputs tomorrow, same outputs."
          maxDescriptionWidth={500}
        />

        <div
          className="flex flex-col md:flex-row md:divide-x divide-y md:divide-y-0"
          style={{ borderColor: 'rgba(248,250,252,0.2)' }}
        >
          {stats.map((stat) => (
            <div
              key={stat.number}
              className="flex flex-col gap-3 flex-1 py-8 md:py-0 md:px-10 first:pl-0 last:pr-0"
            >
              <span className="text-[#F8FAFC] text-[64px] md:text-[80px] lg:text-[110px] font-bold leading-none">
                {stat.number}
              </span>
              <p
                className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed"
                style={{ maxWidth: 280 }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
