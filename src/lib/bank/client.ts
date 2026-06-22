/**
 * Client-side entry point for the bank connection flow.
 * The PWA never talks to Enable Banking directly — it only calls the
 * `bank-auth-start` Edge Function, which signs the JWT server-side and returns
 * a redirect URL to the bank's SCA page.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const pendingAspspKey = 'foyer.bankAuth.aspspId'

export interface AspspChoice {
  id: string
  name: string
  country: string
}

export const supportedBanks: AspspChoice[] = [
  { id: 'credit-agricole', name: 'Crédit Agricole', country: 'FR' },
  { id: 'boursobank', name: 'BoursoBank', country: 'FR' },
  { id: 'revolut', name: 'Revolut', country: 'FR' },
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

export async function startBankAuth(aspspId: string): Promise<StartAuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { demo: true }
  }
  window.sessionStorage.setItem(pendingAspspKey, aspspId)
  const { data, error } = await supabase.functions.invoke('bank-auth-start', {
    body: { aspspId, redirectAfter: window.location.origin + '/comptes' },
  })
  if (error) return { error: error.message }
  return { redirectUrl: (data as { redirectUrl?: string })?.redirectUrl }
}

export interface CompleteBankAuthParams {
  code: string
  state: string
  aspspId?: string | null
}

export interface CompleteBankAuthResult {
  connectionId: string
  accounts: number
}

export function readPendingAspspId(): string | null {
  return window.sessionStorage.getItem(pendingAspspKey)
}

export function clearPendingAspspId(): void {
  window.sessionStorage.removeItem(pendingAspspKey)
}

export async function completeBankAuth({
  code,
  state,
  aspspId,
}: CompleteBankAuthParams): Promise<CompleteBankAuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { connectionId: 'demo', accounts: 0 }
  }

  const { data, error } = await supabase.functions.invoke('bank-callback', {
    body: { code, state, aspspId: aspspId ?? readPendingAspspId() },
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
