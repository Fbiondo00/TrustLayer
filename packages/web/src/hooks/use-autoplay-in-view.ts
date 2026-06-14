'use client'

import { useEffect, useRef } from 'react'

/**
 * Autoplays a `<video>` while it is visible on screen and pauses otherwise.
 * Honors `prefers-reduced-motion` by leaving the video paused.
 */
export function useAutoplayInView<T extends HTMLVideoElement = HTMLVideoElement>(
  threshold = 0.2,
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return ref
}
