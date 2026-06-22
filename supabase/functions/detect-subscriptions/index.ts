/**
 * detect-subscriptions — repère les paiements récurrents (même marchand,
 * montant proche, intervalle régulier) à partir de ≥ 2 occurrences, propose
 * une détection à confirmer, et crée une alerte `new_subscription`.
 */
import { json, preflight } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'

interface Tx {
  clean_label: string
  raw_label: string
  amount: number
  booking_date: string
  category_id: string | null
}

const DAY = 86400000
// Virements / remboursements : ce ne sont pas des abonnements récurrents.
const TRANSFER_RE = /\b(VIR|VIREMENT|EMIS|RECU|REMBOURSEMENT|TIP|SEPA RECU)\b/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const db = adminClient()
  const { data: households } = await db.from('households').select('id')
  let created = 0

  for (const hh of households ?? []) {
    const { data: txns } = await db
      .from('transactions')
      .select('clean_label,raw_label,amount,booking_date,category_id')
      .eq('household_id', hh.id)
      .lt('amount', 0)
      .order('booking_date', { ascending: true })

    const groups = new Map<string, Tx[]>()
    for (const t of (txns ?? []) as Tx[]) {
      if (TRANSFER_RE.test(t.raw_label)) continue // ignore les virements
      const key = t.clean_label.toLowerCase().trim()
      if (!key) continue
      groups.set(key, [...(groups.get(key) ?? []), t])
    }

    for (const [, items] of groups) {
      if (items.length < 2) continue

      // Isole le montant RÉCURRENT du marchand (le plus fréquent), pour détecter
      // un abonnement même quand le même marchand a aussi des achats ponctuels
      // (ex. Google Play : abo Spotify 7,07 € + achats d'apps divers).
      const byAmount = new Map<string, Tx[]>()
      for (const it of items) {
        const k = Math.abs(it.amount).toFixed(2)
        byAmount.set(k, [...(byAmount.get(k) ?? []), it])
      }
      let recurring: Tx[] = []
      for (const [, g] of byAmount) {
        if (g.length > recurring.length) recurring = g
      }
      if (recurring.length < 2) continue

      const avg = Math.abs(recurring[0].amount)

      const gaps = intervals(recurring.map((i) => new Date(i.booking_date).getTime()))
      const frequency = inferFrequency(gaps)
      if (!frequency) continue

      // Seuil d'occurrences : 3 pour mensuel/annuel, 6 pour hebdo (rares, sinon
      // les achats fréquents — café, ciné — passent pour des abonnements).
      const minOccurrences = frequency === 'weekly' ? 6 : 3
      if (recurring.length < minOccurrences) continue

      const last = recurring[recurring.length - 1]
      const merchant = last.clean_label
      const { data: existing } = await db
        .from('subscriptions')
        .select('id')
        .eq('household_id', hh.id)
        .ilike('merchant_label', merchant)
        .limit(1)
      if (existing && existing.length > 0) continue

      const next = new Date(new Date(last.booking_date).getTime() + freqDays(frequency) * DAY)
      await db.from('subscriptions').insert({
        household_id: hh.id,
        merchant_label: merchant,
        amount: Math.round(avg * 100) / 100,
        frequency,
        next_expected_date: next.toISOString().slice(0, 10),
        category_id: last.category_id,
        is_confirmed: false,
        is_active: true,
      })
      await db.from('alerts').insert({
        household_id: hh.id,
        type: 'new_subscription',
        payload: { merchant, amount: -avg },
      })
      created++
    }
  }

  return json({ created })
})

function intervals(times: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < times.length; i++) out.push((times[i] - times[i - 1]) / DAY)
  return out
}

function inferFrequency(gaps: number[]): 'weekly' | 'monthly' | 'yearly' | null {
  if (gaps.length === 0) return null
  // Médiane : robuste à un mois sauté ou un écart aberrant.
  const sorted = [...gaps].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  if (median >= 5 && median <= 9) return 'weekly'
  if (median >= 26 && median <= 35) return 'monthly'
  if (median >= 350 && median <= 380) return 'yearly'
  return null
}

function freqDays(f: 'weekly' | 'monthly' | 'yearly'): number {
  return f === 'weekly' ? 7 : f === 'monthly' ? 30 : 365
}
