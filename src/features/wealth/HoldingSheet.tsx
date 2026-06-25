import { useEffect, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { useDeleteHolding, useSaveHolding } from '@/data/hooks'
import { searchSymbols } from '@/lib/market/client'
import { formatMoney } from '@/lib/format'
import type { Account, Holding, HoldingEnvelope, HoldingKind, Quote, SymbolSearchResult } from '@/types'
import { ENVELOPE_META, ENVELOPE_ORDER, KIND_META, KIND_ORDER } from './wealthMeta'

interface Props {
  open: boolean
  onClose: () => void
  holding: Holding | null
  accounts: Account[]
  quote?: Quote
}

const DEFAULT_ENVELOPE: Record<HoldingKind, HoldingEnvelope> = {
  etf: 'PEA',
  stock: 'PEA',
  crypto: 'crypto',
  fund: 'AV',
  livret: 'livret',
  real_estate: 'autre',
  cash: 'autre',
  other: 'autre',
}

export function HoldingSheet({ open, onClose, holding, accounts, quote }: Props) {
  const save = useSaveHolding()
  const remove = useDeleteHolding()
  const savingsAccounts = accounts.filter((a) => a.kind === 'savings')

  const [kind, setKind] = useState<HoldingKind>(holding?.kind ?? 'etf')
  const [symbol, setSymbol] = useState(holding?.symbol ?? '')
  const [name, setName] = useState(holding?.name ?? '')
  const [quantity, setQuantity] = useState(holding ? String(holding.quantity) : '1')
  const [costBasis, setCostBasis] = useState(holding ? String(holding.costBasis) : '')
  const [manualValue, setManualValue] = useState(holding?.manualValue != null ? String(holding.manualValue) : '')
  const [envelope, setEnvelope] = useState<HoldingEnvelope>(holding?.envelope ?? 'PEA')
  const [linkedAccountId, setLinkedAccountId] = useState(holding?.linkedAccountId ?? '')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SymbolSearchResult[]>([])

  // Re-sync local state when a different holding is opened.
  const [trackedId, setTrackedId] = useState<string | null>(holding?.id ?? null)
  if (open && (holding?.id ?? null) !== trackedId) {
    setTrackedId(holding?.id ?? null)
    setKind(holding?.kind ?? 'etf')
    setSymbol(holding?.symbol ?? '')
    setName(holding?.name ?? '')
    setQuantity(holding ? String(holding.quantity) : '1')
    setCostBasis(holding ? String(holding.costBasis) : '')
    setManualValue(holding?.manualValue != null ? String(holding.manualValue) : '')
    setEnvelope(holding?.envelope ?? 'PEA')
    setLinkedAccountId(holding?.linkedAccountId ?? '')
    setQuery('')
    setResults([])
  }

  const quoted = KIND_META[kind].quoted

  // Recherche de symbole (débouncée) pour les actifs cotés.
  useEffect(() => {
    const q = query.trim()
    const id = setTimeout(() => {
      if (!quoted || q.length < 2) {
        setResults([])
        return
      }
      searchSymbols(q).then(setResults).catch(() => setResults([]))
    }, 280)
    return () => clearTimeout(id)
  }, [query, quoted])

  function pickSymbol(r: SymbolSearchResult) {
    setSymbol(r.symbol.toUpperCase())
    setName(r.name)
    setKind(r.kind)
    if (r.kind === 'crypto') setEnvelope('crypto')
    setQuery('')
    setResults([])
  }

  function changeKind(next: HoldingKind) {
    setKind(next)
    setEnvelope(DEFAULT_ENVELOPE[next])
    if (!KIND_META[next].quoted) setSymbol('')
  }

  function onSave() {
    if (!name.trim()) return
    save.mutate({
      id: holding?.id,
      kind,
      symbol: quoted ? symbol || null : null,
      name: name.trim(),
      quantity: Number(quantity) || 1,
      costBasis: Number(costBasis) || 0,
      currency: 'EUR',
      envelope,
      manualValue: quoted ? null : manualValue ? Number(manualValue) : null,
      linkedAccountId: linkedAccountId || null,
    })
    onClose()
  }

  const estimated = quoted && quote ? (Number(quantity) || 0) * quote.price : null

  return (
    <Sheet open={open} onClose={onClose} title={holding ? holding.name : 'Nouvelle position'}>
      <div className="field">
        <label htmlFor="h-kind">Type d’actif</label>
        <select id="h-kind" className="input" value={kind} onChange={(e) => changeKind(e.target.value as HoldingKind)}>
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>{KIND_META[k].label}</option>
          ))}
        </select>
      </div>

      {quoted && (
        <div className="field">
          <label htmlFor="h-search">Rechercher une valeur</label>
          <div className="symbol-search">
            <Search size={16} className="symbol-search-icon" />
            <input
              id="h-search"
              className="input"
              placeholder="Ex. World, LVMH, Bitcoin…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {results.length > 0 && (
            <ul className="symbol-results">
              {results.map((r) => (
                <li key={`${r.symbol}-${r.exchange}`}>
                  <button type="button" onClick={() => pickSymbol(r)}>
                    <span className="symbol-results-sym">{r.symbol}</span>
                    <span className="symbol-results-name">{r.name}</span>
                    <span className="symbol-results-ex">{r.exchange}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {quoted && (
        <div className="field">
          <label htmlFor="h-symbol">Symbole</label>
          <input
            id="h-symbol"
            className="input"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="BTC, ETH, AAPL, CW8.PA…"
          />
          <span className="field-hint">Crypto : BTC, ETH, SOL… · Actions/ETF : ticker (ex. AAPL, MC.PA)</span>
        </div>
      )}

      <div className="field">
        <label htmlFor="h-name">Nom</label>
        <input id="h-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la position" />
      </div>

      {quoted ? (
        <>
          <div className="field-row">
            <div className="field">
              <label htmlFor="h-qty">Quantité</label>
              <input id="h-qty" type="number" inputMode="decimal" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="h-cost">Total investi (€)</label>
              <input id="h-cost" type="number" inputMode="decimal" className="input" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} placeholder="0" />
            </div>
          </div>
          <span className="field-hint">Nombre d’unités détenues, et la somme totale dépensée pour les acheter (sert au calcul de ta +/- value).</span>
        </>
      ) : (
        <div className="field-row">
          <div className="field">
            <label htmlFor="h-value">Valeur actuelle (€)</label>
            <input id="h-value" type="number" inputMode="decimal" className="input" value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label htmlFor="h-cost2">Montant investi (€)</label>
            <input id="h-cost2" type="number" inputMode="decimal" className="input" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} placeholder="0" />
          </div>
        </div>
      )}

      {estimated != null && (
        <p className="holding-estimate">Valeur estimée au cours actuel : <strong className="num">{formatMoney(estimated)}</strong></p>
      )}

      <div className="field">
        <label htmlFor="h-env">Enveloppe</label>
        <select id="h-env" className="input" value={envelope} onChange={(e) => setEnvelope(e.target.value as HoldingEnvelope)}>
          {ENVELOPE_ORDER.map((e) => (
            <option key={e} value={e}>{ENVELOPE_META[e]}</option>
          ))}
        </select>
      </div>

      {kind === 'livret' && (
        <div className="field">
          <label htmlFor="h-acc">Compte lié (synchronise la valeur)</label>
          <select id="h-acc" className="input" value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)}>
            <option value="">Aucun compte lié</option>
            {savingsAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} · {formatMoney(a.balance, a.currency)}</option>
            ))}
          </select>
        </div>
      )}

      <Button block onClick={onSave}>Enregistrer</Button>

      {holding && (
        <Button variant="quiet" block style={{ marginTop: 8, color: 'var(--negative)' }} onClick={() => { remove.mutate(holding.id); onClose() }}>
          <Trash2 size={16} /> Supprimer la position
        </Button>
      )}
    </Sheet>
  )
}
