import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { LayoutGrid, ArrowLeftRight, Wallet, Target, Repeat } from 'lucide-react'
import { useT } from '@/i18n'

export function TabBar() {
  const t = useT()
  const tabs = [
    { to: '/', label: t.nav.home, icon: LayoutGrid, end: true },
    { to: '/operations', label: t.nav.transactions, icon: ArrowLeftRight, end: false },
    { to: '/budgets', label: t.nav.budgets, icon: Wallet, end: false },
    { to: '/objectifs', label: t.nav.goals, icon: Target, end: false },
    { to: '/abonnements', label: t.nav.subscriptionsShort, icon: Repeat, end: false },
  ]
  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="tab-indicator"
                    transition={{ type: 'spring', damping: 28, stiffness: 420 }}
                  />
                )}
                <motion.span
                  className="tab-icon-shell"
                  animate={isActive ? { y: -2, scale: 1.04 } : { y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 420 }}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                </motion.span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
