/**
 * quotes — cours de marché réels (actions/ETF via Twelve Data, crypto via
 * CoinGecko) + recherche de symbole. La clé API reste côté serveur ; les cours
 * sont mis en cache dans `market_quotes` (TTL ~15 min) pour respecter le
 * free-tier du fournisseur. Aucune donnée propre au foyer ici, mais l'appel
 * exige un utilisateur authentifié (anti-abus).
 */
import { json, preflight } from '../_shared/cors.ts'
import { adminClient, callerHousehold } from '../_shared/supabaseAdmin.ts'

const CACHE_TTL_MS = 15 * 60 * 1000

// Catalogue crypto : ticker → identifiant CoinGecko + nom. Sert au routage des
// cours ET à la recherche (CoinGecko n'est pas indexé par Twelve Data).
const CRYPTO_CATALOG: { ticker: string; id: string; name: string }[] = [
  { ticker: 'BTC', id: 'bitcoin', name: 'Bitcoin' },
  { ticker: 'ETH', id: 'ethereum', name: 'Ethereum' },
  { ticker: 'USDT', id: 'tether', name: 'Tether' },
  { ticker: 'BNB', id: 'binancecoin', name: 'BNB' },
  { ticker: 'SOL', id: 'solana', name: 'Solana' },
  { ticker: 'USDC', id: 'usd-coin', name: 'USD Coin' },
  { ticker: 'XRP', id: 'ripple', name: 'XRP' },
  { ticker: 'ADA', id: 'cardano', name: 'Cardano' },
  { ticker: 'AVAX', id: 'avalanche-2', name: 'Avalanche' },
  { ticker: 'DOGE', id: 'dogecoin', name: 'Dogecoin' },
  { ticker: 'DOT', id: 'polkadot', name: 'Polkadot' },
  { ticker: 'TRX', id: 'tron', name: 'TRON' },
  { ticker: 'LINK', id: 'chainlink', name: 'Chainlink' },
  { ticker: 'MATIC', id: 'matic-network', name: 'Polygon' },
  { ticker: 'LTC', id: 'litecoin', name: 'Litecoin' },
  { ticker: 'SHIB', id: 'shiba-inu', name: 'Shiba Inu' },
  { ticker: 'BCH', id: 'bitcoin-cash', name: 'Bitcoin Cash' },
  { ticker: 'XLM', id: 'stellar', name: 'Stellar' },
  { ticker: 'ATOM', id: 'cosmos', name: 'Cosmos' },
  { ticker: 'XMR', id: 'monero', name: 'Monero' },
  { ticker: 'ETC', id: 'ethereum-classic', name: 'Ethereum Classic' },
  { ticker: 'UNI', id: 'uniswap', name: 'Uniswap' },
  { ticker: 'AAVE', id: 'aave', name: 'Aave' },
  { ticker: 'ALGO', id: 'algorand', name: 'Algorand' },
]

const CRYPTO_IDS: Record<string, string> = Object.fromEntries(
  CRYPTO_CATALOG.map((c) => [c.ticker, c.id]),
)

interface QuoteRow {
  symbol: string
  price: number
  currency: string
  change_pct: number
  as_of: string
}

const TWELVE_KEY = Deno.env.get('TWELVEDATA_API_KEY') ?? ''

function isFresh(asOf: string, now: number): boolean {
  return now - new Date(asOf).getTime() < CACHE_TTL_MS
}

