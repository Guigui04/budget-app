import { useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight,
  AlertTriangle, ChevronRight, Wallet, X, RotateCcw,
} from 'lucide-react'
import type { Account, Category, Transaction } from '@/types'
import { monthForecast } from '@/data/selectors'
import { ForecastChart } from '@/components/charts/ForecastChart'
import { Sheet } from '@/components/ui/Sheet'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { formatMoney, formatMoneyCompact, formatDateShort } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useForecastPrefs } from '@/store/forecast'

interface ForecastCardProps {
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
}

export function ForecastCard({ accounts, transactions, categories }: ForecastCardProps) {
  const [open, setOpen] = useState(false)
  const excludedChargeKeys = useForecastPrefs((s) => s.excludedChargeKeys)
  const toggleCharge = useForecastPrefs((s) => s.toggleCharge)
  const f = useMemo(
    () => monthForecast(accounts, transactions, new Date(), new Set(excludedChargeKeys)),
    [accounts, transactions, excludedChargeKeys],
  )
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  // Pas assez de données pour une projection crédible.
  if (accounts.length === 0 || f.points.length < 2) return null

  const positive = f.delta >= 0
  const atRisk = f.lowestPoint.balance < 0
  const catName = (id: string | null) => (id && catMap.get(id)?.name) || 'Revenu'

  return (
    <section className="rise" style={{ animationDelay: '130ms' }}>
      <div className="row-head">
        <h2 className="block-title">Fin de mois</h2>
        <span className="section-label">projection</span>
      </div>

      <button
        className="card card-pad forecast"
        onClick={() => { haptic('tap'); setOpen(true) }}
      >
        <div className="forecast-head">
          <div>
            <span className="section-label">Solde projeté</span>
            <div className="forecast-value num">{formatMoney(f.endBalance)}</div>
          </div>
          <span className={`forecast-delta ${positive ? 'pos' : 'neg'}`}>
            {positive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {positive ? '+' : ''}{formatMoneyCompact(f.delta)}
          </span>
        </div>

        <ForecastChart points={f.points} atRisk={atRisk} />

        {atRisk && (
          <div className="forecast-risk">
            <AlertTriangle size={16} />
            <span>
              Risque de découvert le {formatDateShort(f.lowestPoint.dateIso)} ({formatMoneyCompact(f.lowestPoint.balance)})
            </span>
          </div>
        )}

        <div className="forecast-chips">
          <div className="forecast-chip">
            <span className="forecast-chip-icon pos"><ArrowUpRight size={14} /></span>
            <span className="forecast-chip-label">Revenus à venir</span>
            <span className="forecast-chip-val num">+{formatMoneyCompact(f.upcomingIncome)}</span>
          </div>
          <div className="forecast-chip">
            <span className="forecast-chip-icon neg"><ArrowDownRight size={14} /></span>
            <span className="forecast-chip-label">Charges fixes</span>
            <span className="forecast-chip-val num">−{formatMoneyCompact(f.upcomingFixed)}</span>
          </div>
          <div className="forecast-chip">
            <span className="forecast-chip-icon neg"><ArrowDownRight size={14} /></span>
            <span className="forecast-chip-label">Dépenses estimées</span>
            <span className="forecast-chip-val num">−{formatMoneyCompact(f.variableProjected)}</span>
          </div>
        </div>

        <span className="forecast-more">Voir le détail <ChevronRight size={16} /></span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Détail de la prévision">
        <div className="forecast-sheet-head">
          <span className="section-label">Solde projeté en fin de mois</span>
          <div className="forecast-sheet-value num">{formatMoney(f.endBalance)}</div>
          <span className={`forecast-delta ${positive ? 'pos' : 'neg'}`}>
            {positive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {positive ? '+' : ''}{formatMoneyCompact(f.delta)} ce mois-ci
          </span>
        </div>

        {/* Revenus à venir */}
        {f.incomeItems.length > 0 && (
          <div className="forecast-section">
            <div className="forecast-section-head">
              <span className="section-label">Revenus à venir</span>
              <span className="num pos">+{formatMoneyCompact(f.upcomingIncome)}</span>
            </div>
            {f.incomeItems.map((it, i) => {
              const cat = it.categoryId ? catMap.get(it.categoryId) : undefined
              return (
                <div key={`in-${i}`} className="forecast-line">
                  <CategoryIcon icon={cat?.icon ?? 'briefcase'} color={cat?.color ?? '#18ac6b'} size={34} />
                  <div className="forecast-line-main">
                    <span className="forecast-line-title">{it.label || catName(it.categoryId)}</span>
                    <span className="forecast-line-meta">le {formatDateShort(it.dateIso)}</span>
                  </div>
                  <span className="forecast-line-amt num pos">+{formatMoneyCompact(it.amount)}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Charges fixes à venir */}
        {f.fixedItems.length > 0 && (
          <div className="forecast-section">
            <div className="forecast-section-head">
              <span className="section-label">Charges fixes à venir</span>
              <span className="num neg">−{formatMoneyCompact(f.upcomingFixed)}</span>
            </div>
            {f.fixedItems.map((it, i) => {
              const cat = it.categoryId ? catMap.get(it.categoryId) : undefined
              return (
                <div key={`fx-${i}`} className={`forecast-line ${it.excluded ? 'is-excluded' : ''}`}>
                  <CategoryIcon icon={cat?.icon ?? 'repeat'} color={cat?.color ?? '#7c5cff'} size={34} />
                  <div className="forecast-line-main">
                    <span className="forecast-line-title">{it.label}</span>
                    <span className="forecast-line-meta">
                      {it.excluded ? 'retirée de la prévision' : `le ${formatDateShort(it.dateIso)}`}
                    </span>
                  </div>
                  <span className="forecast-line-amt num neg">−{formatMoneyCompact(it.amount)}</span>
                  <button
                    className="forecast-line-action"
                    aria-label={it.excluded ? 'Rétablir cette charge' : 'Retirer cette charge'}
                    onClick={() => { haptic('selection'); toggleCharge(it.key) }}
                  >
                    {it.excluded ? <RotateCcw size={16} /> : <X size={16} />}
                  </button>
                </div>
              )
            })}
            <p className="forecast-note">
              <X size={13} /> Retire une charge mal détectée (dette terminée, dépense ponctuelle…). Réversible.
            </p>
          </div>
        )}

        {/* Dépenses estimées */}
        <div className="forecast-section">
          <div className="forecast-section-head">
            <span className="section-label">Dépenses estimées</span>
            <span className="num neg">−{formatMoneyCompact(f.variableProjected)}</span>
          </div>
          <div className="forecast-line">
            <CategoryIcon icon="shopping-bag" color="#f0517a" size={34} />
            <div className="forecast-line-main">
              <span className="forecast-line-title">Dépenses du quotidien</span>
              <span className="forecast-line-meta">
                ~{formatMoneyCompact(f.dailyBurn)}/jour × {f.remainingDays} jour{f.remainingDays > 1 ? 's' : ''}
              </span>
            </div>
            <span className="forecast-line-amt num neg">−{formatMoneyCompact(f.variableProjected)}</span>
          </div>
          <p className="forecast-note">
            <Wallet size={13} /> Moyenne des 90 derniers jours, hors charges fixes et virements internes.
          </p>
        </div>
      </Sheet>
    </section>
  )
}
