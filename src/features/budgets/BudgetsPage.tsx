import { useMemo, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { useBudgets, useCategories, useTransactions } from '@/data/hooks'
import { buildEnvelopes, monthSpending } from '@/data/selectors'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { BudgetSheet } from './BudgetSheet'
import { formatMoney, formatMoneyCompact, formatMonth, formatPercent } from '@/lib/format'
import type { BudgetEnvelope } from '@/types'

export function BudgetsPage() {
  const { data: budgets = [] } = useBudgets()
  const { data: categories = [] } = useCategories()
  const { data: transactions = [] } = useTransactions()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetEnvelope | null>(null)

  const envelopes = useMemo(
    () => buildEnvelopes(budgets, categories, transactions),
    [budgets, categories, transactions],
  )
  const totals = useMemo(() => {
    const allocated = budgets.reduce((s, b) => s + b.amount, 0)
    const spent = envelopes.reduce((s, e) => s + e.spent, 0)
    return { allocated, spent, spending: monthSpending(transactions) }
  }, [budgets, envelopes, transactions])

  const available = categories.filter(
    (c) => !budgets.some((b) => b.categoryId === c.id) && c.name !== 'Salaire' && c.name !== 'Épargne',
  )

  function openNew() {
    setEditing(null)
    setSheetOpen(true)
  }
  function openEdit(env: BudgetEnvelope) {
    setEditing(env)
    setSheetOpen(true)
  }

  return (
    <div className="page">
      <section className="card card-pad rise budget-summary">
        <span className="section-label">{formatMonth(new Date().toISOString())}</span>
        <div className="budget-summary-amount num">
          {formatMoney(totals.spent)}
          <span className="budget-summary-of"> / {formatMoneyCompact(totals.allocated)}</span>
        </div>
        <ProgressBar ratio={totals.allocated > 0 ? totals.spent / totals.allocated : 0} semantic />
        <p className="budget-summary-hint">
          {totals.allocated - totals.spent >= 0
            ? `${formatMoney(totals.allocated - totals.spent)} restants dans vos enveloppes`
            : `${formatMoney(totals.spent - totals.allocated)} au-dessus du total alloué`}
        </p>
      </section>

      <div className="row-head rise" style={{ animationDelay: '60ms' }}>
        <h2 className="block-title">Enveloppes</h2>
        <Button size="sm" variant="ghost" onClick={openNew}><Plus size={16} /> Ajouter</Button>
      </div>

      {envelopes.length === 0 ? (
        <EmptyState icon={Wallet} title="Aucune enveloppe" hint="Créez un budget mensuel par catégorie pour suivre vos dépenses." />
      ) : (
        <div className="env-list">
          {envelopes.map((env, i) => (
            <button
              key={env.budget.id}
              className="card card-pad env-card rise"
              style={{ animationDelay: `${80 + i * 40}ms` }}
              onClick={() => openEdit(env)}
            >
              <div className="env-head">
                <CategoryIcon icon={env.category.icon} color={env.category.color} size={42} />
                <div className="env-titles">
                  <span className="env-name">{env.category.name}</span>
                  <span className="env-sub num">{formatMoney(env.spent)} sur {formatMoneyCompact(env.budget.amount)}</span>
                </div>
                <span className={`env-badge ${env.ratio >= 1 ? 'over' : env.ratio >= 0.8 ? 'warn' : ''}`}>
                  {formatPercent(env.ratio)}
                </span>
              </div>
              <ProgressBar ratio={env.ratio} semantic />
              <div className="env-foot">
                {env.remaining >= 0
                  ? <span className="num">{formatMoney(env.remaining)} restants</span>
                  : <span className="num over-text">{formatMoney(-env.remaining)} de dépassement</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <BudgetSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} available={available} />
    </div>
  )
}
