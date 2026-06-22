/**
 * bank-institutions — liste les banques disponibles (ASPSP) pour le sélecteur.
 * Réservé aux utilisateurs authentifiés d'un foyer. Délègue à l'agrégateur actif
 * via l'abstraction BankProvider (aucun appel « en dur »).
 */
import { json, preflight } from '../_shared/cors.ts'
import { callerHousehold } from '../_shared/supabaseAdmin.ts'
import { getBankProvider } from '../_shared/provider.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)

  const caller = await callerHousehold(authHeader)
  if (!caller) return json({ error: 'Foyer introuvable' }, 403)

  try {
    const body = await req.json().catch(() => ({}))
    const country = typeof body.country === 'string' ? body.country : 'FR'
    const provider = getBankProvider()
    const aspsps = await provider.listAspsps(country)
    return json({ aspsps })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erreur' }, 500)
  }
})
