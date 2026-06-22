/**
 * detect-subscriptions — repère les paiements récurrents (même marchand,
 * montant proche, intervalle régulier) à partir de ≥ 2 occurrences, propose
 * une détection à confirmer, et crée une alerte `new_subscription`.
 */
import { json, preflight } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'

interface Tx {
  clean_label: string
  amount: number
  booking_date: string
  category_id: string | null
}

const DAY = 86400000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const db = adminClient()
  const { data: households } = await db.from('households').select('id')
  let created = 0

  for (const hh of households ?? []) {
    const { data: txns } = await db
      .from('transactions')
      .select('clean_label,amount,booking_date,category_id')
      .eq('household_id', hh.id)
      .lt('amount', 0)
      .order('booking_date', { ascending: true })

    const groups = new Map<string, Tx[]>()
    for (const t of (txns ?? []) as Tx[]) {
      const key = t.clean_label.toLowerCase().trim()
      groups.set(key, [...(groups.get(key) ?? []), t])
    }

    for (const [, items] of groups) {
      if (items.length < 2) continue
      const amounts = items.map((i) => Math.abs(i.amount))
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const consistent = amounts.every((a) => Math.abs(a - avg) / avg < 0.15)
      if (!consistent) continue

      const gaps = intervals(items.map((i) => new Date(i.booking_date).getTime()))
      const frequency = inferFrequency(gaps)
      if (!frequency) continue

      const last = items[items.length - 1]
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
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
  if (avg >= 5 && avg <= 9) return 'weekly'
  if (avg >= 26 && avg <= 35) return 'monthly'
  if (avg >= 350 && avg <= 380) return 'yearly'
  return null
}

function freqDays(f: 'weekly' | 'monthly' | 'yearly'): number {
  return f === 'weekly' ? 7 : f === 'monthly' ? 30 : 365
}
