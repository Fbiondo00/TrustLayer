'use client'

const tools = [
  { name: 'Slither' },
  { name: 'Dedaub' },
  { name: 'Etherscan V2' },
  { name: 'viem' },
  { name: 'multicall3' },
  { name: 'Solana' },
  { name: 'Granite' },
  { name: 'Foundry' },
  { name: 'Next.js' },
  { name: 'Tailwind v4' },
  { name: 'MCP' },
  { name: 'pnpm' },
]

function ToolItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <div
        className="w-[40px] h-[40px] bg-[rgba(248,250,252,0.15)] flex-shrink-0 flex items-center justify-center rounded-sm"
        aria-hidden="true"
      >
        <div className="w-5 h-5 bg-[#F8FAFC] opacity-70 rounded-sm" />
      </div>
      <span className="text-[#F8FAFC] text-[14px] whitespace-nowrap">{name}</span>
    </div>
  )
}

export function IntegrationsMarquee() {
  const doubledTools = [...tools, ...tools]

  return (
    <section
      className="bg-[#000000] pb-[80px] lg:pb-[180px] overflow-hidden"
      aria-label="Integration tools"
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-[50px] mb-8">
        <p className="text-[#F8FAFC] text-base lg:text-[17px]">
          Powered by deterministic tools that don&apos;t hallucinate
        </p>
      </div>

      <div className="relative w-full overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #000000, transparent)' }}
          aria-hidden="true"
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #000000, transparent)' }}
          aria-hidden="true"
        />

        <div
          className="marquee-track flex items-center gap-[30px] px-5"
          style={{ width: 'max-content' }}
          aria-hidden="true"
        >
          {doubledTools.map((tool, i) => (
            <ToolItem key={`${tool.name}-${i}`} name={tool.name} />
          ))}
        </div>
      </div>
    </section>
  )
}
