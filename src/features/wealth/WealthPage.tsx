import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useAccounts, useHoldings, useNetWorthSnapshots, useQuotes, useRecordNetWorth } from '@/data/hooks'
import { netWorth, portfolioSummary } from '@/data/selectors'
import { Segmented } from '@/components/ui/Segmented'
import { formatMoney, formatMoneyCompact, formatSigned } from '@/lib/format'
import { useCountUp } from '@/lib/useCountUp'
import { InvestView } from './InvestView'
import { GoalsView } from './GoalsView'
import { AutomationsView } from './AutomationsView'
import { NetWorthTrend } from './NetWorthTrend'

type Segment = 'invest' | 'goals' | 'auto'

export function WealthPage() {
  const [segment, setSegment] = useState<Segment>('invest')
  const { data: accounts = [] } = useAccounts()
  const { data: holdings = [] } = useHoldings()
  const { data: snapshots = [] } = useNetWorthSnapshots()
  const record = useRecordNetWorth()

  const symbols = useMemo(
    () => holdings.map((h) => h.symbol).filter((s): s is string => Boolean(s)),
    [holdings],
  )
  const quotesQuery = useQuotes(symbols)
  const quotesData = quotesQuery.data
  const quotesFailed = quotesQuery.isError && symbols.length > 0

  const { quoteMap, summary, worth } = useMemo(() => {
    const quoteMap = new Map((quotesData ?? []).map((q) => [q.symbol, q]))
    return {
      quoteMap,
      summary: portfolioSummary(holdings, quoteMap, accounts),
      worth: netWorth(accounts, holdings, quoteMap),
    }
  }, [holdings, quotesData, accounts])

  // Enregistre le point de valeur nette du jour, une fois les cours stabilisés.
  const recordedRef = useRef(false)
  useEffect(() => {
    if (recordedRef.current || quotesQuery.isFetching) return
    if (accounts.length === 0 && holdings.length === 0) return
    recordedRef.current = true
    record.mutate({ total: worth.total, cash: worth.cash, invested: worth.invested })
  }, [accounts.length, holdings.length, quotesQuery.isFetching, worth, record])

  const displayWorth = useCountUp(worth.total)
  const up = summary.dayChange >= 0

  return (
    <div className="page">
      {/* Héro valeur nette */}
      <div className="wealth-hero rise">
        <span className="wealth-hero-label">Valeur nette du foyer</span>
        <span className="wealth-hero-value num">{formatMoney(displayWorth)}</span>
        <div className="wealth-hero-meta">
          <span className={`pill ${up ? 'pill-positive' : 'pill-negative'}`}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {formatSigned(summary.dayChange)} aujourd’hui
          </span>
          <span className="wealth-hero-split">
            {formatMoneyCompact(worth.cash)} liquidités · {formatMoneyCompact(worth.invested)} investis
          </span>
        </div>
      </div>

      <NetWorthTrend snapshots={snapshots} />

      <Segmented<Segment>
        options={[
          { value: 'invest', label: 'Investir' },
          { value: 'goals', label: 'Objectifs' },
          { value: 'auto', label: 'Automatismes' },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {segment === 'invest' && (
        <InvestView accounts={accounts} holdings={holdings} quoteMap={quoteMap} summary={summary} quotesFailed={quotesFailed} />
      )}
      {segment === 'goals' && <GoalsView />}
      {segment === 'auto' && <AutomationsView />}
    </div>
  )
}
