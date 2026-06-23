import { useState } from 'react'
import { motion, useReducedMotion, type Transition } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Account } from '@/types'
import { formatBalanceParts, formatMoneyCompact, formatRelative, maskIban } from '@/lib/format'
import { useCountUp } from '@/lib/useCountUp'
import { haptic } from '@/lib/haptics'

interface BalanceStackProps {
  accounts: Account[]
  income: number
  spending: number
  lastSync: string
  stale: boolean
  onOpenAccounts: () => void
  onOpenFlows?: () => void
}

interface View {
  key: string
  label: string
  value: number
  sub: string
}

const PEEK = 18 // décalage vertical (px) par niveau de profondeur
const SHRINK = 0.06 // réduction d'échelle par niveau
const DIP = 22 // amplitude du plongeon vers le bas pendant l'échange
const MAX_VISIBLE = 3 // cartes visibles dans la pile
// Trajet de l'échange : easeInOut → départ et arrivée tout en douceur (pas d'à-coup).
const SWAP: Transition = { duration: 0.56, ease: 'easeInOut', times: [0, 0.5, 1] }
const SETTLE: Transition = { type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }

interface Pose {
  y: number
  scale: number
  opacity: number
}

function poseFor(order: number): Pose {
  const depth = Math.min(order, MAX_VISIBLE - 1)
  return {
    y: -depth * PEEK,
    scale: 1 - depth * SHRINK,
    opacity: order >= MAX_VISIBLE ? 0 : 1,
  }
}

interface DeckCardProps {
  view: View
  order: number
  prevOrder: number
  count: number
  activeIndex: number
  income: number
  spending: number
  lastSync: string
  stale: boolean
  reduce: boolean | null
  onPrev: () => void
  onNext: () => void
  onOpenAccounts: () => void
  onOpenFlows?: () => void
  onBringFront: () => void
}

/**
 * Une carte réelle de la pile. Quand l'index actif change, chaque carte rejoint
 * sa nouvelle place via un trajet « plongeon » : elle descend puis remonte se
 * loger — d'où l'effet d'échange cohérent entre les deux cartes.
 */
function DeckCard({
  view, order, prevOrder, count, activeIndex, income, spending, lastSync, stale, reduce,
  onPrev, onNext, onOpenAccounts, onOpenFlows, onBringFront,
}: DeckCardProps) {
  const animated = useCountUp(view.value)
  const bal = formatBalanceParts(animated)
  const isFront = order === 0
  const isHousehold = view.key === 'household'

  const pose = poseFor(order)
  const prev = poseFor(prevOrder)
  const moving = order !== prevOrder
  // Le « plongeon » ne concerne que les 2 cartes qui s'échangent vraiment l'avant
  // (celle qui quitte le premier plan et celle qui y arrive) → reste lisible.
  const swapping = moving && (order === 0 || prevOrder === 0)

  const animate = reduce
    ? { opacity: pose.opacity }
    : swapping
      ? {
          y: [prev.y, Math.max(prev.y, pose.y) + DIP, pose.y],
          scale: [prev.scale, (prev.scale + pose.scale) / 2, pose.scale],
          opacity: [prev.opacity, 1, pose.opacity],
        }
      : { y: pose.y, scale: pose.scale, opacity: pose.opacity }

  return (
    <motion.div
      className={`hcard deck-card${isFront ? ' is-front' : ''}`}
      style={{ zIndex: count - order, pointerEvents: pose.opacity === 0 ? 'none' : 'auto' }}
      animate={animate}
      transition={reduce ? { duration: 0.2 } : swapping ? SWAP : SETTLE}
      onClick={isFront ? undefined : () => { haptic('selection'); onBringFront() }}
    >
      <div className="hcard-shine" aria-hidden="true" />

      <div className="hcard-top">
        <span className="hcard-label">{view.label}</span>
        {isFront && count > 1 && (
          <div className="hcard-nav">
            <button type="button" aria-label="Carte précédente" onClick={onPrev}><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Carte suivante" onClick={onNext}><ChevronRight size={18} /></button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="hcard-amount num"
        tabIndex={isFront ? 0 : -1}
        onClick={() => { haptic('tap'); onOpenAccounts() }}
      >
        {bal.sign}{bal.whole}<span className="hcard-cents">,{bal.cents} €</span>
      </button>

      <div className="hcard-foot">
        {isHousehold ? (
          <button
            type="button"
            className="hcard-flows"
            tabIndex={isFront ? 0 : -1}
            onClick={() => { haptic('tap'); onOpenFlows?.() }}
            aria-label="Voir les opérations du mois"
          >
            <span className="hcard-flow">
              <span className="hcard-flow-label">Entrées</span>
              <span className="hcard-flow-value pos num">{formatMoneyCompact(income)}</span>
            </span>
            <span className="hcard-flow">
              <span className="hcard-flow-label">Sorties</span>
              <span className="hcard-flow-value neg num">{formatMoneyCompact(spending)}</span>
            </span>
          </button>
        ) : (
          <span className="hcard-chip">{view.sub}</span>
        )}
        <span className={`hcard-fresh ${stale ? 'stale' : ''}`}>
          {stale ? 'À actualiser' : `MAJ ${formatRelative(lastSync)}`}
        </span>
      </div>

      {isFront && count > 1 && (
        <div className="hcard-dots" aria-hidden="true">
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} className={i === activeIndex ? 'active' : ''} />
          ))}
        </div>
      )}

      <span className="deck-scrim" aria-hidden="true" style={{ opacity: order === 0 ? 0 : Math.min(0.12 + Math.min(order, MAX_VISIBLE - 1) * 0.12, 0.42) }} />
    </motion.div>
  )
}

/**
 * Carte solde — deck de cartes réelles (foyer + chaque compte) qui s'interchangent
 * avec une animation de plongeon/remontée. Pièce maîtresse du dashboard.
 */
export function BalanceStack({ accounts, income, spending, lastSync, stale, onOpenAccounts, onOpenFlows }: BalanceStackProps) {
  const reduce = useReducedMotion()
  const [nav, setNav] = useState({ index: 0, prev: 0 })

  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const views: View[] = [
    { key: 'household', label: 'Solde du foyer', value: total, sub: `${accounts.length} compte${accounts.length > 1 ? 's' : ''}` },
    ...accounts.map((a) => ({ key: a.id, label: a.name, value: a.balance, sub: maskIban(a.iban) })),
  ]
  const count = views.length
  const activeIndex = Math.min(nav.index, count - 1)
  const prevIndex = Math.min(nav.prev, count - 1)

  const go = (next: number) => setNav((s) => ({ index: (next + count) % count, prev: s.index }))
  const move = (dir: number) => () => { haptic('selection'); go(activeIndex + dir) }

  return (
    <div className="balance-stack rise" style={{ animationDelay: '20ms' }}>
      {views.map((view, i) => (
        <DeckCard
          key={view.key}
          view={view}
          order={(i - activeIndex + count) % count}
          prevOrder={(i - prevIndex + count) % count}
          count={count}
          activeIndex={activeIndex}
          income={income}
          spending={spending}
          lastSync={lastSync}
          stale={stale}
          reduce={reduce}
          onPrev={move(-1)}
          onNext={move(1)}
          onOpenAccounts={onOpenAccounts}
          onOpenFlows={onOpenFlows}
          onBringFront={() => go(i)}
        />
      ))}
    </div>
  )
}
