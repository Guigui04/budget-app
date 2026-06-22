/**
 * EnableBankingProvider — implémentation de BankProvider via Enable Banking (AISP).
 * Lecture seule (AIS). Le JWT RS256 est signé ICI, côté serveur uniquement,
 * avec la clé privée RSA stockée dans les secrets de l'Edge Function.
 * La clé privée ne doit JAMAIS quitter ce contexte.
 */
import type {
  AspspInfo,
  BankAccount,
  BankProvider,
  BankTransaction,
  CreateSessionResult,
  StartAuthParams,
  StartAuthResult,
} from './bankProvider.ts'

const API_BASE = Deno.env.get('ENABLE_BANKING_API_BASE') ?? 'https://api.enablebanking.com'

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToBinary(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '')
  const raw = atob(body)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

/** Signs the short-lived RS256 JWT used as the Bearer token for the API. */
async function buildJwt(): Promise<string> {
  const appId = Deno.env.get('ENABLE_BANKING_APP_ID')!
  const privateKeyPem = Deno.env.get('ENABLE_BANKING_PRIVATE_KEY')!

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const now = Math.floor(Date.now() / 1000)
  const header = { typ: 'JWT', alg: 'RS256', kid: appId }
  const payload = { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 }

  const enc = (obj: unknown) => b64url(new TextEncoder().encode(JSON.stringify(obj)))
  const signingInput = `${enc(header)}.${enc(payload)}`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  )
  return `${signingInput}.${b64url(new Uint8Array(signature))}`
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await buildJwt()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    // Ne jamais logguer le corps brut (peut contenir des données sensibles).
    throw new Error(`Enable Banking ${path} → ${res.status}`)
  }
  return (await res.json()) as T
}

export class EnableBankingProvider implements BankProvider {
  async listAspsps(country = 'FR'): Promise<AspspInfo[]> {
    const data = await api<{ aspsps: { name: string; country: string }[] }>(`/aspsps?country=${country}`)
    return data.aspsps.map((a) => ({ name: a.name, country: a.country }))
  }

  async startAuth(p: StartAuthParams): Promise<StartAuthResult> {
    const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    const data = await api<{ url: string; authorization_id?: string }>(`/auth`, {
      method: 'POST',
      body: JSON.stringify({
        access: { valid_until: validUntil },
        aspsp: { name: p.aspspName, country: p.aspspCountry },
        state: p.state,
        redirect_url: p.redirectUrl,
        psu_type: 'personal',
      }),
    })
    return { redirectUrl: data.url, authReference: data.authorization_id }
  }

  async createSession(authCode: string): Promise<CreateSessionResult> {
    const data = await api<{
      session_id: string
      accounts: { uid: string }[]
      access: { valid_until: string }
    }>(`/sessions`, { method: 'POST', body: JSON.stringify({ code: authCode }) })

    const accounts = await Promise.all(data.accounts.map((a) => this.describeAccount(data.session_id, a.uid)))
    return { sessionId: data.session_id, accounts, consentExpiresAt: data.access.valid_until }
  }

  async getAccounts(sessionId: string): Promise<BankAccount[]> {
    const data = await api<{ accounts: { uid: string }[] }>(`/sessions/${sessionId}`)
    return Promise.all(data.accounts.map((a) => this.describeAccount(sessionId, a.uid)))
  }

  private async describeAccount(_sessionId: string, accountUid: string): Promise<BankAccount> {
    const details = await api<{
      account_id?: { iban?: string }
      name?: string
      currency?: string
      cash_account_type?: string
    }>(`/accounts/${accountUid}/details`)
    const balances = await api<{ balances: { balance_amount: { amount: string }; balance_type: string }[] }>(
      `/accounts/${accountUid}/balances`,
    )
    const main = balances.balances.find((b) => b.balance_type === 'CLBD') ?? balances.balances[0]
    return {
      externalAccountId: accountUid,
      name: details.name ?? 'Compte',
      iban: details.account_id?.iban,
      currency: details.currency ?? 'EUR',
      balance: Number(main?.balance_amount.amount ?? 0),
      kind: details.cash_account_type === 'SVGS' ? 'savings' : 'checking',
    }
  }

  async getTransactions(_sessionId: string, accountId: string, dateFrom?: string): Promise<BankTransaction[]> {
    const qs = dateFrom ? `?date_from=${dateFrom}` : ''
    const data = await api<{
      transactions: {
        entry_reference?: string
        transaction_amount: { amount: string; currency: string }
        credit_debit_indicator: 'CRDT' | 'DBIT'
        booking_date: string
        remittance_information?: string[]
      }[]
    }>(`/accounts/${accountId}/transactions${qs}`)

    return data.transactions.map((t, i) => {
      const value = Number(t.transaction_amount.amount)
      const signed = t.credit_debit_indicator === 'DBIT' ? -Math.abs(value) : Math.abs(value)
      return {
        externalId: t.entry_reference ?? `${t.booking_date}-${i}-${value}`,
        bookingDate: t.booking_date,
        amount: signed,
        currency: t.transaction_amount.currency,
        rawLabel: (t.remittance_information ?? []).join(' ').trim() || 'Opération',
      }
    })
  }
}
