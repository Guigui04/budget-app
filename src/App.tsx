import { lazy, Suspense, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteFallback } from '@/components/layout/RouteFallback'
import { UnlockScreen } from '@/features/auth/UnlockScreen'
import { useSession } from '@/store/session'
import { useThemeStore, applyTheme } from '@/store/theme'
import { useLock } from '@/store/lock'

// Chaque page est chargée à la demande (code-splitting par route).
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })))
const BudgetsPage = lazy(() => import('@/features/budgets/BudgetsPage').then((m) => ({ default: m.BudgetsPage })))
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })))
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })))
const AlertsPage = lazy(() => import('@/features/alerts/AlertsPage').then((m) => ({ default: m.AlertsPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const PrivacyPage = lazy(() => import('@/features/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('@/features/legal/TermsPage').then((m) => ({ default: m.TermsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

function Protected() {
  const status = useSession((s) => s.status)
  if (status === 'loading') return null
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (status === 'onboarding') return <Navigate to="/bienvenue" replace />
  return <AppShell />
}

function OnboardingRoute() {
  const status = useSession((s) => s.status)
  if (status === 'loading') return null
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <OnboardingPage />
}

export default function App() {
  const initialize = useSession((s) => s.initialize)
  const preference = useThemeStore((s) => s.preference)
  const locked = useLock((s) => s.locked)

  useEffect(() => {
    applyTheme(preference)
    initialize()
  }, [initialize, preference])

  // Verrou PIN : tant que l'app est verrouillée, rien d'autre n'est rendu.
  if (locked) return <UnlockScreen />

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/bienvenue" element={<OnboardingRoute />} />
            <Route path="/confidentialite" element={<PrivacyPage />} />
            <Route path="/conditions" element={<TermsPage />} />
            <Route element={<Protected />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/operations" element={<TransactionsPage />} />
              <Route path="/budgets" element={<BudgetsPage />} />
              <Route path="/objectifs" element={<GoalsPage />} />
              <Route path="/abonnements" element={<SubscriptionsPage />} />
              <Route path="/comptes" element={<AccountsPage />} />
              <Route path="/alertes" element={<AlertsPage />} />
              <Route path="/reglages" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
