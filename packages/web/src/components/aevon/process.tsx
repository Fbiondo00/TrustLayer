'use client'

import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { useAutoplayInView } from '@/hooks/use-autoplay-in-view'
import { SectionHeading } from './section-heading'

type Step = {
  tag: string
  title: string
  body: string
}

const steps: Step[] = [
  {
    tag: 'Acquire',
    title: 'Fetch and decompile',
    body: 'Etherscan V2 fetches the verified source — or the bytecode if it isn\'t. When only bytecode is available, Dedaub\'s on-demand decompiler reconstructs pseudo-Solidity so static analysis still runs.',
  },
  {
    tag: 'Detect',
    title: 'Slither plus TokIn',
    body: 'Slither runs ~90 static detectors. Dedaub TokIn adds 12 token-specific risk flags. Together they carry 50% of the composite — both deterministic, both reproducible.',
  },
  {
    tag: 'Map',
    title: 'Permissions, history, approvals',
    body: 'Six dangerous capability patterns vs six positive ones. Etherscan transaction history for anomalies. A multicall3 round-trip pulls every active ERC20 allowance the agent can spend.',
  },
  {
    tag: 'Score',
    title: 'Composite grade, then AI explains',
    body: 'Weighted composite produces the A+ → F grade with security overrides: two or more High findings caps at F (20), one High caps at D (44), Slither-not-run caps at B+ (80). The AI takes the structured findings and writes the plain-English summary. The score is computed before the AI is called.',
  },
]

const PROCESS_VIDEO_SRC =
  'https://framerusercontent.com/assets/9hxPUwtr8NZEeX9CX6Mpcila4Dg.mp4'

function ProcessVideo() {
  const videoRef = useAutoplayInView<HTMLVideoElement>(0.3)

  return (
    <div
      className="hidden lg:block lg:w-[346px] flex-shrink-0"
      style={{ position: 'sticky', top: '80px', alignSelf: 'flex-start' }}
    >
      <div
        className="overflow-hidden rounded-lg"
        style={{ width: '346px', height: '400px' }}
      >
        <video
          ref={videoRef}
          src={PROCESS_VIDEO_SRC}
          muted
          playsInline
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  )
}

export function Process() {
  const { ref: stepsRef, isVisible: stepsVisible } = useScrollAnimation<HTMLDivElement>()

  return (
    <section
      id="process"
      className="bg-[#000000] pb-[80px] lg:pb-[180px]"
      aria-label="Our process"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <SectionHeading
          eyebrow="How it works"
          title="Eight steps. Eight seconds. One grade."
          description="The pipeline runs end-to-end on Solidity source, bytecode, or a deployed address. Every step emits a structured event; the score is computed before the AI is called. Solana runs a streamlined 4-step variant — authority freeze, TX history, SPL approvals, source verification — tuned to BPF program models."
        />

        <div className="flex gap-[60px]">
          <ProcessVideo />

          <div
            ref={stepsRef}
            className="flex flex-col gap-0 flex-1 anim-slide-in"
            style={stepsVisible ? { opacity: 1, transform: 'translateX(0)' } : {}}
          >
            {steps.map((step, i) => (
              <div
                key={step.tag}
                className="flex flex-col gap-3 py-12 pl-6 border-l"
                style={{ borderColor: 'rgba(248,250,252,0.15)' }}
              >
                <span className="text-[#94A3B8] text-[12px] uppercase tracking-widest">
                  {String(i + 1).padStart(2, '0')} — {step.tag}
                </span>
                <h3 className="text-[#F8FAFC] text-[24px] md:text-[32px] font-bold">
                  {step.title}
                </h3>
                <p
                  className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed"
                  style={{ maxWidth: 480 }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
