/** Formatting helpers — French locale, EUR by default. */

const DEFAULT_CURRENCY = 'EUR'

// Les formatteurs Intl sont coûteux à instancier : on les mémorise par
// (devise, mode compact). EUR reste le cas par défaut ; toute autre devise
// (compte/transaction étrangère) est gérée sans changement d'appelant.
const formatterCache = new Map<string, Intl.NumberFormat>()

function moneyFormatter(currency: string, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact ? 'c' : 'f'}`
  let fmt = formatterCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 0 : 2,
    })
    formatterCache.set(key, fmt)
  }
  return fmt
}

export function formatMoney(amount: number, currency = DEFAULT_CURRENCY): string {
  return moneyFormatter(currency, false).format(amount)
}

export function formatMoneyCompact(amount: number, currency = DEFAULT_CURRENCY): string {
  return moneyFormatter(currency, true).format(amount)
}

/** Signed amount with explicit + for income, used in transaction rows. */
export function formatSigned(amount: number, currency = DEFAULT_CURRENCY): string {
  const sign = amount > 0 ? '+' : ''
  return `${sign}${moneyFormatter(currency, false).format(amount)}`
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`
}

const dateFull = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const dateShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const monthLong = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

export function formatDate(iso: string): string {
  return dateFull.format(new Date(iso))
}

export function formatDateShort(iso: string): string {
  return dateShort.format(new Date(iso))
}

export function formatMonth(iso: string): string {
  return monthLong.format(new Date(iso))
}

/** Relative freshness label: "il y a 3 h", "à l'instant", "il y a 2 j". */
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return `il y a ${d} j`
}

/** Data is stale when last sync is older than 24h. */
export function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 24 * 60 * 60 * 1000
}

/** Mask an IBAN, keeping only the last 4 characters visible. */
export function maskIban(iban: string): string {
  const trimmed = iban.replace(/\s+/g, '')
  if (trimmed.length <= 4) return trimmed
  return `•••• ${trimmed.slice(-4)}`
}

/** Days until a future ISO date (negative if past). */
export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}
