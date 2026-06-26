import { useMemo, useState } from 'react'
import { Trash2, CheckCircle2, Clock, TrendingUp, History } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Confetti } from '@/components/ui/Confetti'
import { GoalProjectionChart } from '@/components/charts/GoalProjectionChart'
import {
  useAccounts,
  useAddGoalContribution,
  useDeleteGoal,
  useGoalContributions,
  useGoals,
  useSaveGoal,
} from '@/data/hooks'
import { estimateMonthlyPace, goalProjection } from '@/data/selectors'
import { formatMoney, formatMoneyCompact, formatMonth, formatDateShort } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { Goal } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  goal: Goal | null
  /** Montant pré-rempli dans le champ de versement (ex. allocation du surplus). */
  prefillContribution?: number
}

const palette = ['#46c79a', '#f0784a', '#e8b24c', '#6fa8dc', '#b58df1']

/** Combien de jalons (25/50/75/100 %) sont franchis à ce montant. */
function milestonesReached(amount: number, target: number): number {
  if (target <= 0) return 0
  return [0.25, 0.5, 0.75, 1].filter((r) => amount >= target * r).length
}

export function GoalSheet({ open, onClose, goal: goalProp, prefillContribution }: Props) {
  const save = useSaveGoal()
  const contribute = useAddGoalContribution()
  const remove = useDeleteGoal()
  const { data: accounts = [] } = useAccounts()
  const { data: goals = [] } = useGoals()
  const { data: allContributions = [] } = useGoalContributions()
  const savingsAccounts = accounts.filter((a) => a.kind === 'savings')

  // On lit l'objectif « vivant » depuis le cache : le prop est un instantané figé
  // à l'ouverture, donc un versement ne s'y refléterait pas (montant, jalons,
  // projection). Le fallback sur le prop couvre le cas « après suppression ».
  const goal = useMemo(
    () => (goalProp ? goals.find((g) => g.id === goalProp.id) ?? goalProp : null),
    [goals, goalProp],
  )

  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : '')
  const [date, setDate] = useState(goal?.targetDate ?? '')
  const [color, setColor] = useState(goal?.color ?? palette[0])
  const [linkedAccountId, setLinkedAccountId] = useState(goal?.linkedAccountId ?? '')
  const [contribution, setContribution] = useState('')
  const [celebrate, setCelebrate] = useState(false)

  // Re-sync local state when a different goal is opened, OU lorsqu'un nouveau
  // montant pré-rempli arrive (allocation du surplus sur un objectif déjà ouvert
  // précédemment — l'id seul ne suffirait pas à détecter le changement).
  const [trackedId, setTrackedId] = useState<string | null>(goal?.id ?? null)
  const [trackedPrefill, setTrackedPrefill] = useState<number | undefined>(prefillContribution)
  if (open && ((goal?.id ?? null) !== trackedId || prefillContribution !== trackedPrefill)) {
    setTrackedId(goal?.id ?? null)
    setTrackedPrefill(prefillContribution)
    setName(goal?.name ?? '')
    setTarget(goal ? String(goal.targetAmount) : '')
    setDate(goal?.targetDate ?? '')
    setColor(goal?.color ?? palette[0])
    setLinkedAccountId(goal?.linkedAccountId ?? '')
    setContribution(prefillContribution ? String(Math.round(prefillContribution)) : '')
  }

  const contributions = useMemo(
    () => (goal ? allContributions.filter((c) => c.goalId === goal.id) : []),
    [allContributions, goal],
  )
  const projection = useMemo(() => {
    if (!goal) return null
    const pace = estimateMonthlyPace(contributions)
    return goalProjection(goal, pace)
  }, [goal, contributions])

  const linkedAccount = savingsAccounts.find((a) => a.id === linkedAccountId)

  function onSave() {
    const targetAmount = Number(target)
    if (!name.trim() || !targetAmount) return
    save.mutate({
      id: goal?.id,
      name: name.trim(),
      targetAmount,
      currentAmount: linkedAccount?.balance ?? goal?.currentAmount ?? 0,
      targetDate: date || null,
      linkedAccountId: linkedAccountId || null,
      color,
    })
    onClose()
  }

  function onContribute() {
    if (!goal) return
    const amt = Number(contribution)
    if (!amt) return
    const before = milestonesReached(goal.currentAmount, goal.targetAmount)
    const after = milestonesReached(goal.currentAmount + amt, goal.targetAmount)
    contribute.mutate({ goalId: goal.id, amount: amt, currentAmount: goal.currentAmount })
    setContribution('')
    if (after > before) {
      haptic('success')
      setCelebrate(true)
    } else {
      haptic('tap')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={goal ? goal.name : 'Nouvel objectif'}>
      <Confetti active={celebrate} onDone={() => setCelebrate(false)} />

      {goal && projection && (
        <div className="goal-detail">
          <div className="goal-detail-row">
            <span className="num goal-detail-current">{formatMoney(goal.currentAmount)}</span>
            <span className="goal-detail-target num">sur {formatMoney(goal.targetAmount)}</span>
          </div>
          <ProgressBar ratio={projection.ratio} color={goal.color} />

          {/* Jalons 25/50/75/100 % */}
          <div className="goal-milestones">
            {projection.milestones.map((m) => (
              <div key={m.ratio} className={`goal-milestone ${m.reached ? 'reached' : ''}`}>
                <span className="goal-milestone-dot" style={m.reached ? { background: goal.color, borderColor: goal.color } : undefined}>
                  {m.reached && <CheckCircle2 size={12} />}
                </span>
                <span className="goal-milestone-label">{Math.round(m.ratio * 100)} %</span>
              </div>
            ))}
          </div>

          {/* Projection */}
          {projection.reached ? (
            <div className="goal-eta reached">
              <CheckCircle2 size={16} /> Objectif atteint 🎉
            </div>
          ) : (
            <>
              {projection.points.length >= 2 && (
                <GoalProjectionChart points={projection.points} target={goal.targetAmount} color={goal.color} />
              )}
              <div className="goal-eta-grid">
                <div className="goal-eta-item">
                  <span className="goal-eta-icon"><Clock size={14} /></span>
                  <div>
                    <span className="goal-eta-label">À ce rythme</span>
                    <span className="goal-eta-val">
                      {projection.etaIso ? formatMonth(projection.etaIso) : 'définis un rythme'}
                    </span>
                  </div>
                </div>
                <div className="goal-eta-item">
                  <span className="goal-eta-icon"><TrendingUp size={14} /></span>
                  <div>
                    <span className="goal-eta-label">
                      {projection.paceSource === 'needed' ? 'À épargner / mois' : 'Rythme estimé'}
                    </span>
                    <span className="goal-eta-val num">
                      {projection.monthlyPace > 0 ? `${formatMoneyCompact(projection.monthlyPace)}/mois` : '—'}
                    </span>
                  </div>
                </div>
              </div>
              {goal.targetDate && projection.onTrack != null && (
                <p className={`goal-track ${projection.onTrack ? 'ok' : 'late'}`}>
                  {projection.onTrack
                    ? `Dans les temps pour le ${formatDateShort(goal.targetDate)}`
                    : projection.monthlyNeeded != null
                      ? `Pour tenir le ${formatDateShort(goal.targetDate)} : ${formatMoneyCompact(projection.monthlyNeeded)}/mois`
                      : `En retard sur le ${formatDateShort(goal.targetDate)}`}
                </p>
              )}
            </>
          )}

          {goal.linkedAccountId && (
            <p className="goal-linked-note">Montant synchronisé avec le compte épargne lié.</p>
          )}

          <div className="contribution-box">
            <input
              type="number"
              inputMode="decimal"
              className="input"
              placeholder="Ajouter un montant"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              disabled={Boolean(goal.linkedAccountId)}
            />
            <Button disabled={Boolean(goal.linkedAccountId)} onClick={onContribute}>
              Verser
            </Button>
          </div>

          {/* Chronologie des versements (foyer partagé) */}
          {contributions.length > 0 && (
            <div className="goal-history">
              <span className="section-label goal-history-head"><History size={13} /> Derniers versements</span>
              {contributions
                .slice()
                .sort((a, b) => b.contributedAt.localeCompare(a.contributedAt))
                .slice(0, 6)
                .map((c) => (
                  <div key={c.id} className="goal-history-row">
                    <span className="goal-history-author">{c.authorName ?? 'Versement'}</span>
                    <span className="goal-history-date">{formatDateShort(c.contributedAt)}</span>
                    <span className="goal-history-amt num">+{formatMoneyCompact(c.amount)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="g-name">Nom</label>
        <input id="g-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacances, voiture…" />
      </div>
      <div className="field">
        <label htmlFor="g-target">Montant cible (€)</label>
        <input id="g-target" type="number" inputMode="decimal" className="input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />
      </div>
      <div className="field">
        <label htmlFor="g-date">Date cible (optionnel)</label>
        <input id="g-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="g-account">Compte épargne lié</label>
        <select
          id="g-account"
          className="input"
          value={linkedAccountId}
          onChange={(e) => setLinkedAccountId(e.target.value)}
        >
          <option value="">Aucun compte lié</option>
          {savingsAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {formatMoney(account.balance, account.currency)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Couleur</label>
        <div className="color-row">
          {palette.map((c) => (
            <button key={c} className={`color-dot ${c === color ? 'selected' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Couleur ${c}`} />
          ))}
        </div>
      </div>

      <Button block onClick={onSave}>Enregistrer</Button>

      {goal && (
        <Button variant="quiet" block style={{ marginTop: 8, color: 'var(--negative)' }} onClick={() => { remove.mutate(goal.id); onClose() }}>
          <Trash2 size={16} /> Supprimer l’objectif
        </Button>
      )}
    </Sheet>
  )
}
