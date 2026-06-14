import Link from 'next/link'
import { siteConfig } from '@/lib/site'

export function Logo({ withLabel = true }: { withLabel?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 no-underline"
      aria-label={`${siteConfig.name} — home`}
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
    </Link>
  )
}
