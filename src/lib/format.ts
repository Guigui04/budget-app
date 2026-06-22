/** Formatting helpers — French locale, EUR by default. */

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const eurCompact = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatMoney(amount: number, currency = 'EUR'): string {
  if (currency !== 'EUR') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
  }
  return eur.format(amount)
}

export function formatMoneyCompact(amount: number): string {
  return eurCompact.format(amount)
}

/** Signed amount with explicit + for income, used in transaction rows. */
export function formatSigned(amount: number): string {
  const sign = amount > 0 ? '+' : ''
  return `${sign}${eur.format(amount)}`
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
