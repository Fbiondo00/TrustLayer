'use client'

import { useScrollAnimation } from '@/hooks/use-scroll-animation'

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'between'
  maxDescriptionWidth?: number
  children?: React.ReactNode
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  maxDescriptionWidth = 800,
  children,
}: SectionHeadingProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>()

  const isBetween = align === 'between'

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-4 mb-12 anim-fade-up ${isBetween ? 'md:flex-row md:items-end md:justify-between' : ''}`}
      style={isVisible ? { opacity: 1, transform: 'translateY(0)' } : {}}
    >
      <div className="flex flex-col gap-4">
        {eyebrow && (
          <span
            className="inline-flex items-center self-start text-[#F8FAFC] text-[14px] px-5 py-2.5 rounded-full"
            style={{ background: 'rgba(248,250,252,0.1)' }}
          >
            {eyebrow}
          </span>
        )}
        <h2
          className="text-[#F8FAFC] text-[32px] md:text-[44px] lg:text-[56px] font-bold text-balance"
        >
          {title}
        </h2>
        {description && (
          <p
            className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed"
            style={{ maxWidth: maxDescriptionWidth }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
