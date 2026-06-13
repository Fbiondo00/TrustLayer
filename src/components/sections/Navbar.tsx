"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#pipeline", label: "Pipeline" },
  { href: "#score", label: "Score" },
  { href: "#demo", label: "Demo" },
  { href: "#devs", label: "Developers" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-border/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.jpg"
            alt="TrustLayer"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-cover ring-1 ring-border-strong"
            priority
          />
          <span className="text-base font-semibold tracking-tight">
            Trust<span className="text-brand">Layer</span>
          </span>
          <span className="ml-2 hidden rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-fg-muted md:inline-block">
            v0.1
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Fbiondo00/TrustLayer"
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm text-fg-muted transition-colors hover:text-fg sm:block"
          >
            GitHub
          </a>
          <a
            href="#scanner"
            className="group inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-bg transition-all hover:bg-brand-strong hover:shadow-[0_0_30px_-4px_rgba(94,234,212,0.6)]"
          >
            Scan an agent
            <svg
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </nav>
    </header>
  );
}
