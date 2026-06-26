import { useMemo, useState } from 'react'
import { Plus, Target, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAccounts, useGoals, useGoalContributions, useTransactions } from '@/data/hooks'
import { estimateMonthlyPace, goalProjection, monthForecast } from '@/data/selectors'
import { useForecastPrefs } from '@/store/forecast'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sheet } from '@/components/ui/Sheet'
import { GoalSheet } from '@/features/goals/GoalSheet'
import { formatMoney, formatMoneyCompact, formatPercent, formatMonth } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { Goal, GoalContribution } from '@/types'

/**
 * Vue « Objectifs » du hub Patrimoine — nouvelle génération : projection/ETA,
 * jalons, chronologie partagée, et allocation du surplus de fin de mois (réutilise
 * la prévision déterministe `monthForecast`).
 */
export function GoalsView() {
  const { data: goals = [] } = useGoals()
  const { data: contributions = [] } = useGoalContributions()
  const { data: accounts = [] } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const excludedChargeKeys = useForecastPrefs((s) => s.excludedChargeKeys)

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Goal | null>(null)
  const [prefill, setPrefill] = useState<number | undefined>(undefined)
  const [allocOpen, setAllocOpen] = useState(false)

  // Versements groupés par objectif (pour estimer le rythme de chacun).
  const byGoal = useMemo(() => {
    const map = new Map<string, GoalContribution[]>()
    for (const c of contributions) {
      const arr = map.get(c.goalId)
      if (arr) arr.push(c)
      else map.set(c.goalId, [c])
    }
    return map
  }, [contributions])

  // Surplus projeté en fin de mois — proposé à l'épargne.
  const surplus = useMemo(() => {
    if (accounts.length === 0 || transactions.length === 0) return 0
    const f = monthForecast(accounts, transactions, new Date(), new Set(excludedChargeKeys))
    return Math.max(0, Math.round(f.delta))
  }, [accounts, transactions, excludedChargeKeys])

  // Objectifs éligibles à l'allocation : non liés à un compte et non atteints.
  const eligible = useMemo(
    () => goals.filter((g) => !g.linkedAccountId && g.currentAmount < g.targetAmount),
    [goals],
  )

  function openNew() {
    setActive(null)
    setPrefill(undefined)
    setOpen(true)
  }
  function openGoal(g: Goal, prefillAmount?: number) {
    setActive(g)
    setPrefill(prefillAmount)
    setOpen(true)
  }

  return (
    <>
      {/* Bannière d'allocation du surplus */}
      {surplus >= 20 && eligible.length > 0 && (
        <button
          className="surplus-banner rise"
          onClick={() => { haptic('tap'); setAllocOpen(true) }}
        >
          <span className="surplus-banner-icon"><Sparkles size={18} /></span>
          <div className="surplus-banner-main">
            <span className="surplus-banner-title">≈ {formatMoneyCompact(surplus)} de surplus prévu</span>
            <span className="surplus-banner-sub">Mets-le de côté pour un objectif</span>
          </div>
          <ChevronRight size={18} className="surplus-banner-chevron" />
        </button>
      )}

      <div className="row-head rise">
        <h2 className="block-title">Mes objectifs</h2>
        <Button size="sm" variant="ghost" onClick={openNew}><Plus size={16} /> Ajouter</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="Aucun objectif" hint="Définis un projet d’épargne et suis sa progression." />
      ) : (
        <div className="goal-list">
          {goals.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              pace={estimateMonthlyPace(byGoal.get(g.id) ?? [])}
              index={i}
              onClick={() => openGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Sheet d'allocation : choisir l'objectif qui reçoit le surplus */}
      <Sheet open={allocOpen} onClose={() => setAllocOpen(false)} title="Répartir le surplus">
        <p className="alloc-intro">
          Tu as <strong>≈ {formatMoneyCompact(surplus)}</strong> de surplus projeté ce mois-ci.
          Choisis l’objectif à alimenter — le montant sera pré-rempli, à toi d’ajuster.
        </p>
        <div className="alloc-list">
          {eligible.map((g) => {
            const ratio = g.targetAmount > 0 ? Math.min(g.currentAmount / g.targetAmount, 1) : 0
            return (
              <button
                key={g.id}
                className="alloc-row card card-pad"
                onClick={() => { setAllocOpen(false); openGoal(g, surplus) }}
              >
                <span className="goal-emoji" style={{ background: `${g.color}22`, color: g.color }}>
                  <Target size={18} />
                </span>
                <div className="alloc-row-main">
                  <span className="alloc-row-name">{g.name}</span>
                  <span className="alloc-row-sub num">{formatPercent(ratio)} · reste {formatMoneyCompact(g.targetAmount - g.currentAmount)}</span>
                </div>
                <ChevronRight size={16} />
              </button>
            )
          })}
        </div>
      </Sheet>

      <GoalSheet open={open} onClose={() => setOpen(false)} goal={active} prefillContribution={prefill} />
    </>
  )
}

function GoalCard({ goal, pace, index, onClick }: { goal: Goal; pace: number; index: number; onClick: () => void }) {
  const p = goalProjection(goal, pace)
  return (
    <button className="card card-pad goal-card rise" style={{ animationDelay: `${index * 60}ms` }} onClick={onClick}>
      <div className="goal-card-head">
        <div className="goal-emoji" style={{ background: `${goal.color}22`, color: goal.color }}>
          {p.reached ? <CheckCircle2 size={20} /> : <Target size={20} />}
        </div>
        <div className="goal-card-titles">
          <span className="goal-card-name">{goal.name}</span>
          <span className="goal-card-sub">
            {p.reached
              ? 'Objectif atteint 🎉'
              : p.etaIso
                ? `À ce rythme : ${formatMonth(p.etaIso)}`
                : 'Définis un rythme d’épargne'}
          </span>
        </div>
        <span className="goal-card-pct num" style={{ color: goal.color }}>{formatPercent(p.ratio)}</span>
      </div>
      <ProgressBar ratio={p.ratio} color={goal.color} />
      <div className="goal-card-foot num">
        <span>{formatMoney(goal.currentAmount)}</span>
        <span className="goal-card-target">/ {formatMoneyCompact(goal.targetAmount)}</span>
        {goal.targetDate && p.onTrack != null && !p.reached && (
          <span className={`goal-card-track ${p.onTrack ? 'ok' : 'late'}`}>
            {p.onTrack ? 'dans les temps' : 'à accélérer'}
          </span>
        )}
      </div>
    </button>
  )
}