/** Cours crypto depuis CoinGecko (sans clé). */
async function fetchCrypto(symbols: string[]): Promise<QuoteRow[]> {
  const ids = symbols.map((s) => CRYPTO_IDS[s]).filter(Boolean)
  if (ids.length === 0) return []
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=eur&include_24hr_change=true`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as Record<string, { eur: number; eur_24h_change?: number }>
  const asOf = new Date().toISOString()
  const out: QuoteRow[] = []
  for (const sym of symbols) {
    const id = CRYPTO_IDS[sym]
    const entry = id ? data[id] : undefined
    if (entry) {
      out.push({ symbol: sym, price: entry.eur, currency: 'EUR', change_pct: entry.eur_24h_change ?? 0, as_of: asOf })
    }
  }
  return out
}

/** Cours actions/ETF depuis Twelve Data (multi-symboles). */
async function fetchEquities(symbols: string[]): Promise<QuoteRow[]> {
  if (symbols.length === 0 || !TWELVE_KEY) return []
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${TWELVE_KEY}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  const asOf = new Date().toISOString()
  // Twelve Data renvoie un objet unique (1 symbole) ou un objet indexé par symbole.
  const entries: Record<string, unknown> = symbols.length === 1 ? { [symbols[0]]: data } : data
  const out: QuoteRow[] = []
  for (const sym of symbols) {
    const q = entries[sym] as { close?: string; percent_change?: string; currency?: string; code?: number } | undefined
    if (q && q.close && q.code === undefined) {
      out.push({
        symbol: sym,
        price: Number(q.close),
        currency: q.currency ?? 'EUR',
        change_pct: Number(q.percent_change ?? 0),
        as_of: asOf,
      })
    }
  }
  return out
}

async function handleQuotes(symbols: string[]): Promise<Response> {
  const db = adminClient()
  const now = Date.now()
  const unique = [...new Set(symbols.filter(Boolean))]

  // 1) Cache encore frais.
  const { data: cached } = await db.from('market_quotes').select('*').in('symbol', unique)
  const fresh = new Map<string, QuoteRow>()
  for (const row of (cached ?? []) as QuoteRow[]) {
    if (isFresh(row.as_of, now)) fresh.set(row.symbol, row)
  }

  // 2) Symboles à rafraîchir, routés par type.
  const missing = unique.filter((s) => !fresh.has(s))
  const cryptoMissing = missing.filter((s) => CRYPTO_IDS[s])
  const equityMissing = missing.filter((s) => !CRYPTO_IDS[s])

  const [crypto, equities] = await Promise.all([fetchCrypto(cryptoMissing), fetchEquities(equityMissing)])
  const refreshed = [...crypto, ...equities]

  // 3) Mise en cache.
  if (refreshed.length > 0) {
    await db.from('market_quotes').upsert(refreshed, { onConflict: 'symbol' })
  }

  const all = [...fresh.values(), ...refreshed]
  const quotes = all.map((r) => ({
    symbol: r.symbol,
    price: r.price,
    currency: r.currency,
    changePct: r.change_pct,
    asOf: r.as_of,
  }))
  return json({ quotes })
}

type Kind = 'etf' | 'stock' | 'crypto' | 'fund' | 'other'

function mapInstrumentType(t: string): Kind {
  const s = t.toLowerCase()
  if (s.includes('etf')) return 'etf'
  if (s.includes('fund')) return 'fund'
  if (s.includes('stock') || s.includes('equity') || s.includes('common')) return 'stock'
  return 'other'
}

interface SearchResult {
  symbol: string
  name: string
  kind: Kind | 'crypto'
  currency: string
  exchange: string
}

/** Crypto correspondant à la requête, depuis le catalogue local (priorité). */
function searchCrypto(query: string): SearchResult[] {
  const q = query.toLowerCase()
  return CRYPTO_CATALOG
    .filter((c) => c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map((c) => ({ symbol: c.ticker, name: c.name, kind: 'crypto' as const, currency: 'EUR', exchange: 'Crypto' }))
}

async function handleSearch(query: string): Promise<Response> {
  const crypto = searchCrypto(query)
  let equities: SearchResult[] = []
  if (TWELVE_KEY) {
    const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=10&apikey=${TWELVE_KEY}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json() as { data?: { symbol: string; instrument_name: string; exchange: string; currency: string; instrument_type: string }[] }
      equities = (data.data ?? []).map((d) => ({
        symbol: d.symbol,
        name: d.instrument_name,
        kind: mapInstrumentType(d.instrument_type),
        currency: d.currency || 'EUR',
        exchange: d.exchange,
      }))
    }
  }
  // Crypto d'abord (plus pertinent pour « Bitcoin », « Ethereum »…), puis actions/ETF.
  return json({ results: [...crypto, ...equities].slice(0, 12) })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)
  const caller = await callerHousehold(authHeader)
  if (!caller) return json({ error: 'Foyer introuvable' }, 403)

  const body = await req.json().catch(() => ({})) as { action?: string; symbols?: string[]; query?: string }

  if (body.action === 'search') {
    return handleSearch((body.query ?? '').trim())
  }
  return handleQuotes(Array.isArray(body.symbols) ? body.symbols : [])
})
