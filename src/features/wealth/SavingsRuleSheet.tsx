import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { useCategories, useDeleteSavingsRule, useGoals, useSaveSavingsRule } from '@/data/hooks'
import { SAVINGS_RULE_META } from './wealthMeta'
import type { SavingsRule, SavingsRuleType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  /** Règle à éditer ; null pour une création. */
  rule: SavingsRule | null
  /** Type imposé à la création (depuis un modèle). */
  presetType?: SavingsRuleType
}

const ROUND_OPTIONS = [1, 2, 5]
const MULT_OPTIONS = [1, 2, 3, 5]

export function SavingsRuleSheet({ open, onClose, rule, presetType }: Props) {
  const save = useSaveSavingsRule()
  const remove = useDeleteSavingsRule()
  const { data: categories = [] } = useCategories()
  const { data: goals = [] } = useGoals()
  const expenseCategories = categories.filter((c) => c.id !== 'cat-salaire')

  const type: SavingsRuleType = rule?.type ?? presetType ?? 'roundup'
  const meta = SAVINGS_RULE_META[type]

  const [roundTo, setRoundTo] = useState(rule?.roundTo ?? 1)
  const [multiplier, setMultiplier] = useState(rule?.multiplier ?? 1)
  const [percent, setPercent] = useState(rule ? String(rule.percent ?? '') : '5')
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '')
  const [amount, setAmount] = useState(rule ? String(rule.amount ?? '') : '3')
  const [targetGoalId, setTargetGoalId] = useState(rule?.targetGoalId ?? '')

  // Re-sync local state when a different rule (or preset) is opened.
  const [trackedId, setTrackedId] = useState<string | null>(rule?.id ?? presetType ?? null)
  const currentKey = rule?.id ?? presetType ?? null
  if (open && currentKey !== trackedId) {
    setTrackedId(currentKey)
    setRoundTo(rule?.roundTo ?? 1)
    setMultiplier(rule?.multiplier ?? 1)
    setPercent(rule ? String(rule.percent ?? '') : '5')
    setCategoryId(rule?.categoryId ?? '')
    setAmount(rule ? String(rule.amount ?? '') : '3')
    setTargetGoalId(rule?.targetGoalId ?? '')
  }

  function onSave() {
    if (type === 'income_pct' && !Number(percent)) return
    if (type === 'category_trigger' && (!categoryId || !Number(amount))) return
    save.mutate({
      id: rule?.id,
      type,
      enabled: rule?.enabled ?? true,
      roundTo: type === 'roundup' ? roundTo : null,
      multiplier: type === 'roundup' ? multiplier : null,
      percent: type === 'income_pct' ? Number(percent) : null,
      categoryId: type === 'category_trigger' ? categoryId : null,
      amount: type === 'category_trigger' ? Number(amount) : null,
      targetGoalId: targetGoalId || null,
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={meta.label}>
      <p className="rule-sheet-desc">{meta.desc}</p>

      {type === 'roundup' && (
        <>
          <div className="field">
            <label htmlFor="r-round">Arrondir à</label>
            <select id="r-round" className="input" value={roundTo} onChange={(e) => setRoundTo(Number(e.target.value))}>
              {ROUND_OPTIONS.map((v) => (
                <option key={v} value={v}>{v} € supérieur</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="r-mult">Multiplicateur</label>
            <select id="r-mult" className="input" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))}>
              {MULT_OPTIONS.map((v) => (
                <option key={v} value={v}>×{v}{v === 1 ? ' (arrondi simple)' : ''}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {type === 'income_pct' && (
        <div className="field">
          <label htmlFor="r-pct">Pourcentage des revenus</label>
          <input id="r-pct" type="number" inputMode="decimal" className="input" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="5" />
          <span className="field-hint">Appliqué à chaque rentrée d’argent du mois.</span>
        </div>
      )}

      {type === 'surplus_sweep' && (
        <p className="field-hint" style={{ marginBottom: 'var(--sp-4)' }}>
          Le surplus projeté en fin de mois (revenus − charges − dépenses estimées) est mis de côté automatiquement.
        </p>
      )}

      {type === 'category_trigger' && (
        <>
          <div className="field">
            <label htmlFor="r-cat">Catégorie déclencheuse</label>
            <select id="r-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Choisir une catégorie</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="r-amt">Montant de côté par opération (€)</label>
            <input id="r-amt" type="number" inputMode="decimal" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="3" />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="r-goal">Alimente l’objectif (optionnel)</label>
        <select id="r-goal" className="input" value={targetGoalId} onChange={(e) => setTargetGoalId(e.target.value)}>
          <option value="">Réserve générique</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <Button block onClick={onSave}>Enregistrer</Button>

      {rule && (
        <Button variant="quiet" block style={{ marginTop: 8, color: 'var(--negative)' }} onClick={() => { remove.mutate(rule.id); onClose() }}>
          <Trash2 size={16} /> Supprimer la règle
        </Button>
      )}
    </Sheet>
  )
}
