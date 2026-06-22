/**
 * categorize — (re)catégorise les transactions « À classer » d'un foyer via
 * les règles utilisateur puis l'heuristique. Ne touche JAMAIS une catégorie
 * posée manuellement (category_source = 'manual').
 */
import { json, preflight } from '../_shared/cors.ts'
import { adminClient, callerHousehold } from '../_shared/supabaseAdmin.ts'
import { categorizeLabel } from '../_shared/categorize.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)
  const caller = await callerHousehold(authHeader)
  if (!caller) return json({ error: 'Foyer introuvable' }, 403)

  const db = adminClient()
  const hh = caller.householdId

  const [{ data: categories }, { data: rules }, { data: txns }] = await Promise.all([
    db.from('categories').select('id,name').eq('household_id', hh),
    db.from('categorization_rules').select('match_pattern,category_id,priority').eq('household_id', hh),
    db.from('transactions').select('id,raw_label').eq('household_id', hh).is('category_id', null),
  ])

  const catByName = new Map((categories ?? []).map((c) => [c.name, c.id]))
  let updated = 0

  for (const t of txns ?? []) {
    const result = categorizeLabel(t.raw_label, rules ?? [])
    if (!result) continue
    const id = result.startsWith('name:') ? catByName.get(result.slice(5)) : result
    const source = result.startsWith('name:') ? 'auto' : 'rule'
    if (!id) continue
    await db.from('transactions').update({ category_id: id, category_source: source }).eq('id', t.id)
    updated++
  }

  return json({ updated })
})
