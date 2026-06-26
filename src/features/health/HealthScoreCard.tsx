import { useMemo, useState } from 'react'
import { ChevronRight, Info } from 'lucide-react'
import { useAccounts, useBudgets, useCategories, useSubscriptions, useTransactions } from '@/data/hooks'
import { financialHealth, type HealthComponent, type HealthComponentKey } from '@/data/selectors'
import { useSession } from '@/store/session'
import { Sheet } from '@/components/ui/Sheet'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { HealthGauge } from '@/components/charts/HealthGauge'
import { GRADE_META, HEALTH_META, TIP_THRESHOLD } from './healthMeta'
import { haptic } from '@/lib/haptics'

/** Couleur d'une barre de dimension selon son sous-score. */
function scoreColor(score: number): string {
  if (score >= 60) return 'var(--positive)'
  if (score >= 40) return 'var(--amber)'
  return 'var(--negative)'
}

/** Pourquoi une dimension n'est pas évaluée (affiché grisé dans la fiche). */
const UNEVALUATED_HINT: Record<HealthComponentKey, string> = {
  savings: 'Renseigne ton revenu mensuel dans Budgets pour l’évaluer.',
  emergency: 'Pas assez d’historique de dépenses pour l’évaluer.',
  budget: 'Crée des budgets pour suivre cette dimension.',
  subscriptions: 'Aucun abonnement actif détecté.',
}

export function HealthScoreCard() {
  const { data: accounts = [] } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: budgets = [] } = useBudgets()
  const { data: subscriptions = [] } = useSubscriptions()
  const monthlyIncome = useSession((s) => s.household?.monthlyIncome ?? 0)
  const [open, setOpen] = useState(false)

  const health = useMemo(
    () => financialHealth(accounts, transactions, budgets, categories, subscriptions, monthlyIncome),
    [accounts, transactions, budgets, categories, subscriptions, monthlyIncome],
  )

  // Pas assez de données pour un score crédible.
  if (health.score === null || health.grade === null) return null

  const grade = GRADE_META[health.grade]

  return (
    <section className="rise" style={{ animationDelay: '40ms' }}>
      <button className="card card-pad health-card" onClick={() => { haptic('tap'); setOpen(true) }}>
        <HealthGauge score={health.score} color={grade.color} size={96} />
        <div className="health-card-main">
          <span className="section-label">Santé financière</span>
          <span className="health-card-grade" style={{ color: grade.color }}>{grade.label}</span>
          <span className="health-card-blurb">{grade.blurb}</span>
        </div>
        <ChevronRight size={18} className="health-card-chevron" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Santé financière">
        <div className="health-sheet-head">
          <HealthGauge score={health.score} color={grade.color} size={148} />
          <span className="health-sheet-grade" style={{ color: grade.color }}>{grade.label}</span>
          <span className="health-sheet-blurb">{grade.blurb}</span>
          <span className="health-sheet-count">{health.evaluatedCount} dimension{health.evaluatedCount > 1 ? 's' : ''} évaluée{health.evaluatedCount > 1 ? 's' : ''} sur {health.components.length}</span>
        </div>

        <div className="health-dims">
          {health.components.map((c) => (
            <HealthDimension key={c.key} component={c} />
          ))}
        </div>

        <p className="health-disclaimer">
          <Info size={13} /> Indicateur d’hygiène budgétaire calculé sur tes données — repère, pas conseil en investissement.
        </p>
      </Sheet>
    </section>
  )
}

function HealthDimension({ component }: { component: HealthComponent }) {
  const meta = HEALTH_META[component.key]
  const Icon = meta.icon
  const evaluated = component.score !== null

  return (
    <div className={`health-dim ${evaluated ? '' : 'is-muted'}`}>
      <span className="health-dim-icon"><Icon size={17} /></span>
      <div className="health-dim-main">
        <div className="health-dim-top">
          <span className="health-dim-label">{meta.label}</span>
          <span className="health-dim-value num">
            {evaluated && component.value !== null ? meta.format(component.value) : 'non évalué'}
          </span>
        </div>
        {evaluated ? (
          <ProgressBar ratio={(component.score as number) / 100} color={scoreColor(component.score as number)} />
        ) : (
          <span className="health-dim-hint">{UNEVALUATED_HINT[component.key]}</span>
        )}
        {evaluated && (component.score as number) < TIP_THRESHOLD && (
          <span className="health-dim-tip">{meta.tip}</span>
        )}
      </div>
    </div>
  )
}
