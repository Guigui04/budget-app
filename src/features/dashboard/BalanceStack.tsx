import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react'
import { formatBalanceParts, formatMoneyCompact, formatRelative } from '@/lib/format'
import { useCountUp } from '@/lib/useCountUp'

interface BalanceStackProps {
  balance: number
  income: number
  spending: number
  accountsCount: number
  lastSync: string
  stale: boolean
  onClick: () => void
}

/**
 * Carte solde en « deck » empilé (inspiration onebank) : des cartes fantômes
 * dépassent derrière la carte principale pour un effet de profondeur. Le solde
 * compte vers le haut à l'apparition.
 */
export function BalanceStack({ balance, income, spending, accountsCount, lastSync, stale, onClick }: BalanceStackProps) {
  const reduce = useReducedMotion()
  const animated = useCountUp(balance)
  const bal = formatBalanceParts(animated)
  const flow = income + spending
  const incomeShare = flow > 0 ? income / flow : 0.5

  return (
    <div className="balance-stack rise" style={{ animationDelay: '20ms' }}>
      <span className="bstack-ghost bstack-ghost-2" aria-hidden="true" />
      <span className="bstack-ghost bstack-ghost-1" aria-hidden="true" />

      <motion.button
        type="button"
        className="hero-card"
        onClick={onClick}
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        whileTap={reduce ? undefined : { scale: 0.985 }}
      >
        <div className="hero-top">
          <span className="section-label">Solde total du foyer</span>
          <span className="hero-chip"><CreditCard size={15} /> {accountsCount} compte{accountsCount > 1 ? 's' : ''}</span>
        </div>

        <div className="hero-amount num">
          {bal.sign}{bal.whole}<span className="hero-amount-cents">,{bal.cents} €</span>
        </div>
        <span className={`hero-fresh ${stale ? 'stale' : ''}`}>
          {stale ? 'Données à actualiser' : `Mis à jour ${formatRelative(lastSync)}`}
        </span>

        <div className="hero-flow">
          <div className="hero-flow-bar">
            <span className="hero-flow-in" style={{ width: `${incomeShare * 100}%` }} />
          </div>
          <div className="hero-flow-legend">
            <span className="hero-flow-item"><ArrowDownLeft size={14} /> Entrées <b className="num">{formatMoneyCompact(income)}</b></span>
            <span className="hero-flow-item out"><ArrowUpRight size={14} /> Sorties <b className="num">{formatMoneyCompact(spending)}</b></span>
          </div>
        </div>
      </motion.button>
    </div>
  )
}
