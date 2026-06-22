/**
 * bank-callback — finalise le consentement bancaire après SCA.
 * Le front transmet le `code`, le `state` signé par le flux et l'ASPSP choisi.
 * La fonction vérifie que le state correspond au foyer de l'utilisateur connecté,
 * crée la connexion bancaire, upsert les comptes, puis lance une première synchro.
 */
import { json, preflight } from '../_shared/cors.ts'
import { adminClient, callerHousehold } from '../_shared/supabaseAdmin.ts'
import { getBankProvider } from '../_shared/provider.ts'

const ASPSP_BY_ID: Record<string, { name: string; country: string }> = {
  'credit-agricole': { name: 'Credit Agricole', country: 'FR' },
  boursobank: { name: 'BoursoBank', country: 'FR' },
  revolut: { name: 'Revolut', country: 'FR' },
}

interface CallbackBody {
  code?: unknown
  state?: unknown
  aspspId?: unknown
  aspspName?: unknown
  aspspCountry?: unknown
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)

  const caller = await callerHousehold(authHeader)
  if (!caller) return json({ error: 'Foyer introuvable' }, 403)

  try {
    const body = await req.json() as CallbackBody
    const code = typeof body.code === 'string' ? body.code : ''
    const state = typeof body.state === 'string' ? body.state : ''
    // Nom de banque générique (GoCardless) ou legacy id mappé (Enable Banking).
    const legacy = typeof body.aspspId === 'string' ? ASPSP_BY_ID[body.aspspId] : undefined
    const aspspName = typeof body.aspspName === 'string' ? body.aspspName : legacy?.name

    if (!code || !state) return json({ error: 'Retour bancaire incomplet' }, 400)
    if (!aspspName) return json({ error: 'Banque non reconnue' }, 400)

    const [stateHouseholdId, stateUserId] = state.split(':')
    if (stateHouseholdId !== caller.householdId || stateUserId !== caller.userId) {
      return json({ error: 'Retour bancaire invalide' }, 403)
    }

    const provider = getBankProvider()
    const session = await provider.createSession(code)
    const db = adminClient()

    const { data: connection, error: connectionError } = await db
      .from('bank_connections')
      .insert({
        household_id: caller.householdId,
        owner_user_id: caller.userId,
        provider: Deno.env.get('BANK_PROVIDER') ?? 'enablebanking',
        aspsp_name: aspspName,
        external_session_id: session.sessionId,
        consent_expires_at: session.consentExpiresAt,
        status: 'active',
      })
      .select('id')
      .single()

    if (connectionError) throw new Error(connectionError.message)

    for (const account of session.accounts) {
      const { error } = await db.from('accounts').upsert(
        {
          bank_connection_id: connection.id,
          household_id: caller.householdId,
          external_account_id: account.externalAccountId,
          name: account.name,
          iban: account.iban ?? null,
          currency: account.currency,
          balance: account.balance,
          balance_updated_at: new Date().toISOString(),
          kind: account.kind,
        },
        { onConflict: 'bank_connection_id,external_account_id' },
      )
      if (error) throw new Error(error.message)
    }

    await triggerInitialSync(authHeader)

    return json({ connectionId: connection.id, accounts: session.accounts.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Callback bancaire impossible'
    return json({ error: message }, 500)
  }
})

async function triggerInitialSync(authHeader: string): Promise<void> {
  const baseUrl = Deno.env.get('SUPABASE_URL')
  if (!baseUrl) return

  try {
    await fetch(`${baseUrl}/functions/v1/bank-sync`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual: true, initial: true }),
    })
  } catch {
    // Les comptes sont déjà créés ; une synchro manuelle pourra retenter l'import.
  }
}
