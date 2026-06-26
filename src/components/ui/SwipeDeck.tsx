import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Segmented } from './Segmented'
import { haptic } from '@/lib/haptics'

export interface DeckPanel {
  key: string
  /** Libellé court affiché dans l'onglet segmenté. */
  label: string
  node: ReactNode
}

interface Props {
  panels: DeckPanel[]
  /** Délai d'apparition (animation rise). */
  animationDelay?: string
  /** Affiche la barre d'onglets de navigation (par défaut true). */
  showTabs?: boolean
}

/**
 * Pager horizontal : un panneau visible à la fois, navigation par onglets
 * (Segmented) OU par swipe (drag). Allège les pages denses en empilant plusieurs
 * cartes au même endroit. Hauteur stable (= panneau le plus haut) pour éviter
 * les sauts de mise en page. Respecte prefers-reduced-motion (désactive le drag).
 */
// Espace entre cartes et largeur visible de la carte suivante (effet « peek »).
const GAP = 14
const PEEK = 34

export function SwipeDeck({ panels, animationDelay, showTabs = true }: Props) {
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  // Largeur du viewport (pour le translate en px et le seuil de swipe).
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Un seul panneau : pas de chrome de navigation.
  if (panels.length <= 1) {
    return (
      <section className="rise" style={{ animationDelay }}>
        {panels[0]?.node}
      </section>
    )
  }

  const clamp = (i: number) => Math.max(0, Math.min(panels.length - 1, i))
  const current = clamp(index)

  // Carte active plus étroite que le viewport → la suivante dépasse de PEEK px.
  const panelWidth = width > 0 ? Math.max(0, width - GAP - PEEK) : 0
  const step = panelWidth + GAP
  const trackWidth = panels.length * panelWidth + (panels.length - 1) * GAP
  const maxScroll = Math.max(0, trackWidth - width)
  // Décalage de la carte active ; clampé pour que la dernière s'aligne à droite.
  const offset = panelWidth > 0 ? Math.min(current * step, maxScroll) : 0

  return (
    <section className="rise swipe-deck" style={{ animationDelay }}>
      {showTabs && (
        <Segmented
          options={panels.map((p) => ({ value: p.key, label: p.label }))}
          value={panels[current].key}
          onChange={(k) => setIndex(panels.findIndex((p) => p.key === k))}
        />
      )}

      <div className="swipe-deck-viewport" ref={viewportRef}>
        <motion.div
          className="swipe-deck-track"
          style={{ gap: GAP }}
          drag={reduce ? false : 'x'}
          dragConstraints={{ left: -maxScroll, right: 0 }}
          dragElastic={0.12}
          animate={{ x: -offset }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          onDragEnd={(_, info) => {
            const threshold = Math.max(40, panelWidth * 0.2)
            let next = current
            if (info.offset.x < -threshold || info.velocity.x < -500) next = clamp(current + 1)
            else if (info.offset.x > threshold || info.velocity.x > 500) next = clamp(current - 1)
            if (next !== current) { haptic('selection'); setIndex(next) }
          }}
        >
          {panels.map((p, i) => (
            <div
              className={`swipe-deck-panel ${i === current ? '' : 'is-peek'}`}
              key={p.key}
              style={{ width: panelWidth || '100%' }}
            >
              {p.node}
            </div>
          ))}
        </motion.div>
      </div>

      <div className="swipe-deck-pager">
        <span className="swipe-deck-current">{panels[current].label}</span>
        <div className="swipe-deck-dots" role="tablist" aria-label="Changer de carte">
          {panels.map((p, i) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={p.label}
              className={i === current ? 'active' : ''}
              onClick={() => { if (i !== current) { haptic('selection'); setIndex(i) } }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
