import { useMemo, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useUpsertBudget } from '@/data/hooks'
import type { BudgetSuggestion } from '@/data/selectors'
import { formatMoneyCompact } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import type { Category } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  suggestions: BudgetSuggestion[]
  categories: Category[]
}

/**
 * Propose des enveloppes calculées sur les dépenses réelles (médiane des derniers
 * mois). Chaque ligne est cochable (toutes sélectionnées par défaut) : on budgète
 * uniquement la sélection.
 */
export function AutoBudgetSheet({ open, onClose, suggestions, categories }: Props) {
  const upsert = useUpsertBudget()
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  // À l'ouverture, tout est présélectionné (sans useEffect — sync au rendu).
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setSelected(new Set(suggestions.map((s) => s.categoryId)))
  }
  if (!open && wasOpen) setWasOpen(false)

  function toggle(categoryId: string) {
    haptic('selection')
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function confirm() {
    const chosen = suggestions.filter((s) => selected.has(s.categoryId))
    if (chosen.length === 0) return
    haptic('success')
    for (const s of chosen) upsert.mutate({ categoryId: s.categoryId, amount: s.suggested })
    onClose()
  }

  const count = selected.size

  return (
    <Sheet open={open} onClose={onClose} title="Budgets suggérés">
      {suggestions.length === 0 ? (
        <div className="autobudget-done">
          <span className="autobudget-done-icon"><Check size={22} /></span>
          <p>Tout est budgété — rien à suggérer pour l’instant.</p>
        </div>
      ) : (
        <>
          <p className="autobudget-intro">
            Calculé sur tes dépenses des derniers mois (médiane, arrondie). Décoche
            ce que tu ne veux pas, puis valide. Ajustable ensuite à tout moment.
          </p>

          <div className="autobudget-list">
            {suggestions.map((s) => {
              const cat = catMap.get(s.categoryId)
              if (!cat) return null
              const on = selected.has(s.categoryId)
              return (
                <button
                  key={s.categoryId}
                  className={`autobudget-row card card-pad ${on ? 'is-selected' : ''}`}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(s.categoryId)}
                >
                  <span className={`autobudget-check ${on ? 'on' : ''}`}>{on && <Check size={13} />}</span>
                  <CategoryIcon icon={cat.icon} color={cat.color} size={40} />
                  <div className="autobudget-row-main">
                    <span className="autobudget-row-name">{cat.name}</span>
                    <span className="autobudget-row-sub">
                      {s.current != null
                        ? `actuel ${formatMoneyCompact(s.current)} · ~${formatMoneyCompact(s.typical)}/mois`
                        : `tu dépenses ~${formatMoneyCompact(s.typical)}/mois`}
                    </span>
                  </div>
                  <span className="autobudget-amount num">{formatMoneyCompact(s.suggested)}</span>
                </button>
              )
            })}
          </div>

          <Button block onClick={confirm} disabled={count === 0} style={{ marginTop: 'var(--sp-4)' }}>
            <Sparkles size={16} /> {count === 0 ? 'Sélectionne au moins une enveloppe' : `Budgéter la sélection (${count})`}
          </Button>
        </>
      )}
    </Sheet>
  )
}
