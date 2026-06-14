'use client'

import { useId, useState } from 'react'
import { useScrollAnimation } from '@/hooks/use-scroll-animation'

type Faq = { question: string; answer: string }

const faqs: Faq[] = [
  {
    question: 'What does the trust grade actually mean?',
    answer:
      'A+ through A means safe to connect: limited permissions, audited contracts, clean history. F means do not connect: the contract can drain your wallet, has unaudited code, or shows suspicious patterns. Full bands: A+ ≥97, A ≥93, A- ≥87, B+ ≥80, B ≥73, B- ≥65, C+ ≥55, C ≥45, D ≥35, F <35.',
  },
  {
    question: 'Is the AI part of the score?',
    answer:
      'Only 5%. The pipeline runs deterministic tools (Slither, Dedaub, multicall3) and computes the score before the AI is called. The LLM takes the structured findings and writes a plain-English summary. Hallucination in the explanation does not affect the grade.',
  },
  {
    question: 'What happens if Slither isn\'t installed?',
    answer:
      'The pipeline still runs but the grade caps at B+ (80 max). The result card shows the slither_not_run cap reason so you know what\'s missing. Install with `pip3 install --user slither-analyzer solc-select`.',
  },
  {
    question: 'Which chains are supported?',
    answer:
      'Five: Ethereum, Base, Arbitrum, Optimism, Solana. EVM chains run the full 8-step pipeline. Solana runs a streamlined 4-step variant (authority, TX, approvals, verify) tuned to BPF program models.',
  },
  {
    question: 'Can I run this in CI?',
    answer:
      'Yes. The CLI ships with a GitHub Actions recipe and a pre-commit hook example. Fail the build below B+ in three lines of YAML. The CLI exits 0 on success even when the grade is F — CI gating logic reads the JSON and decides.',
  },
  {
    question: 'What\'s an MCP server and why should I care?',
    answer:
      'Model Context Protocol lets AI editors (Claude Code, Cursor, Windsurf, Continue, Zed) call external tools inline. With TrustLayer\'s MCP server configured, you can ask "is agent 0x… safe?" and get the A+ → F grade back in the same conversation — no copy-paste to a browser.',
  },
]

function FaqItem({ question, answer }: Faq) {
  const [open, setOpen] = useState(false)
  const reactId = useId()
  const panelId = `panel-${reactId}`
  const buttonId = `button-${reactId}`

  return (
    <div style={{ borderBottom: '1px solid rgba(248,250,252,0.15)' }}>
      <button
        id={buttonId}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-4 py-5 text-left min-h-[44px]"
      >
        <span className="text-[#F8FAFC] text-[15px] md:text-[17px] font-medium">
          {question}
        </span>
        <span
          className="text-[#94A3B8] text-[20px] flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(45deg)' : 'none' }}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? '500px' : '0', opacity: open ? 1 : 0 }}
      >
        <p className="text-[#F8FAFC] text-[15px] leading-relaxed pb-5 pr-8">
          {answer}
        </p>
      </div>
    </div>
  )
}

export function FAQ() {
  const { ref: headingRef, isVisible: headingVisible } =
    useScrollAnimation<HTMLDivElement>()

  return (
    <section
      className="bg-[#000000] pb-[80px] lg:pb-[180px]"
      aria-label="Frequently asked questions"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <div
          ref={headingRef}
          className="flex flex-col gap-4 mb-12 anim-fade-up"
          style={headingVisible ? { opacity: 1, transform: 'translateY(0)' } : {}}
        >
          <h3 className="text-[#F8FAFC] text-[28px] md:text-[36px] lg:text-[40px] font-bold">
            Questions worth asking
          </h3>
          <p
            className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed"
            style={{ maxWidth: 500 }}
          >
            The ones developers and security reviewers ask most. If something is
            still unclear, the docs go deeper.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[30px]">
          <div>
            {faqs.filter((_, i) => i % 2 === 0).map((item) => (
              <FaqItem key={item.question} {...item} />
            ))}
          </div>
          <div>
            {faqs.filter((_, i) => i % 2 === 1).map((item) => (
              <FaqItem key={item.question} {...item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
