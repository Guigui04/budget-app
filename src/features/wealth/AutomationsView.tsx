import { useMemo, useState } from 'react'
import { Zap, Plus, ArrowRight } from 'lucide-react'
import {
  useAccounts,
  useCategories,
  useGoals,
  useSavingsRules,
  useToggleSavingsRule,
  useTransactions,
} from '@/data/hooks'
import { computeSavingsPlan, type SavingsRuleResult } from '@/data/selectors'
import { SavingsRuleSheet } from './SavingsRuleSheet'
import { SAVINGS_RULE_META, SAVINGS_RULE_ORDER } from './wealthMeta'
import { formatMoney, formatMoneyCompact } from '@/lib/format'
import { useCountUp } from '@/lib/useCountUp'
import { haptic } from '@/lib/haptics'
import type { Category, SavingsRule, SavingsRuleType } from '@/types'

/** Phrase explicative d'une règle à partir de son résultat calculé. */
function detailFor(r: SavingsRuleResult, catMap: Map<string, Category>): string {
  const { rule, count, basis } = r
  switch (rule.type) {
    case 'roundup':
      return count > 0
        ? `${count} achat${count > 1 ? 's' : ''} arrondi${count > 1 ? 's' : ''} ce mois-ci${(rule.multiplier ?? 1) > 1 ? ` · ×${rule.multiplier}` : ''}`
        : 'aucun achat arrondi ce mois-ci'
    case 'income_pct':
      return `${rule.percent ?? 0} % de ${formatMoneyCompact(basis)} de revenus`
    case 'surplus_sweep':
      return basis > 0 ? 'surplus projeté de fin de mois' : 'pas de surplus prévu ce mois-ci'
    case 'category_trigger': {
      const name = rule.categoryId ? catMap.get(rule.categoryId)?.name ?? 'catégorie' : 'catégorie'
      return `${count} opération${count > 1 ? 's' : ''} ${name} · ${formatMoneyCompact(rule.amount ?? 0)}/op.`
    }
  }
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => { haptic('selection'); onChange(!on) }}
    >
      <span className="switch-knob" />
    </button>
  )
}

export function AutomationsView() {
  const { data: rules = [] } = useSavingsRules()
  const { data: transactions = [] } = useTransactions()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: goals = [] } = useGoals()
  const toggle = useToggleSavingsRule()

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<SavingsRule | null>(null)
  const [preset, setPreset] = useState<SavingsRuleType | undefined>(undefined)

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const goalMap = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals])
  const plan = useMemo(
    () => computeSavingsPlan(rules, transactions, accounts),
    [rules, transactions, accounts],
  )
  const total = useCountUp(plan.totalThisMonth)

  function openRule(rule: SavingsRule) {
    setActive(rule)
    setPreset(undefined)
    setOpen(true)
  }
  function openTemplate(type: SavingsRuleType) {
    setActive(null)
    setPreset(type)
    setOpen(true)
  }

  return (
    <>
      {/* Héro : total mis de côté ce mois-ci */}
      <div className="save-hero rise">
        <span className="save-hero-icon"><Zap size={20} /></span>
        <span className="save-hero-label">Mis de côté ce mois-ci</span>
        <span className="save-hero-value num">{formatMoney(total)}</span>
        <span className="save-hero-sub">estimation — l’app comptabilise, elle ne transfère pas</span>
      </div>

      {/* Règles actives */}
      {plan.results.length > 0 && (
        <section className="rise" style={{ animationDelay: '60ms' }}>
          <div className="row-head"><h2 className="block-title">Mes règles</h2></div>
          <div className="rule-list">
            {plan.results.map((r) => {
              const meta = SAVINGS_RULE_META[r.rule.type]
              const Icon = meta.icon
              const goal = r.rule.targetGoalId ? goalMap.get(r.rule.targetGoalId) : undefined
              return (
                <div key={r.rule.id} className={`card card-pad rule-card ${r.rule.enabled ? '' : 'is-off'}`}>
                  <button className="rule-card-main" onClick={() => openRule(r.rule)}>
                    <span className="rule-icon" style={{ background: `${meta.color}22`, color: meta.color }}>
                      <Icon size={18} />
                    </span>
                    <div className="rule-texts">
                      <span className="rule-name">{meta.label}</span>
                      <span className="rule-detail">{detailFor(r, catMap)}</span>
                      {goal && <span className="rule-goal"><ArrowRight size={11} /> {goal.name}</span>}
                    </div>
                    <span className="rule-amount num">{formatMoneyCompact(r.amountThisMonth)}</span>
                  </button>
                  <Toggle
                    on={r.rule.enabled}
                    label={`Activer ${meta.label}`}
                    onChange={(v) => toggle.mutate({ id: r.rule.id, enabled: v })}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Modèles à ajouter */}
      <section className="rise" style={{ animationDelay: '120ms' }}>
        <div className="row-head"><h2 className="block-title">Ajouter une automatisation</h2></div>
        <div className="rule-templates">
          {SAVINGS_RULE_ORDER.map((type) => {
            const meta = SAVINGS_RULE_META[type]
            const Icon = meta.icon
            return (
              <button key={type} className="card card-pad rule-template" onClick={() => { haptic('tap'); openTemplate(type) }}>
                <span className="rule-icon" style={{ background: `${meta.color}22`, color: meta.color }}>
                  <Icon size={18} />
                </span>
                <div className="rule-texts">
                  <span className="rule-name">{meta.label}</span>
                  <span className="rule-detail">{meta.desc}</span>
                </div>
                <span className="rule-add"><Plus size={16} /></span>
              </button>
            )
          })}
        </div>
      </section>

      <SavingsRuleSheet open={open} onClose={() => setOpen(false)} rule={active} presetType={preset} />
    </>
  )
}
