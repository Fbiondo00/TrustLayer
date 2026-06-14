'use client'

import { useEffect, useRef } from 'react'

export function CursorFollower() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const visible = useRef(false)

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    if (window.matchMedia('(hover: none)').matches) return

    const onMove = (e: MouseEvent) => {
      if (!visible.current) {
        cursor.style.opacity = '1'
        visible.current = true
      }
      cursor.style.left = `${e.clientX}px`
      cursor.style.top = `${e.clientY}px`
    }

    const onLeave = () => {
      cursor.style.opacity = '0'
      visible.current = false
    }

    const onEnter = () => {
      cursor.style.opacity = '1'
      visible.current = true
    }

    window.addEventListener('mousemove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      className="cursor-follower hidden md:block"
      style={{ opacity: 0, left: '-100px', top: '-100px' }}
      aria-hidden="true"
    />
  )
}
