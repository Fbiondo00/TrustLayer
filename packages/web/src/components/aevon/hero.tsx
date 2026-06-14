'use client'

import Link from 'next/link'

const HERO_VIDEO_SRC =
  'https://framerusercontent.com/assets/xjMmLZ3hAtU02bZgIH3pFOAZCps.mp4'
const HERO_VIDEO_POSTER =
  'https://framerusercontent.com/images/tv9MVVF26SH9yzhSOqYXVUjQ.jpg'

export function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-dvh flex flex-col pt-[60px] bg-[#000000]"
      aria-label="Hero section"
    >
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-[1200px] mx-auto px-5 md:px-[50px] py-16 lg:py-0">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-[100px]">
            <div className="flex flex-col gap-6 lg:gap-8 w-full lg:w-[550px] flex-shrink-0">
              <h1 className="text-[#F8FAFC] text-[40px] md:text-[56px] lg:text-[80px] font-bold leading-[1.1] text-balance">
                Before you connect your wallet, check the score.
              </h1>

              <div className="flex flex-col gap-2">
                <p className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed">
                  TrustLayer is the wallet-agnostic preflight check for AI agents.
                </p>
                <p className="text-[#F8FAFC] text-base lg:text-[17px] leading-relaxed">
                  Mechanical detection first, AI explains. Same input, same grade — every time.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/scanner"
                  className="flex items-center justify-center bg-[var(--color-aevon-accent)] text-[#F8FAFC] px-5 py-3 rounded-full text-[14px] font-medium hover:bg-[var(--color-aevon-accent-hover)] transition-colors duration-200 min-h-[44px] w-full sm:w-auto"
                >
                  Scan a contract
                </Link>
                <a
                  href="https://github.com/Fbiondo00/TrustLayer"
                  className="flex items-center justify-center bg-transparent border text-[#F8FAFC] px-5 py-3 rounded-full text-[14px] font-medium hover:border-[#F8FAFC] transition-colors duration-200 min-h-[44px] w-full sm:w-auto"
                  style={{ borderColor: 'rgba(248,250,252,0.3)' }}
                >
                  Read the docs
                </a>
              </div>
            </div>

            <div className="w-full lg:w-[450px] flex-shrink-0 flex justify-center">
              <div
                className="relative overflow-hidden rounded-sm w-full"
                style={{
                  height: 'clamp(300px, 40vw, 450px)',
                  maxWidth: '450px',
                }}
              >
                <video
                  src={HERO_VIDEO_SRC}
                  poster={HERO_VIDEO_POSTER}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-hidden="true"
                  className="absolute w-[650px] h-[650px] object-cover"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #000000)' }}
        aria-hidden="true"
      />
    </section>
  )
}
