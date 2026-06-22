/**
 * bank-sync — synchronisation quotidienne (cron) + déclenchement manuel.
 * Pour chaque connexion active : rafraîchit comptes/soldes, importe les
 * transactions (déduplication via external_id), catégorise, et lève les
 * alertes (consentement proche, grosse transaction, échec de synchro).
 * Robustesse : une banque en erreur ne casse pas la synchro des autres.
 */
import { json, preflight } from '../_shared/cors.ts'
import { adminClient, callerHousehold } from '../_shared/supabaseAdmin.ts'
import { getBankProvider } from '../_shared/provider.ts'
import { categorizeLabel, cleanLabel } from '../_shared/categorize.ts'

const LARGE_TX_THRESHOLD = 400

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const db = adminClient()
  const provider = getBankProvider()
  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceHeader = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
  const isServiceCall = authHeader === serviceHeader
  const caller = isServiceCall ? null : await callerHousehold(authHeader)

  if (!isServiceCall && !caller) {
    return json({ error: 'Non autorisé' }, 401)
  }

  let query = db
    .from('bank_connections')
    .select('*')
    .eq('status', 'active')

  if (caller) query = query.eq('household_id', caller.householdId)

  const { data: connections } = await query

  const report: Record<string, unknown>[] = []

  for (const conn of connections ?? []) {
    try {
      // Alerte si le consentement expire dans ≤ 7 jours.
      if (conn.consent_expires_at) {
        const days = Math.ceil((new Date(conn.consent_expires_at).getTime() - Date.now()) / 86400000)
        if (days <= 7 && days >= 0) {
          await createAlert(db, conn.household_id, 'consent_expiring', { bank: conn.aspsp_name, days })
        }
      }

      const accounts = await provider.getAccounts(conn.external_session_id)

      // Pré-charge catégories + règles du foyer une seule fois.
      const [{ data: categories }, { data: rules }] = await Promise.all([
        db.from('categories').select('id,name').eq('household_id', conn.household_id),
        db.from('categorization_rules').select('match_pattern,category_id,priority').eq('household_id', conn.household_id),
      ])
      const catByName = new Map((categories ?? []).map((c) => [c.name, c.id]))

      let imported = 0
      for (const acc of accounts) {
        // Upsert compte (solde + fraîcheur).
        const { data: accountRow } = await db
          .from('accounts')
          .upsert(
            {
              bank_connection_id: conn.id,
              household_id: conn.household_id,
              external_account_id: acc.externalAccountId,
              name: acc.name,
              iban: acc.iban,
              currency: acc.currency,
              balance: acc.balance,
              balance_updated_at: new Date().toISOString(),
              kind: acc.kind,
            },
            { onConflict: 'bank_connection_id,external_account_id' },
          )
          .select('id')
          .single()

        if (!accountRow) continue

        await db
          .from('goals')
          .update({ current_amount: acc.balance })
          .eq('household_id', conn.household_id)
          .eq('linked_account_id', accountRow.id)

        const txns = await provider.getTransactions(conn.external_session_id, acc.externalAccountId)
        for (const t of txns) {
          const clean = cleanLabel(t.rawLabel)
          const resolved = resolveCategory(categorizeLabel(clean, rules ?? []), catByName)
          const { error, count } = await db.from('transactions').upsert(
            {
              account_id: accountRow.id,
              household_id: conn.household_id,
              external_id: t.externalId,
              booking_date: t.bookingDate,
              amount: t.amount,
              currency: t.currency,
              raw_label: t.rawLabel,
              clean_label: clean,
              category_id: resolved.id,
              category_source: resolved.source,
            },
            { onConflict: 'account_id,external_id', ignoreDuplicates: true, count: 'exact' },
          )
          if (!error && count) {
            imported++
            if (Math.abs(t.amount) >= LARGE_TX_THRESHOLD && t.amount < 0) {
              await createAlert(db, conn.household_id, 'large_transaction', {
                merchant: cleanLabel(t.rawLabel),
                amount: t.amount,
              })
            }
          }
        }
      }

      report.push({ connection: conn.aspsp_name, imported, status: 'ok' })
    } catch (e) {
      await db.from('bank_connections').update({ status: 'error' }).eq('id', conn.id)
      await createAlert(db, conn.household_id, 'sync_error', { bank: conn.aspsp_name })
      report.push({ connection: conn.aspsp_name, status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  }

  return json({ synced: report.length, scope: caller ? 'household' : 'all', report })
})

function resolveCategory(
  result: string | null,
  catByName: Map<string, string>,
): { id: string | null; source: 'auto' | 'rule' } {
  if (!result) return { id: null, source: 'auto' }
  if (result.startsWith('name:')) {
    return { id: catByName.get(result.slice(5)) ?? null, source: 'auto' }
  }
  return { id: result, source: 'rule' } // déjà un id (règle utilisateur)
}

async function createAlert(
  db: ReturnType<typeof adminClient>,
  householdId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  // Évite les doublons d'alerte du même type/jour.
  const since = new Date(Date.now() - 86400000).toISOString()
  const { data: existing } = await db
    .from('alerts')
    .select('id')
    .eq('household_id', householdId)
    .eq('type', type)
    .gte('created_at', since)
    .limit(1)
  if (existing && existing.length > 0 && type !== 'large_transaction') return
  await db.from('alerts').insert({ household_id: householdId, type, payload })
}
