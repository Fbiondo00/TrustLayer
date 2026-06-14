import Image from "next/image";
import Link from "next/link";

const SECTIONS = [
  {
    title: "Product",
    links: [
      { label: "Problem", href: "#problem" },
      { label: "Pipeline", href: "#pipeline" },
      { label: "Score", href: "#score" },
      { label: "Live demo", href: "#demo" },
      { label: "Developers", href: "#devs" },
    ],
  },
  {
    title: "Stack",
    links: [
      { label: "Slither · Trail of Bits", href: "#" },
      { label: "Dedaub", href: "#" },
      { label: "Etherscan V2", href: "#" },
      { label: "Foundry", href: "#" },
      { label: "Gemma 4", href: "#" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: "https://github.com/Fbiondo00/TrustLayer" },
      { label: "README", href: "https://github.com/Fbiondo00/TrustLayer#readme" },
      { label: "License · MIT", href: "https://github.com/Fbiondo00/TrustLayer/blob/main/LICENSE" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-bg-elevated/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo.jpg"
                alt="TrustLayer"
                width={36}
                height={36}
                className="h-9 w-9 rounded-md object-cover ring-1 ring-border-strong"
              />
              <span className="text-lg font-semibold tracking-tight">
                Trust<span className="text-brand">Layer</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
              Credit score for AI agents. Mechanical first, AI explains. Built to stop the next wallet
              drain before it starts.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-safe" />
              Built in 48 hours
            </div>
          </div>

          {SECTIONS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-fg-subtle">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-fg-muted transition-colors hover:text-fg"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <div className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} TrustLayer. Released under the MIT License.
          </div>
          <div className="flex items-center gap-4 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-2">
              <span className="font-mono">A+ → F</span>
              <span>·</span>
              <span>the only grade you need</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
