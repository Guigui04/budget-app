/**
 * GoCardlessProvider — implémentation de BankProvider via GoCardless Bank
 * Account Data (ex-Nordigen), offre gratuite. Lecture seule (AIS).
 *
 * Modèle « requisition » : on crée une requisition (consentement) → l'utilisateur
 * est redirigé vers sa banque → au retour, la requisition contient les comptes.
 * L'identifiant de requisition tient lieu de `sessionId` (stocké en
 * `bank_connections.external_session_id`).
 *
 * Secrets requis (Edge Function) : GOCARDLESS_SECRET_ID, GOCARDLESS_SECRET_KEY.
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

const API_BASE = Deno.env.get('GOCARDLESS_API_BASE') ?? 'https://bankaccountdata.gocardless.com/api/v2'
const CONSENT_DAYS = 90

interface Institution {
  id: string
  name: string
}

interface GcTransaction {
  transactionId?: string
  internalTransactionId?: string
  bookingDate?: string
  valueDate?: string
  transactionAmount: { amount: string; currency: string }
  remittanceInformationUnstructured?: string
  remittanceInformationUnstructuredArray?: string[]
  creditorName?: string
  debtorName?: string
}

// Jeton d'accès mémorisé le temps de vie de l'instance de fonction.
let cachedToken: { access: string; expiresAt: number } | null = null

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.access
  const res = await fetch(`${API_BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      secret_id: Deno.env.get('GOCARDLESS_SECRET_ID'),
      secret_key: Deno.env.get('GOCARDLESS_SECRET_KEY'),
    }),
  })
  if (!res.ok) throw new Error(`GoCardless token → ${res.status}`)
  const data = (await res.json()) as { access: string; access_expires?: number }
  cachedToken = { access: data.access, expiresAt: Date.now() + (data.access_expires ?? 3600) * 1000 }
  return cachedToken.access
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    // Ne jamais logguer le corps brut (peut contenir des données sensibles).
    throw new Error(`GoCardless ${path} → ${res.status}`)
  }
  return (await res.json()) as T
}

export class GoCardlessProvider implements BankProvider {
  async listAspsps(country = 'FR'): Promise<AspspInfo[]> {
    const data = await api<Institution[]>(`/institutions/?country=${country.toLowerCase()}`)
    return data
      .map((i) => ({ name: i.name, country: country.toUpperCase() }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  async startAuth(p: StartAuthParams): Promise<StartAuthResult> {
    const country = (p.aspspCountry || 'FR').toLowerCase()
    const institutions = await api<Institution[]>(`/institutions/?country=${country}`)
    const match =
      institutions.find((i) => i.name === p.aspspName) ??
      institutions.find((i) => i.name.toLowerCase() === p.aspspName.toLowerCase())
    if (!match) throw new Error(`Institution introuvable : ${p.aspspName}`)

    const requisition = await api<{ id: string; link: string }>(`/requisitions/`, {
      method: 'POST',
      body: JSON.stringify({
        redirect: p.redirectUrl,
        institution_id: match.id,
        reference: p.state,
        user_language: 'FR',
      }),
    })
    return { redirectUrl: requisition.link, authReference: requisition.id }
  }

  async createSession(requisitionId: string): Promise<CreateSessionResult> {
    const accounts = await this.getAccounts(requisitionId)
    const consentExpiresAt = new Date(Date.now() + CONSENT_DAYS * 86_400_000).toISOString()
    return { sessionId: requisitionId, accounts, consentExpiresAt }
  }

  async getAccounts(requisitionId: string): Promise<BankAccount[]> {
    const req = await api<{ accounts?: string[] }>(`/requisitions/${requisitionId}/`)
    return Promise.all((req.accounts ?? []).map((id) => this.describeAccount(id)))
  }

  private async describeAccount(accountId: string): Promise<BankAccount> {
    const details = await api<{
      account?: {
        iban?: string
        name?: string
        currency?: string
        product?: string
        ownerName?: string
        cashAccountType?: string
      }
    }>(`/accounts/${accountId}/details/`)
    const balances = await api<{
      balances?: { balanceAmount: { amount: string; currency: string }; balanceType: string }[]
    }>(`/accounts/${accountId}/balances/`)

    const acc = details.account ?? {}
    const list = balances.balances ?? []
    const main =
      list.find((b) => b.balanceType === 'closingBooked') ??
      list.find((b) => b.balanceType === 'interimAvailable') ??
      list.find((b) => b.balanceType === 'expected') ??
      list[0]

    return {
      externalAccountId: accountId,
      name: acc.name ?? acc.product ?? acc.ownerName ?? 'Compte',
      iban: acc.iban,
      currency: acc.currency ?? main?.balanceAmount.currency ?? 'EUR',
      balance: Number(main?.balanceAmount.amount ?? 0),
      kind: acc.cashAccountType === 'SVGS' ? 'savings' : 'checking',
    }
  }

  async getTransactions(_sessionId: string, accountId: string, dateFrom?: string): Promise<BankTransaction[]> {
    const qs = dateFrom ? `?date_from=${dateFrom}` : ''
    const data = await api<{ transactions?: { booked?: GcTransaction[] } }>(
      `/accounts/${accountId}/transactions/${qs}`,
    )
    const booked = data.transactions?.booked ?? []
    return booked.map((t, i) => {
      const amount = Number(t.transactionAmount.amount)
      const label =
        t.remittanceInformationUnstructured ??
        (t.remittanceInformationUnstructuredArray ?? []).join(' ') ??
        t.creditorName ??
        t.debtorName ??
        ''
      return {
        externalId:
          t.transactionId ?? t.internalTransactionId ?? `${t.bookingDate ?? ''}-${i}-${t.transactionAmount.amount}`,
        bookingDate: t.bookingDate ?? t.valueDate ?? '',
        amount,
        currency: t.transactionAmount.currency,
        rawLabel: label.trim() || (amount < 0 ? 'Débit' : 'Crédit'),
      }
    })
  }
}
