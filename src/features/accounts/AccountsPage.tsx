import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Landmark, Plus, RefreshCw, AlertTriangle, Wallet, PiggyBank, Trash2 } from 'lucide-react'
import { useAccounts, useCompleteBankCallback, useConnections, useDeleteBankConnection, useManualSync } from '@/data/hooks'
import { totalBalance } from '@/data/selectors'
import { Button } from '@/components/ui/Button'
import { ConnectBankSheet } from './ConnectBankSheet'
import { formatMoney, formatBalanceParts, maskIban, formatRelative, isStale, daysUntil } from '@/lib/format'

export function AccountsPage() {
  const { data: accounts = [] } = useAccounts()
  const { data: connections = [] } = useConnections()
  const sync = useManualSync()
  const callback = useCompleteBankCallback()
  const deleteConnection = useDeleteBankConnection()
  const [searchParams, setSearchParams] = useSearchParams()
  const handledCallback = useRef(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const grouped = useMemo(
    () =>
      connections.map((conn) => ({
        connection: conn,
        accounts: accounts.filter((a) => a.bankConnectionId === conn.id),
      })),
    [connections, accounts],
  )

  const total = totalBalance(accounts)

  useEffect(() => {
    const code = searchParams.get('code')
    // Enable Banking renvoie `state` ; GoCardless renvoie `ref` (= notre state).
    const state = searchParams.get('state') ?? searchParams.get('ref')
    const error = searchParams.get('error')

    if (handledCallback.current) return
    if (error) {
      handledCallback.current = true
      queueMicrotask(() => setSyncMessage('Connexion bancaire annulée ou refusée.'))
      setSearchParams({}, { replace: true })
      return
    }
    // Retour de banque détecté dès qu'un code (EB) ou un state/ref (GoCardless)
    // est présent ; le code GoCardless (requisition) est restauré côté client.
    if (!code && !state) return

    handledCallback.current = true
    queueMicrotask(() => setSyncMessage('Finalisation de la connexion bancaire…'))
    callback.mutate(
      { code: code ?? undefined, state: state ?? undefined },
      {
        onSuccess: (result) => {
          setSyncMessage(`${result.accounts} compte${result.accounts > 1 ? 's' : ''} ajouté${result.accounts > 1 ? 's' : ''}.`)
          setSearchParams({}, { replace: true })
        },
        onError: (err) => {
          setSyncMessage(err instanceof Error ? err.message : 'Connexion bancaire impossible.')
          setSearchParams({}, { replace: true })
        },
      },
    )
  }, [callback, searchParams, setSearchParams])

  function refreshNow() {
    setSyncMessage(null)
    sync.mutate(undefined, {
      onSuccess: (result) => {
        if (result.demo) setSyncMessage('Données de démo actualisées.')
        else if (result.synced > 0) setSyncMessage('Synchronisation terminée.')
        else setSyncMessage('Aucune banque active à synchroniser.')
      },
      onError: (error) => {
        setSyncMessage(error instanceof Error ? error.message : 'La synchronisation a échoué.')
      },
    })
  }

  function removeConnection(connectionId: string, bankName: string) {
    const confirmed = window.confirm(
      `Supprimer ${bankName} ? Les comptes, transactions et données associées à cette connexion seront supprimés.`,
    )
    if (!confirmed) return

    deleteConnection.mutate(connectionId, {
      onSuccess: () => setSyncMessage(`${bankName} supprimée.`),
      onError: (error) => {
        setSyncMessage(error instanceof Error ? error.message : 'Suppression impossible.')
      },
    })
  }

  return (
    <div className="page">
      <section className="hero-card accounts-hero rise" style={{ animationDelay: '20ms' }}>
        <div className="hero-top">
          <span className="section-label">Patrimoine consolidé</span>
          <button
            className="hero-refresh"
            onClick={refreshNow}
            disabled={sync.isPending || callback.isPending || connections.length === 0}
            aria-label="Rafraîchir"
          >
            <RefreshCw size={18} className={sync.isPending || callback.isPending ? 'spin' : undefined} />
          </button>
        </div>
        <div className="hero-amount num">
          {(() => { const b = formatBalanceParts(total); return <>{b.sign}{b.whole}<span className="hero-amount-cents">,{b.cents} €</span></> })()}
        </div>
        <span className="hero-fresh">{accounts.length} compte{accounts.length > 1 ? 's' : ''} · {connections.length} banque{connections.length > 1 ? 's' : ''}</span>
        {syncMessage && <p className="hero-sync-note">{syncMessage}</p>}
      </section>

      {grouped.map(({ connection, accounts: accs }, i) => {
        const consentDays = daysUntil(connection.consentExpiresAt)
        const expiringSoon = consentDays <= 7
        return (
          <section key={connection.id} className="rise bank-group" style={{ animationDelay: `${40 + i * 50}ms` }}>
            <div className="bank-head">
              <span className="bank-logo"><Landmark size={18} /></span>
              <div className="bank-titles">
                <span className="bank-name">{connection.aspspName}</span>
                <span className="bank-sub">consentement · {consentDays > 0 ? `${consentDays} j restants` : 'expiré'}</span>
              </div>
              {expiringSoon && (
                <button className="pill pill-amber"><RefreshCw size={13} /> Reconnecter</button>
              )}
              <button
                className="pill pill-danger"
                onClick={() => removeConnection(connection.id, connection.aspspName)}
                disabled={deleteConnection.isPending}
              >
                <Trash2 size={13} /> Supprimer
              </button>
            </div>
            <div className="card stack-rows">
              {accs.map((a) => {
                const stale = isStale(a.balanceUpdatedAt)
                return (
                  <div key={a.id} className="account-row">
                    <span className="account-icon">{a.kind === 'savings' ? <PiggyBank size={18} /> : <Wallet size={18} />}</span>
                    <div className="account-main">
                      <span className="account-name">{a.name}</span>
                      <span className="account-iban num">{maskIban(a.iban)}</span>
                    </div>
                    <div className="account-right">
                      <span className="account-balance num">{formatMoney(a.balance, a.currency)}</span>
                      <span className={`account-fresh ${stale ? 'stale' : ''}`}>
                        {stale && <AlertTriangle size={11} />} {formatRelative(a.balanceUpdatedAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <Button variant="ghost" block style={{ marginTop: 8 }} onClick={() => setConnectOpen(true)}>
        <Plus size={18} /> Connecter une banque
      </Button>

      <ConnectBankSheet open={connectOpen} onClose={() => setConnectOpen(false)} />
    </div>
  )
}
