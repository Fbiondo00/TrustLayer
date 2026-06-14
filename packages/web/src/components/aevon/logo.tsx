import { siteConfig } from '@/lib/site'

export function Logo({ withLabel = true }: { withLabel?: boolean }) {
  return (
    <a
      href="#hero"
      className="flex items-center gap-2.5 no-underline"
      aria-label={`${siteConfig.name} — back to top`}
    >
      <img
        src="/logo.png"
        alt=""
        className="h-[34px] w-auto flex-shrink-0"
        aria-hidden="true"
      />
      {withLabel && (
        <span className="text-[#F8FAFC] text-[17px] font-bold tracking-widest">
          {siteConfig.name}
        </span>
      )}
    </a>
  )
}
