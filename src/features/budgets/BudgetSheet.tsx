import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useDeleteBudget, useUpsertBudget } from '@/data/hooks'
import type { BudgetEnvelope, Category } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  editing: BudgetEnvelope | null
  /** Categories that don't yet have a budget — selectable when creating. */
  available: Category[]
}

export function BudgetSheet({ open, onClose, editing, available }: Props) {
  const upsert = useUpsertBudget()
  const remove = useDeleteBudget()
  const [categoryId, setCategoryId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')

  const activeCat = editing?.category ?? available.find((c) => c.id === categoryId)
  const amountValue = editing ? (amount === '' ? String(editing.budget.amount) : amount) : amount

  function save() {
    const cat = editing?.category.id ?? categoryId
    const value = Number(amountValue)
    if (!cat || !value || value <= 0) return
    upsert.mutate({ categoryId: cat, amount: value })
    reset()
  }

  function reset() {
    setCategoryId('')
    setAmount('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={reset} title={editing ? 'Modifier l’enveloppe' : 'Nouvelle enveloppe'}>
      {!editing && (
        <>
          <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>Catégorie</span>
          <div className="cat-grid" style={{ marginBottom: 16 }}>
            {available.map((c) => (
              <button
                key={c.id}
                className={`cat-pick ${c.id === categoryId ? 'selected' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                <CategoryIcon icon={c.icon} color={c.color} size={34} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {editing && (
        <div className="detail-head" style={{ marginBottom: 8 }}>
          <CategoryIcon icon={activeCat!.icon} color={activeCat!.color} size={48} />
          <div className="detail-label">{activeCat!.name}</div>
        </div>
      )}

      <div className="field">
        <label htmlFor="amount">Montant mensuel (€)</label>
        <input
          id="amount"
          type="number"
          inputMode="decimal"
          className="input"
          placeholder="0"
          value={amountValue}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <Button block onClick={save} disabled={!activeCat}>Enregistrer</Button>

      {editing && (
        <Button
          variant="quiet"
          block
          style={{ marginTop: 8, color: 'var(--negative)' }}
          onClick={() => {
            remove.mutate(editing.budget.id)
            reset()
          }}
        >
          <Trash2 size={16} /> Supprimer l’enveloppe
        </Button>
      )}
    </Sheet>
  )
}
