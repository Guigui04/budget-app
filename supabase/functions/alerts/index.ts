/**
 * alerts — évalue l'état des enveloppes (80 % → warning, 100 %+ → exceeded),
 * persiste les alertes (dédupliquées sur le mois) et envoie les Web Push aux
 * membres ayant accordé la permission. Les alertes restent TOUJOURS in-app.
 */
import { json, preflight } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const db = adminClient()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const { data: households } = await db.from('households').select('id')
  let raised = 0

  for (const hh of households ?? []) {
    const [{ data: budgets }, { data: txns }] = await Promise.all([
      db.from('budgets').select('category_id,amount,categories(name)').eq('household_id', hh.id),
      db.from('transactions').select('category_id,amount').eq('household_id', hh.id).gte('booking_date', monthStart).lt('amount', 0),
    ])

    const spentByCat = new Map<string, number>()
    for (const t of txns ?? []) {
      if (!t.category_id) continue
      spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + Math.abs(t.amount))
    }

    for (const b of budgets ?? []) {
      const spent = spentByCat.get(b.category_id) ?? 0
      const ratio = b.amount > 0 ? spent / b.amount : 0
      const name = (b as { categories?: { name?: string } }).categories?.name ?? 'Catégorie'

      const type = ratio >= 1 ? 'budget_exceeded' : ratio >= 0.8 ? 'budget_warning' : null
      if (!type) continue

      // Déduplication : une seule alerte de ce type/catégorie ce mois-ci.
      const { data: dup } = await db
        .from('alerts')
        .select('id')
        .eq('household_id', hh.id)
        .eq('type', type)
        .gte('created_at', monthStart + 'T00:00:00Z')
        .contains('payload', { category: name })
        .limit(1)
      if (dup && dup.length > 0) continue

      await db.from('alerts').insert({ household_id: hh.id, type, payload: { category: name, ratio } })
      await notifyHousehold(db, hh.id, type === 'budget_exceeded' ? 'Budget dépassé' : 'Budget bientôt atteint', `${name} à ${Math.round(ratio * 100)} %`)
      raised++
    }
  }

  return json({ raised })
})

async function notifyHousehold(
  db: ReturnType<typeof adminClient>,
  householdId: string,
  title: string,
  body: string,
): Promise<void> {
  const { data: members } = await db
    .from('users')
    .select('push_subscription')
    .eq('household_id', householdId)
    .not('push_subscription', 'is', null)

  if (!members || members.length === 0) return

  try {
    // web-push gère la signature VAPID. La clé privée vient des secrets.
    const webpush = await import('https://esm.sh/web-push@3.6.7')
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@foyer.app',
      Deno.env.get('VITE_VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )
    const payload = JSON.stringify({ title, body })
    await Promise.allSettled(
      members.map((m) => webpush.sendNotification(m.push_subscription, payload)),
    )
  } catch {
    // Le Web Push peut échouer (iOS, abonnement expiré) — l'alerte in-app suffit.
  }
}
