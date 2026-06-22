/**
 * BankProvider — couche d'abstraction OBLIGATOIRE (cf. cahier des charges §4).
 * Aucune partie de l'app ou du backend ne doit appeler un agrégateur « en dur ».
 * Pour changer d'agrégateur (Powens, Bridge…), il suffit d'implémenter cette
 * interface ; aucune autre partie du code ne change.
 */

export interface AspspInfo {
  name: string
  country: string
}

export interface BankAccount {
  externalAccountId: string
  name: string
  iban?: string
  currency: string
  balance: number
  kind: 'checking' | 'savings'
}

export interface BankTransaction {
  externalId: string
  bookingDate: string // YYYY-MM-DD
  amount: number // négatif = débit
  currency: string
  rawLabel: string
}

export interface StartAuthParams {
  aspspName: string
  aspspCountry: string
  redirectUrl: string
  state: string
}

export interface StartAuthResult {
  redirectUrl: string
  authReference?: string
}

export interface CreateSessionResult {
  sessionId: string
  accounts: BankAccount[]
  consentExpiresAt: string
}

export interface BankProvider {
  /** Liste des banques disponibles (ASPSP). */
  listAspsps(country?: string): Promise<AspspInfo[]>
  /** Démarre le consentement → URL de redirection SCA. */
  startAuth(params: StartAuthParams): Promise<StartAuthResult>
  /** Échange le code de retour contre une session + comptes. */
  createSession(authCode: string): Promise<CreateSessionResult>
  /** Comptes d'une session existante. */
  getAccounts(sessionId: string): Promise<BankAccount[]>
  /** Transactions d'un compte (depuis `dateFrom` si fourni). */
  getTransactions(sessionId: string, accountId: string, dateFrom?: string): Promise<BankTransaction[]>
}
