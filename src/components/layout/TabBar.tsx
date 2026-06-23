import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { Home, ArrowLeftRight, Wallet, Target } from 'lucide-react'
import { useT } from '@/i18n'
import { haptic } from '@/lib/haptics'

/**
 * Barre de navigation basse — épurée, flottante, 4 destinations principales,
 * pilule active violette (cf. inspirations onebank / purple wallet). Les
 * destinations secondaires (comptes, abonnements, notifications, réglages) sont
 * atteintes via le header et les cartes du dashboard.
 */
export function TabBar() {
  const t = useT()
  const tabs = [
    { to: '/', label: t.nav.home, icon: Home, end: true },
    { to: '/operations', label: t.nav.transactions, icon: ArrowLeftRight, end: false },
    { to: '/budgets', label: t.nav.budgets, icon: Wallet, end: false },
    { to: '/objectifs', label: t.nav.goals, icon: Target, end: false },
  ]

  return (
    <nav className="dock">
      <div className="dock-inner">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            onClick={() => haptic('tap')}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="tab-indicator"
                    transition={{ type: 'spring', damping: 30, stiffness: 480 }}
                  />
                )}
                <motion.span
                  className="tab-icon-shell"
                  animate={isActive ? { scale: 1.04 } : { scale: 1 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 420 }}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
                </motion.span>
                <span className="tab-label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
