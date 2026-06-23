import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Account } from '@/types'
import { formatBalanceParts, formatRelative, maskIban } from '@/lib/format'
import { useCountUp } from '@/lib/useCountUp'
import { haptic } from '@/lib/haptics'

interface BalanceStackProps {
  accounts: Account[]
  lastSync: string
  stale: boolean
  onOpenAccounts: () => void
}

interface View {
  label: string
  value: number
  sub: string
}

/**
 * Carte solde — pièce maîtresse du dashboard. Allure de carte bancaire (dégradé
 * violet, deck empilé façon onebank), solde en très grande typo, carrousel pour
 * passer du total du foyer à chaque compte (cf. inspirations).
 */
export function BalanceStack({ accounts, lastSync, stale, onOpenAccounts }: BalanceStackProps) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const views: View[] = [
    { label: 'Solde du foyer', value: total, sub: `${accounts.length} compte${accounts.length > 1 ? 's' : ''}` },
    ...accounts.map((a) => ({ label: a.name, value: a.balance, sub: maskIban(a.iban) })),
  ]
  const view = views[Math.min(index, views.length - 1)]
  const multi = views.length > 1

  const animated = useCountUp(view.value)
  const bal = formatBalanceParts(animated)

  const move = (dir: number) => () => {
    haptic('selection')
    setIndex((i) => (i + dir + views.length) % views.length)
  }

  return (
    <div className="balance-stack rise" style={{ animationDelay: '20ms' }}>
      <span className="bstack-ghost bstack-ghost-2" aria-hidden="true" />
      <span className="bstack-ghost bstack-ghost-1" aria-hidden="true" />

      <motion.div
        className="hcard"
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="hcard-shine" aria-hidden="true" />

        <div className="hcard-top">
          <span className="hcard-label">{view.label}</span>
          {multi && (
            <div className="hcard-nav">
              <button type="button" aria-label="Compte précédent" onClick={move(-1)}><ChevronLeft size={18} /></button>
              <button type="button" aria-label="Compte suivant" onClick={move(1)}><ChevronRight size={18} /></button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="hcard-amount num"
          onClick={() => { haptic('tap'); onOpenAccounts() }}
        >
          {bal.sign}{bal.whole}<span className="hcard-cents">,{bal.cents} €</span>
        </button>

        <div className="hcard-foot">
          <span className="hcard-chip">{view.sub}</span>
          <span className={`hcard-fresh ${stale ? 'stale' : ''}`}>
            {stale ? 'À actualiser' : `MAJ ${formatRelative(lastSync)}`}
          </span>
        </div>

        {multi && (
          <div className="hcard-dots" aria-hidden="true">
            {views.map((_, i) => (
              <span key={i} className={i === index ? 'active' : ''} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
