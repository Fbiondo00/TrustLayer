'use client'

import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { SectionHeading } from './section-heading'

type Service = {
  id: string
  title: string
  description: string
  badge: string | null
  poster: string
}

const services: Service[] = [
  {
    id: 'vulnerabilities',
    title: 'Vulnerabilities',
    description:
      'Slither runs ~90 static detectors — reentrancy, shadowing, assembly misuse, unsafe arithmetic. The single largest layer in the composite.',
    badge: '30% weight',
    poster:
      'https://framerusercontent.com/images/HdcnQ2ZBtTBPKOBZmdyFnMYhnWI.jpg',
  },
  {
    id: 'token-risk',
    title: 'Token Risk',
    description:
      'Dedaub TokIn supplies 12 canonical flags: honeypot, hidden sell tax, owner can mint or blacklist, transfer pause, proxy manipulation.',
    badge: '20% weight',
    poster:
      'https://framerusercontent.com/images/NKEBrYCWQ9k2au0FhP4OcJTyGLw.jpg',
  },
  {
    id: 'permissions',
    title: 'Permissions',
    description:
      'Six dangerous capabilities (self-destruct, owner drain, arbitrary call, no access control) scored against six positive patterns (whitelist, time-lock, daily cap, multi-sig).',
    badge: '20% weight',
    poster:
      'https://framerusercontent.com/images/nd2jzo2fGycCinBS46VCsvKdbo.jpg',
  },
  {
    id: 'approvals',
    title: 'Wallet Approvals',
    description:
      'Every active ERC20 allowance the agent can spend, scanned via multicall3. Unlimited approvals flagged, blast radius quantified.',
    badge: '15% weight',
    poster:
      'https://framerusercontent.com/images/ECp2egJYdmygYqRNoWtYV16uNcs.jpg',
  },
]

function ServiceCard({ service, delay }: { service: Service; delay: number }) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className="anim-fade-up-lg flex flex-col rounded-lg overflow-hidden border transition-colors duration-300 hover:bg-[rgba(248,250,252,0.07)] bg-[rgba(248,250,252,0.03)]"
      style={{
        borderColor: 'rgba(248,250,252,0.1)',
        transitionDelay: `${delay}ms`,
        ...(isVisible ? { opacity: 1, transform: 'translateY(0)' } : {}),
      }}
    >
      <div className="relative h-[200px] md:h-[300px] overflow-hidden flex-shrink-0">
        <img
          src={service.poster}
          alt={`${service.title} visual`}
          width={535}
          height={300}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {service.badge && (
          <span
            className="absolute top-4 right-4 text-[#F8FAFC] text-[14px] px-4 py-2 rounded-full"
            style={{ background: 'rgba(248,250,252,0.1)' }}
          >
            {service.badge}
          </span>
        )}
      </div>

      <div className="flex flex-col justify-between flex-1 p-5 gap-10">
        <div className="flex flex-col gap-3">
          <h3 className="text-[#F8FAFC] text-[24px] font-bold">{service.title}</h3>
          <p className="text-[#F8FAFC] text-[17px] leading-relaxed">
            {service.description}
          </p>
        </div>
        <a
          href="/scanner"
          className="text-[#F8FAFC] text-[14px] font-medium hover:underline transition-all"
        >
          See it run →
        </a>
      </div>
    </div>
  )
}

export function Services() {
  return (
    <section
      id="services"
      className="bg-[#000000] pb-[80px] lg:pb-[180px]"
      aria-label="Services"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px]">
        <SectionHeading
          eyebrow="What we scan"
          title="Four layers. One grade."
          description="Each layer is a deterministic tool that runs on the contract behind the agent. Together they form a weighted composite no single detector can game."
          maxDescriptionWidth={600}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px]">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  )
}
