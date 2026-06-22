import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'
import { useSession } from '@/store/session'
import { useT } from '@/i18n'

// Ordre des écrans → détermine le sens du glissement de transition.
const NAV_ORDER = ['/', '/operations', '/budgets', '/objectifs', '/abonnements', '/comptes', '/alertes', '/reglages']
const navIndex = (p: string) => {
  const i = NAV_ORDER.indexOf(p)
  return i === -1 ? 0 : i
}

function greetingForHour(t: ReturnType<typeof useT>): string {
  const h = new Date().getHours()
  if (h < 6) return t.greeting.night
  if (h < 12) return t.greeting.morning
  if (h < 18) return t.greeting.afternoon
  return t.greeting.evening
}

export function AppShell() {
  const { pathname } = useLocation()
  const user = useSession((s) => s.user)
  const reduceMotion = useReducedMotion()
  const t = useT()
  const titles: Record<string, string> = {
    '/': t.nav.home,
    '/operations': t.nav.transactions,
    '/budgets': t.nav.budgets,
    '/objectifs': t.nav.goals,
    '/abonnements': t.nav.subscriptions,
    '/comptes': t.nav.accounts,
    '/alertes': t.nav.alerts,
    '/reglages': t.nav.settings,
  }
  const isHome = pathname === '/'
  const title = titles[pathname] ?? t.common.appName
  const greeting = isHome && user ? `${greetingForHour(t)}, ${user.displayName}` : undefined

  // Sens du glissement : avancer dans la nav = vers la gauche, reculer = droite.
  // Pattern officiel React : ajuster l'état pendant le rendu quand la route change.
  const current = navIndex(pathname)
  const [nav, setNav] = useState({ index: current, dir: 1 })
  if (nav.index !== current) {
    setNav({ index: current, dir: current >= nav.index ? 1 : -1 })
  }
  const shift = 26 * nav.dir

  return (
    <div className="app-shell">
      <div className="shell-ledger" aria-hidden="true" />
      <TopBar title={title} greeting={greeting} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          className="app-main"
          initial={reduceMotion ? false : { opacity: 0, x: shift }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -shift }}
          transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <TabBar />
    </div>
  )
}
