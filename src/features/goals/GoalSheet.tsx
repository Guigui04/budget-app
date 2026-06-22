import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAccounts, useAddGoalContribution, useDeleteGoal, useSaveGoal } from '@/data/hooks'
import { goalProgress } from '@/data/selectors'
import { formatMoney, formatPercent } from '@/lib/format'
import type { Goal } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  goal: Goal | null
}

const palette = ['#46c79a', '#f0784a', '#e8b24c', '#6fa8dc', '#b58df1']

export function GoalSheet({ open, onClose, goal }: Props) {
  const save = useSaveGoal()
  const contribute = useAddGoalContribution()
  const remove = useDeleteGoal()
  const { data: accounts = [] } = useAccounts()
  const savingsAccounts = accounts.filter((a) => a.kind === 'savings')

  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : '')
  const [date, setDate] = useState(goal?.targetDate ?? '')
  const [color, setColor] = useState(goal?.color ?? palette[0])
  const [linkedAccountId, setLinkedAccountId] = useState(goal?.linkedAccountId ?? '')
  const [contribution, setContribution] = useState('')

  // Re-sync local state when a different goal is opened.
  const [trackedId, setTrackedId] = useState<string | null>(goal?.id ?? null)
  if (open && (goal?.id ?? null) !== trackedId) {
    setTrackedId(goal?.id ?? null)
    setName(goal?.name ?? '')
    setTarget(goal ? String(goal.targetAmount) : '')
    setDate(goal?.targetDate ?? '')
    setColor(goal?.color ?? palette[0])
    setLinkedAccountId(goal?.linkedAccountId ?? '')
    setContribution('')
  }

  const progress = goal ? goalProgress(goal) : null
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

  return (
    <Sheet open={open} onClose={onClose} title={goal ? goal.name : 'Nouvel objectif'}>
      {goal && progress && (
        <div className="goal-detail">
          <div className="goal-detail-row">
            <span className="num goal-detail-current">{formatMoney(goal.currentAmount)}</span>
            <span className="goal-detail-target num">sur {formatMoney(goal.targetAmount)}</span>
          </div>
          <ProgressBar ratio={progress.ratio} color={goal.color} />
          <div className="goal-detail-meta">
            <span>{formatPercent(progress.ratio)}</span>
            {progress.monthlyNeeded != null && <span>{formatMoney(progress.monthlyNeeded)}/mois pour y arriver</span>}
          </div>
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
            <Button
              disabled={Boolean(goal.linkedAccountId)}
              onClick={() => {
                const amt = Number(contribution)
                if (!amt) return
                contribute.mutate({ goalId: goal.id, amount: amt, currentAmount: goal.currentAmount })
                setContribution('')
              }}
            >
              Verser
            </Button>
          </div>
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
              {account.name} · {formatMoney(account.balance)}
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
