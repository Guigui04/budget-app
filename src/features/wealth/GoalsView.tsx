import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { useGoals } from '@/data/hooks'
import { goalProgress } from '@/data/selectors'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { GoalSheet } from '@/features/goals/GoalSheet'
import { formatMoney, formatMoneyCompact, formatPercent, daysUntil } from '@/lib/format'
import type { Goal } from '@/types'

/**
 * Vue « Objectifs » du hub Patrimoine. Reprend le suivi d'objectifs d'épargne
 * existant ; la refonte (courbe de projection, jalons, foyer partagé) arrive en
 * itération 2.
 */
export function GoalsView() {
  const { data: goals = [] } = useGoals()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Goal | null>(null)

  function openNew() {
    setActive(null)
    setOpen(true)
  }
  function openGoal(g: Goal) {
    setActive(g)
    setOpen(true)
  }

  return (
    <>
      <div className="row-head rise">
        <h2 className="block-title">Mes objectifs</h2>
        <Button size="sm" variant="ghost" onClick={openNew}><Plus size={16} /> Ajouter</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="Aucun objectif" hint="Définis un projet d’épargne et suis sa progression." />
      ) : (
        <div className="goal-list">
          {goals.map((g, i) => {
            const p = goalProgress(g)
            const days = g.targetDate ? daysUntil(g.targetDate) : null
            return (
              <button key={g.id} className="card card-pad goal-card rise" style={{ animationDelay: `${i * 60}ms` }} onClick={() => openGoal(g)}>
                <div className="goal-card-head">
                  <div className="goal-emoji" style={{ background: `${g.color}22`, color: g.color }}>
                    <Target size={20} />
                  </div>
                  <div className="goal-card-titles">
                    <span className="goal-card-name">{g.name}</span>
                    {days != null && <span className="goal-card-sub">{days > 0 ? `dans ${days} j` : 'échéance passée'}</span>}
                  </div>
                  <span className="goal-card-pct num" style={{ color: g.color }}>{formatPercent(p.ratio)}</span>
                </div>
                <ProgressBar ratio={p.ratio} color={g.color} />
                <div className="goal-card-foot num">
                  <span>{formatMoney(g.currentAmount)}</span>
                  <span className="goal-card-target">/ {formatMoneyCompact(g.targetAmount)}</span>
                </div>
                {p.monthlyNeeded != null && (
                  <p className="goal-card-needed">{formatMoney(p.monthlyNeeded)}/mois pour tenir l’échéance</p>
                )}
              </button>
            )
          })}
        </div>
      )}

      <GoalSheet open={open} onClose={() => setOpen(false)} goal={active} />
    </>
  )
}
