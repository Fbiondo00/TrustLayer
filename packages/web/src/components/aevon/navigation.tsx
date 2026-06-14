'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { navLinks } from '@/lib/site'
import { Logo } from './logo'

function CtaButton({
  className = '',
  children,
  onClick,
}: {
  className?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href="/scanner"
      onClick={onClick}
      className={`inline-flex items-center justify-center bg-[var(--color-aevon-accent)] text-[#F8FAFC] px-5 py-2.5 rounded-full text-[14px] font-medium hover:bg-[var(--color-aevon-accent-hover)] transition-colors duration-200 min-h-[44px] ${className}`}
    >
      {children}
    </Link>
  )
}

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-aevon-accent)] focus:text-[#F8FAFC] focus:rounded-full text-sm"
      >
        Skip to content
      </a>

      <header
        className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center px-5 md:px-[50px] transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <Logo />

        <nav
          className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[#F8FAFC] text-[14px] hover:opacity-60 transition-opacity duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <CtaButton className="hidden md:inline-flex">Scan a contract</CtaButton>

          <button
            className="lg:hidden flex flex-col gap-[5px] w-[44px] h-[44px] items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span
              className={`block w-6 h-[2px] bg-[#F8FAFC] transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}
            />
            <span
              className={`block w-6 h-[2px] bg-[#F8FAFC] transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}
            />
            <span
              className={`block w-6 h-[2px] bg-[#F8FAFC] transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}
            />
          </button>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`fixed inset-0 z-40 bg-[#000000] flex flex-col items-center justify-center gap-8 transition-all duration-300 lg:hidden ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        <nav className="flex flex-col items-center gap-6" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={closeMenu}
              className="text-[#F8FAFC] text-2xl hover:opacity-60 transition-opacity duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <CtaButton
          className="w-64 text-center"
          onClick={closeMenu}
        >
          Scan a contract
        </CtaButton>
      </div>
    </>
  )
}
