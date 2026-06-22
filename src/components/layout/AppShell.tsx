import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'
import { useSession } from '@/store/session'
import { useT } from '@/i18n'

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

  return (
    <div className="app-shell">
      <div className="shell-ledger" aria-hidden="true" />
      <TopBar title={title} greeting={greeting} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          className="app-main"
          initial={reduceMotion ? false : { opacity: 0, y: 12, filter: 'blur(6px)' }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <TabBar />
    </div>
  )
}
