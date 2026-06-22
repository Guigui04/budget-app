import { useEffect, useRef, useState } from 'react'

/**
 * Anime une valeur numérique de sa valeur précédente vers `value` (count-up).
 * Respecte prefers-reduced-motion (rend la valeur finale immédiatement).
 */
export function useCountUp(value: number, duration = 600): number {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    const to = value
    if (reduce || from === to) {
      setDisplay(to)
      fromRef.current = to
      return
    }

    let start: number | null = null
    const tick = (ts: number) => {
      if (start === null) start = ts
      const t = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setDisplay(from + (to - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = to
    }
  }, [value, duration])

  return display
}
