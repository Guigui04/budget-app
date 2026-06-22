import { useMemo, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { useBudgets, useCategories, useTransactions } from '@/data/hooks'
import { buildEnvelopes, monthSpending } from '@/data/selectors'
import { useSession } from '@/store/session'
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
  const household = useSession((s) => s.household)
  const updateIncome = useSession((s) => s.updateHouseholdIncome)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetEnvelope | null>(null)

  const income = household?.monthlyIncome ?? 0

  function saveIncome(raw: string) {
    const value = Number(raw.replace(',', '.')) || 0
    if (value !== income) void updateIncome(value)
  }

  const envelopes = useMemo(
    () => buildEnvelopes(budgets, categories, transactions),
    [budgets, categories, transactions],
  )
  const totals = useMemo(() => {
    const allocated = budgets.reduce((s, b) => s + b.amount, 0)
    const spent = envelopes.reduce((s, e) => s + e.spent, 0)
    return { allocated, spent, spending: monthSpending(transactions) }
  }, [budgets, envelopes, transactions])

  const projectedRemaining = income - totals.allocated

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
      <section className="card card-pad rise budget-forecast">
        <span className="section-label">Prévisionnel · {formatMonth(new Date().toISOString())}</span>

        <div className="forecast-line">
          <label htmlFor="income">Revenu du mois</label>
          <div className="forecast-income">
            <input
              id="income"
              key={income}
              type="text"
              inputMode="decimal"
              className="forecast-income-input num"
              placeholder="0"
              defaultValue={income ? String(income) : ''}
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9.,]/g, '') }}
              onBlur={(e) => saveIncome(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <span className="forecast-euro">€</span>
          </div>
        </div>

        <div className="forecast-line">
          <span>Budgets alloués</span>
          <span className="num forecast-neg">− {formatMoney(totals.allocated)}</span>
        </div>

        <div className="forecast-divider" />

        <div className="forecast-result">
          <span>Reste prévu en fin de mois</span>
          <span className={`num ${projectedRemaining >= 0 ? 'forecast-pos' : 'forecast-over'}`}>
            {formatMoney(projectedRemaining)}
          </span>
        </div>

        <p className="budget-summary-hint">
          Déjà dépensé : <span className="num">{formatMoney(totals.spent)}</span> sur{' '}
          <span className="num">{formatMoneyCompact(totals.allocated)}</span> budgétés
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
