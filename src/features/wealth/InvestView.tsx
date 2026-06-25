import { useState } from 'react'
import { Plus, TrendingUp, Sparkles, WifiOff } from 'lucide-react'
import type { Account, Category, Holding, Quote } from '@/types'
import type { CategorySlice, HoldingValuation, PortfolioSummary } from '@/data/selectors'
import { DonutChart } from '@/components/charts/DonutChart'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { HoldingSheet } from './HoldingSheet'
import { SimulatorTeaser } from './SimulatorTeaser'
import { KIND_META } from './wealthMeta'
import { formatMoney, formatMoneyCompact, formatPercent, formatRelative, formatSigned } from '@/lib/format'

interface Props {
  accounts: Account[]
  holdings: Holding[]
  quoteMap: Map<string, Quote>
  summary: PortfolioSummary
  /** True si la récupération des cours a échoué (valeurs au prix de revient). */
  quotesFailed?: boolean
}

/** Construit les tranches du donut à partir de la répartition par classe d'actif. */
function kindSlices(summary: PortfolioSummary): CategorySlice[] {
  return summary.byKind.map((s) => {
    const meta = KIND_META[s.key]
    return {
      category: { id: s.key, name: meta.label, color: meta.color } as Category,
      amount: s.value,
      ratio: s.ratio,
    }
  })
}

export function InvestView({ accounts, holdings, quoteMap, summary, quotesFailed }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Holding | null>(null)

  function openNew() {
    setActive(null)
    setOpen(true)
  }
  function openHolding(h: Holding) {
    setActive(h)
    setOpen(true)
  }

  if (holdings.length === 0) {
    return (
      <>
        <EmptyState
          icon={TrendingUp}
          title="Aucune position"
          hint="Ajoute tes actions, ETF, crypto ou ton immobilier pour suivre ton patrimoine en temps réel."
        />
        <Button block onClick={openNew}><Plus size={16} /> Ajouter une position</Button>
        <SimulatorTeaser />
        <HoldingSheet open={open} onClose={() => setOpen(false)} holding={active} accounts={accounts} />
      </>
    )
  }

  const gainUp = summary.gain >= 0

  return (
    <>
      {quotesFailed && (
        <div className="quotes-banner rise">
          <WifiOff size={15} />
          <span>Cours indisponibles pour le moment — valeurs affichées au prix de revient.</span>
        </div>
      )}

      {/* Patrimoine global */}
      <section className="rise">
        <div className="card card-pad">
          <div className="invest-summary-top">
            <div>
              <span className="section-label">Portefeuille</span>
              <span className="invest-summary-value num">{formatMoney(summary.totalValue)}</span>
            </div>
            <span className={`pill ${gainUp ? 'pill-positive' : 'pill-negative'}`}>
              {formatSigned(summary.gain)} ({formatPercent(summary.gainPct)})
            </span>
          </div>
          <DonutChart slices={kindSlices(summary)} total={summary.totalValue} centerLabel="Patrimoine" />
          <ul className="legend">
            {summary.byKind.map((s) => {
              const meta = KIND_META[s.key]
              return (
                <li key={s.key}>
                  <span className="legend-dot" style={{ background: meta.color }} />
                  <span className="legend-name">{meta.label}</span>
                  <span className="legend-val num">{formatMoneyCompact(s.value)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Positions */}
      <section className="rise" style={{ animationDelay: '80ms' }}>
        <div className="row-head">
          <h2 className="block-title">Mes positions</h2>
          <Button size="sm" variant="ghost" onClick={openNew}><Plus size={16} /> Ajouter</Button>
        </div>
        <div className="holding-list">
          {summary.valuations.map((v, i) => (
            <HoldingRow key={v.holding.id} v={v} index={i} onClick={() => openHolding(v.holding)} />
          ))}
        </div>
      </section>

      <SimulatorTeaser />

      <HoldingSheet open={open} onClose={() => setOpen(false)} holding={active} accounts={accounts} quote={active?.symbol ? quoteMap.get(active.symbol) : undefined} />
    </>
  )
}

function HoldingRow({ v, index, onClick }: { v: HoldingValuation; index: number; onClick: () => void }) {
  const meta = KIND_META[v.holding.kind]
  const Icon = meta.icon
  const dayUp = (v.quote?.changePct ?? 0) >= 0
  const gainUp = v.gain >= 0

  return (
    <button className="card card-pad holding-row rise" style={{ animationDelay: `${index * 40}ms` }} onClick={onClick}>
      <span className="holding-icon" style={{ background: `${meta.color}22`, color: meta.color }}>
        <Icon size={20} />
      </span>
      <div className="holding-main">
        <span className="holding-name">{v.holding.name}</span>
        <span className="holding-sub">
          {v.holding.symbol ? `${v.holding.symbol} · ` : ''}
          {v.hasLivePrice && v.quote ? (
            <span className="holding-live"><Sparkles size={11} /> cours réel · {formatRelative(v.quote.asOf)}</span>
          ) : (
            meta.label
          )}
        </span>
      </div>
      <div className="holding-figures">
        <span className="holding-value num">{formatMoney(v.value)}</span>
        {v.hasLivePrice ? (
          <span className={`holding-change num ${dayUp ? 'up' : 'down'}`}>
            {dayUp ? '+' : ''}{v.quote?.changePct.toFixed(2)} %
          </span>
        ) : (
          <span className={`holding-change num ${gainUp ? 'up' : 'down'}`}>
            {formatSigned(v.gain)}
          </span>
        )}
      </div>
    </button>
  )
}
