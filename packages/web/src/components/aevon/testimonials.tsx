'use client'

import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { useAutoplayInView } from '@/hooks/use-autoplay-in-view'

type Testimonial = {
  name: string
  title: string
  quote: string
}

type StatBlock = {
  number: string
  label: string
  videoSrc: string
}

const testimonials: [Testimonial, Testimonial] = [
  {
    name: 'Mechanical first, AI explains',
    title: 'Pipeline principle',
    quote:
      'The score is computed before the AI is called. Detection runs on Slither and Dedaub; the LLM only translates the structured findings into a paragraph a non-developer can act on. Hallucination in the explanation does not affect the grade.',
  },
  {
    name: 'The engine refuses to be impressed',
    title: 'Security override',
    quote:
      'Two or more High Slither findings caps the score at F (20 max), one High caps at D (44 max), missing Slither caps at B+ (80 max). The cap reason shows on the result card. No amount of marketing copy moves the grade.',
  },
]

const stats: [StatBlock, StatBlock] = [
  {
    number: '50%',
    label: 'Of the composite is deterministic — Slither (30%) plus Dedaub (20%). AI carries 5%. Both reproducible.',
    videoSrc:
      'https://framerusercontent.com/assets/20AxnAit9j9vKuB6bNimt2ouJU.mp4',
  },
  {
    number: '8 → 4',
    label: 'Steps in the EVM pipeline. Solana runs a streamlined 4-step variant tuned to BPF program models.',
    videoSrc:
      'https://framerusercontent.com/assets/rQvqGqVRMY2u50KjEh3gF0MK1Dc.mp4',
  },
]

function TestimonialCard({ name, title, quote }: Testimonial) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className="flex flex-col gap-4 p-5 rounded-lg border anim-fade-up-lg"
      style={{
        borderColor: 'rgba(248,250,252,0.1)',
        background: 'rgba(248,250,252,0.02)',
        ...(isVisible ? { opacity: 1, transform: 'translateY(0)' } : {}),
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[#F8FAFC] text-[18px] font-bold">{name}</span>
        <span className="text-[#94A3B8] text-[14px]">{title}</span>
      </div>
      <p className="text-[#F8FAFC] text-[15px] leading-relaxed">
        <span
          className="text-[40px] leading-none mr-1 text-[var(--color-aevon-accent)] font-bold"
          aria-hidden="true"
        >
          &ldquo;
        </span>
        {quote}
      </p>
    </div>
  )
}

function StatCard({ number, label, videoSrc }: StatBlock) {
  const videoRef = useAutoplayInView<HTMLVideoElement>(0.2)

  return (
    <div
      className="relative flex flex-col gap-2 p-5 rounded-lg border overflow-hidden"
      style={{
        borderColor: 'rgba(248,250,252,0.1)',
        background: 'rgba(248,250,252,0.02)',
        minHeight: '200px',
      }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        muted
        loop
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <div className="relative z-10">
        <span className="text-[#F8FAFC] text-[80px] lg:text-[110px] font-bold leading-none">
          {number}
        </span>
        <p className="text-[#94A3B8] text-[17px] mt-2">{label}</p>
      </div>
    </div>
  )
}

export function Testimonials() {
  return (
    <section
      className="bg-[#000000] pb-[80px] lg:pb-[180px]"
      aria-label="Client testimonials"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <TestimonialsHeading />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px]">
          <div className="flex flex-col gap-[30px]">
            <StatCard {...stats[0]} />
            <TestimonialCard {...testimonials[0]} />
          </div>

          <div className="flex flex-col gap-[30px]">
            <TestimonialCard {...testimonials[1]} />
            <StatCard {...stats[1]} />
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialsHeading() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className="flex flex-col gap-4 mb-12 anim-fade-up"
      style={isVisible ? { opacity: 1, transform: 'translateY(0)' } : {}}
    >
      <h3 className="text-[#F8FAFC] text-[28px] md:text-[36px] lg:text-[40px] font-bold">
        Why builders trust it
      </h3>
      <p
        className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed"
        style={{ maxWidth: 500 }}
      >
        Three properties that make the engine safe to depend on.
      </p>
    </div>
  )
}
