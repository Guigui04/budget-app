/**
 * bank-auth-start — démarre le flux de consentement DSP2.
 * Génère le JWT signé (côté serveur) et renvoie l'URL de redirection SCA.
 * Aucune clé/secret ne transite par l'app.
 */
import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { callerHousehold } from '../_shared/supabaseAdmin.ts'
import { getBankProvider } from '../_shared/provider.ts'

const ASPSP_BY_ID: Record<string, { name: string; country: string }> = {
  'credit-agricole': { name: 'Credit Agricole', country: 'FR' },
  boursobank: { name: 'BoursoBank', country: 'FR' },
  revolut: { name: 'Revolut', country: 'FR' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)

  const caller = await callerHousehold(authHeader)
  if (!caller) return json({ error: 'Foyer introuvable' }, 403)

  try {
    const { aspspId, redirectAfter } = await req.json()
    const aspsp = ASPSP_BY_ID[aspspId]
    if (!aspsp) return json({ error: 'Banque non supportée' }, 400)

    // `state` lie le callback à l'utilisateur + foyer sans exposer de secret.
    const state = `${caller.householdId}:${caller.userId}:${crypto.randomUUID()}`

    const provider = getBankProvider()
    const result = await provider.startAuth({
      aspspName: aspsp.name,
      aspspCountry: aspsp.country,
      redirectUrl: redirectAfter ?? `${Deno.env.get('APP_URL')}/comptes`,
      state,
    })

    return json({ redirectUrl: result.redirectUrl })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erreur' }, 500)
  }
})

export { corsHeaders }
