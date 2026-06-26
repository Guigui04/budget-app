import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

interface ConfettiProps {
  /** Déclenche la salve quand passe à true. */
  active: boolean
  /** Appelé à la fin de l'animation pour réinitialiser l'état appelant. */
  onDone?: () => void
}

const COLORS = ['#7c5cff', '#46c79a', '#f0784a', '#e8b24c', '#6fa8dc', '#ff6f93']
const COUNT = 28

/** Hash déterministe → [0,1) pour des trajectoires stables (pas de Math.random au render). */
function rnd(seed: number): number {
  const x = Math.sin(seed * 99.13) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Salve de confettis plein écran, célébrant un jalon ou un objectif atteint.
 * Rendu via portail (au-dessus de tout), une seule fois par activation.
 * Respecte prefers-reduced-motion : ne s'affiche pas si l'utilisateur le demande.
 */
export function Confetti({ active, onDone }: ConfettiProps) {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        x: (rnd(i + 1) - 0.5) * 320,
        y: 220 + rnd(i + 7) * 240,
        rotate: (rnd(i + 3) - 0.5) * 720,
        delay: rnd(i + 5) * 0.12,
        color: COLORS[i % COLORS.length],
        size: 7 + rnd(i + 11) * 6,
      })),
    [],
  )

  // Auto-réinitialise l'état appelant une fois la salve terminée, pour qu'un
  // jalon suivant puisse re-déclencher l'animation.
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => onDone?.(), 1600)
    return () => clearTimeout(t)
  }, [active, onDone])

  if (reduce) return null

  return createPortal(
    <AnimatePresence onExitComplete={onDone}>
      {active && (
        <motion.div
          className="confetti-layer"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="confetti-piece"
              style={{ background: p.color, width: p.size, height: p.size * 1.4 }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate }}
              transition={{ duration: 1.3, delay: p.delay, ease: [0.2, 0.6, 0.3, 1] }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
