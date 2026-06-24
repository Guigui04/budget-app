import { Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { TopBar } from './TopBar'
import { TabBar } from './TabBar'
import { AssistantFab } from '@/features/assistant/AssistantFab'
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
  const greeting = isHome && user ? greetingForHour(t) : undefined

  return (
    <div className="app-shell">
      <TopBar title={title} greeting={greeting} isHome={isHome} />
      {/* Fondu d'apparition à chaque changement de route. La clé = pathname force
          un nouveau montage → motion rejoue initial→animate (fondu fiable, sans
          attente ni « pop »). Pas d'AnimatePresence : l'ancienne page laisse
          place au fond animé pendant que la nouvelle apparaît en douceur. */}
      <motion.main
        key={pathname}
        className="app-main"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.32, ease: 'easeInOut' }}
      >
        <Outlet />
      </motion.main>
      <TabBar />
      <AssistantFab />
    </div>
  )
}
