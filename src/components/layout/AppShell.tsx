import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'
import { useSession } from '@/store/session'

const titles: Record<string, string> = {
  '/': 'Accueil',
  '/operations': 'Opérations',
  '/budgets': 'Budgets',
  '/objectifs': 'Objectifs',
  '/abonnements': 'Abonnements',
  '/comptes': 'Comptes',
  '/alertes': 'Notifications',
  '/reglages': 'Réglages',
}

function greetingForHour(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function AppShell() {
  const { pathname } = useLocation()
  const user = useSession((s) => s.user)
  const reduceMotion = useReducedMotion()
  const isHome = pathname === '/'
  const title = titles[pathname] ?? 'Foyer'
  const greeting = isHome && user ? `${greetingForHour()}, ${user.displayName}` : undefined

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
