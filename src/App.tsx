import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useSession } from '@/store/session'
import { useThemeStore, applyTheme } from '@/store/theme'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { BudgetsPage } from '@/features/budgets/BudgetsPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { SubscriptionsPage } from '@/features/subscriptions/SubscriptionsPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { AlertsPage } from '@/features/alerts/AlertsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'

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

  useEffect(() => {
    applyTheme(preference)
    initialize()
  }, [initialize, preference])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bienvenue" element={<OnboardingRoute />} />
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
      </BrowserRouter>
    </QueryClientProvider>
  )
}
