import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Repeat, ChevronRight, AlertCircle, Tags } from 'lucide-react'
import { useAccounts, useAlerts, useBudgets, useCategories, useSubscriptions, useTransactions } from '@/data/hooks'
import {
  activeSubscriptionsMonthlyCost,
  buildEnvelopes,
  categoryBreakdown,
  monthIncome,
  monthSpending,
  monthlyEvolution,
} from '@/data/selectors'
import { DonutChart } from '@/components/charts/DonutChart'
import { MonthlyBars } from '@/components/charts/MonthlyBars'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { TransactionRow } from '@/components/TransactionRow'
import { BalanceStack } from './BalanceStack'
import { BalanceActions } from './BalanceActions'
import { ForecastCard } from './ForecastCard'
import { HealthScoreCard } from '@/features/health/HealthScoreCard'
import { WrappedTeaser } from '@/features/wrapped/WrappedTeaser'
import { formatMoneyCompact, isStale } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { alertCopy } from '@/features/alerts/alertCopy'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: accounts = [] } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: budgets = [] } = useBudgets()
  const { data: subscriptions = [] } = useSubscriptions()
  const { data: alerts = [] } = useAlerts()

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const summary = useMemo(() => {
    const spending = monthSpending(transactions)
    const income = monthIncome(transactions)
    const envelopes = buildEnvelopes(budgets, categories, transactions).slice(0, 3)
    const breakdown = categoryBreakdown(transactions, categories).slice(0, 6)
    const evolution = monthlyEvolution(transactions, 6)
    const subsCost = activeSubscriptionsMonthlyCost(subscriptions)
    const recent = [...transactions].sort((a, b) => b.bookingDate.localeCompare(a.bookingDate)).slice(0, 4)
    const lastSync = accounts.reduce<string>(
      (latest, a) => (a.balanceUpdatedAt > latest ? a.balanceUpdatedAt : latest),
      accounts[0]?.balanceUpdatedAt ?? new Date().toISOString(),
    )
    return { spending, income, envelopes, breakdown, evolution, subsCost, recent, lastSync }
  }, [accounts, transactions, categories, budgets, subscriptions])

  const recentAlerts = alerts.slice(0, 3)
  const stale = accounts.length > 0 && isStale(summary.lastSync)
  const todoCount = transactions.filter((t) => t.categoryId === null).length

  return (
    <div className="page">
      <BalanceStack
        accounts={accounts}
        income={summary.income}
        spending={summary.spending}
        lastSync={summary.lastSync}
        stale={stale}
        onOpenAccounts={() => navigate('/comptes')}
        onOpenFlows={() => navigate('/operations')}
      />

      <BalanceActions />

      <HealthScoreCard />

      <ForecastCard accounts={accounts} transactions={transactions} categories={categories} />

      <WrappedTeaser transactions={transactions} categories={categories} />

      {todoCount > 0 && (
        <button
          className="todo-nudge rise"
          style={{ animationDelay: '100ms' }}
          onClick={() => { haptic('selection'); navigate('/operations') }}
        >
          <span className="todo-nudge-icon"><Tags size={18} /></span>
          <span className="todo-nudge-main">
            <span className="todo-nudge-title">{todoCount} opération{todoCount > 1 ? 's' : ''} à classer</span>
            <span className="todo-nudge-sub">Catégorise pour des budgets précis</span>
          </span>
          <ChevronRight size={18} />
        </button>
      )}

      {/* Dernières opérations */}
      {summary.recent.length > 0 && (
        <section className="rise" style={{ animationDelay: '160ms' }}>
          <div className="row-head">
            <h2 className="block-title">Dernières opérations</h2>
            <button className="link-btn" onClick={() => { haptic('tap'); navigate('/operations') }}>Tout voir <ChevronRight size={16} /></button>
          </div>
          <div className="card stack-rows">
            {summary.recent.map((txn) => (
              <TransactionRow
                key={txn.id}
                txn={txn}
                category={txn.categoryId ? catMap.get(txn.categoryId) : undefined}
                onClick={() => { haptic('tap'); navigate('/operations') }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Budgets */}
      {summary.envelopes.length > 0 && (
        <section className="rise" style={{ animationDelay: '190ms' }}>
          <div className="row-head">
            <h2 className="block-title">Budgets</h2>
            <button className="link-btn" onClick={() => { haptic('tap'); navigate('/budgets') }}>Tout voir <ChevronRight size={16} /></button>
          </div>
          <div className="card card-pad stack-3">
            {summary.envelopes.map((env) => (
              <div key={env.budget.id} className="mini-env">
                <CategoryIcon icon={env.category.icon} color={env.category.color} size={36} />
                <div className="mini-env-main">
                  <div className="mini-env-top">
                    <span>{env.category.name}</span>
                    <span className="num">{formatMoneyCompact(env.spent)} / {formatMoneyCompact(env.budget.amount)}</span>
                  </div>
                  <ProgressBar ratio={env.ratio} semantic />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Répartition */}
      {summary.breakdown.length > 0 && (
        <section className="rise" style={{ animationDelay: '220ms' }}>
          <div className="row-head">
            <h2 className="block-title">Répartition des dépenses</h2>
          </div>
          <div className="card card-pad">
            <DonutChart slices={summary.breakdown} total={summary.spending} />
            <ul className="legend">
              {summary.breakdown.map((s) => (
                <li key={s.category.id}>
                  <span className="legend-dot" style={{ background: s.category.color }} />
                  <span className="legend-name">{s.category.name}</span>
                  <span className="legend-val num">{formatMoneyCompact(s.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Évolution */}
      <section className="rise" style={{ animationDelay: '250ms' }}>
        <div className="row-head">
          <h2 className="block-title">Évolution mensuelle</h2>
        </div>
        <div className="card card-pad">
          <MonthlyBars points={summary.evolution} />
        </div>
      </section>

      {/* Abonnements */}
      <section className="rise" style={{ animationDelay: '280ms' }}>
        <button className="card card-pad subs-card" onClick={() => { haptic('tap'); navigate('/abonnements') }}>
          <span className="subs-icon"><Repeat size={20} /></span>
          <div className="subs-main">
            <span className="section-label">Abonnements</span>
            <span className="subs-sub">{subscriptions.filter((s) => s.isActive).length} actifs</span>
          </div>
          <div className="subs-amount num">{formatMoneyCompact(summary.subsCost)}<small>/mois</small></div>
        </button>
      </section>

      {/* Alertes */}
      {recentAlerts.length > 0 && (
        <section className="rise" style={{ animationDelay: '310ms' }}>
          <div className="row-head">
            <h2 className="block-title">Alertes récentes</h2>
            <button className="link-btn" onClick={() => { haptic('tap'); navigate('/alertes') }}>Tout voir <ChevronRight size={16} /></button>
          </div>
          <div className="card card-pad stack-3">
            {recentAlerts.map((a) => {
              const copy = alertCopy(a)
              return (
                <div key={a.id} className="mini-alert">
                  <span className="mini-alert-icon" style={{ background: `${copy.color}22`, color: copy.color }}>
                    <AlertCircle size={16} />
                  </span>
                  <div className="mini-alert-main">
                    <span className="mini-alert-title">{copy.title}</span>
                    <span className="mini-alert-desc">{copy.description}</span>
                  </div>
                  {!a.isRead && <span className="unread-dot" />}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
