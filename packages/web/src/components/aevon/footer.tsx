import { siteConfig, footerLinks } from '@/lib/site'
import { Logo } from './logo'

function TwitterIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.745l7.73-8.835L2.25 2.25h6.222l4.26 5.63L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
        fill="currentColor"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.157-1.11-1.465-1.11-1.465-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.31.678.921.678 1.856 0 1.34-.012 2.422-.012 2.751 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.523 2 12 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

const socials = [
  { label: `Follow ${siteConfig.name} on X (Twitter)`, href: siteConfig.social.twitter, Icon: TwitterIcon },
  { label: `${siteConfig.name} on GitHub`, href: siteConfig.social.github, Icon: GitHubIcon },
]

export function Footer() {
  return (
    <footer
      className="bg-[#000000] px-5 md:px-[50px] py-10"
      aria-label="Site footer"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-6">
          <Logo />

          <nav
            className="hidden md:flex items-center gap-5"
            aria-label="Footer navigation"
          >
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[#F8FAFC] text-[14px] hover:opacity-60 transition-opacity duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="text-[#F8FAFC] hover:opacity-60 transition-opacity duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div
          className="my-8"
          style={{ height: '1px', background: 'rgba(248,250,252,0.1)' }}
          aria-hidden="true"
        />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-[#94A3B8] text-[14px]">
            &copy; {new Date().getFullYear()} {siteConfig.name}.
          </p>
          <p className="text-[#94A3B8] text-[14px]">Built with care.</p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-[#94A3B8] text-[14px] hover:text-[#F8FAFC] transition-colors duration-200"
            >
              Terms of Service
            </a>
            <span className="text-[#94A3B8] text-[14px]" aria-hidden="true">
              /
            </span>
            <a
              href="#"
              className="text-[#94A3B8] text-[14px] hover:text-[#F8FAFC] transition-colors duration-200"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
