/**
 * Client-side entry point for the bank connection flow.
 * The PWA never talks to the aggregator directly — it only calls the Edge
 * Functions, which hold the secrets and sign requests server-side.
 *
 * Selon l'agrégateur, le retour de SCA peut ne pas contenir de `code`
 * (GoCardless renvoie seulement `?ref=<state>`). On mémorise donc côté front
 * la référence d'autorisation (requisition) + le state renvoyés par
 * `bank-auth-start`, pour les rejouer au callback.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const KEYS = {
  aspspName: 'foyer.bankAuth.aspspName',
  country: 'foyer.bankAuth.country',
  requisition: 'foyer.bankAuth.requisition',
  state: 'foyer.bankAuth.state',
}

export interface AspspChoice {
  name: string
  country: string
}

/** Banques de démonstration (mode sans backend). */
export const demoBanks: AspspChoice[] = [
  { name: 'Crédit Agricole', country: 'FR' },
  { name: 'BoursoBank', country: 'FR' },
  { name: 'Revolut', country: 'FR' },
]

export interface StartAuthResult {
  redirectUrl?: string
  demo?: boolean
  error?: string
}

export interface ManualSyncResult {
  synced: number
  report: Record<string, unknown>[]
  demo?: boolean
}

/** Récupère la liste des banques disponibles auprès de l'agrégateur. */
export async function listInstitutions(country = 'FR'): Promise<AspspChoice[]> {
  if (!isSupabaseConfigured || !supabase) return demoBanks
  const { data, error } = await supabase.functions.invoke('bank-institutions', {
    body: { country },
  })
  if (error) throw new Error(error.message)
  return (data as { aspsps?: AspspChoice[] })?.aspsps ?? []
}

export async function startBankAuth(aspspName: string, country = 'FR'): Promise<StartAuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { demo: true }
  }
  const { data, error } = await supabase.functions.invoke('bank-auth-start', {
    body: { aspspName, aspspCountry: country, redirectAfter: window.location.origin + '/comptes' },
  })
  if (error) return { error: error.message }

  const res = data as { redirectUrl?: string; authReference?: string; state?: string }
  window.sessionStorage.setItem(KEYS.aspspName, aspspName)
  window.sessionStorage.setItem(KEYS.country, country)
  if (res.authReference) window.sessionStorage.setItem(KEYS.requisition, res.authReference)
  if (res.state) window.sessionStorage.setItem(KEYS.state, res.state)
  return { redirectUrl: res.redirectUrl }
}

export interface CompleteBankAuthParams {
  code?: string
  state?: string
}

export interface CompleteBankAuthResult {
  connectionId: string
  accounts: number
}

export function clearPendingBankAuth(): void {
  Object.values(KEYS).forEach((k) => window.sessionStorage.removeItem(k))
}

export async function completeBankAuth({ code, state }: CompleteBankAuthParams): Promise<CompleteBankAuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { connectionId: 'demo', accounts: 0 }
  }

  // `code` peut venir de l'URL (Enable Banking) ou de la requisition mémorisée
  // (GoCardless) ; idem pour le state (URL `state`/`ref` ou mémorisé).
  const finalCode = code || window.sessionStorage.getItem(KEYS.requisition) || ''
  const finalState = state || window.sessionStorage.getItem(KEYS.state) || ''
  const aspspName = window.sessionStorage.getItem(KEYS.aspspName) ?? undefined
  const aspspCountry = window.sessionStorage.getItem(KEYS.country) ?? undefined

  const { data, error } = await supabase.functions.invoke('bank-callback', {
    body: { code: finalCode, state: finalState, aspspName, aspspCountry },
  })
  if (error) throw new Error(error.message)

  const result = data as Partial<CompleteBankAuthResult> | null
  return {
    connectionId: result?.connectionId ?? '',
    accounts: result?.accounts ?? 0,
  }
}

export async function manualBankSync(): Promise<ManualSyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { synced: 0, report: [], demo: true }
  }

  const { data, error } = await supabase.functions.invoke('bank-sync', {
    body: { manual: true },
  })
  if (error) throw new Error(error.message)

  const result = data as Partial<ManualSyncResult> | null
  return {
    synced: result?.synced ?? 0,
    report: result?.report ?? [],
  }
}
