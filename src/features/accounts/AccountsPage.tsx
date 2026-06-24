import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Landmark, Plus, RefreshCw, AlertTriangle, Wallet, PiggyBank, Trash2 } from 'lucide-react'
import { useAccounts, useCompleteBankCallback, useConnections, useDeleteBankConnection, useManualSync } from '@/data/hooks'
import { Button } from '@/components/ui/Button'
import { BalanceStack } from '@/features/dashboard/BalanceStack'
import { ConnectBankSheet } from './ConnectBankSheet'
import { formatMoney, maskIban, formatRelative, isStale, daysUntil } from '@/lib/format'
import { haptic } from '@/lib/haptics'

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

  const lastSync = accounts.length
    ? accounts.reduce((latest, a) => (a.balanceUpdatedAt > latest ? a.balanceUpdatedAt : latest), accounts[0].balanceUpdatedAt)
    : new Date().toISOString()
  const stale = accounts.length > 0 && isStale(lastSync)

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
    haptic('success')
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
    haptic('warning')
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
      <div className="accounts-refresh-row rise" style={{ animationDelay: '10ms' }}>
        <button
          className="pill"
          onClick={refreshNow}
          disabled={sync.isPending || callback.isPending || connections.length === 0}
        >
          <RefreshCw size={13} className={sync.isPending || callback.isPending ? 'spin' : undefined} /> Rafraîchir
        </button>
      </div>

      {/* Deck patrimoine : carte foyer (total) + une carte par compte, avec bulles. */}
      <BalanceStack
        accounts={accounts}
        lastSync={lastSync}
        stale={stale}
        showFlows={false}
        householdLabel="Patrimoine consolidé"
        householdSub={`${accounts.length} compte${accounts.length > 1 ? 's' : ''} · ${connections.length} banque${connections.length > 1 ? 's' : ''}`}
        onOpenAccounts={() => {}}
      />

      {syncMessage && <p className="accounts-sync-note">{syncMessage}</p>}

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
              {accs.length === 0 && (
                <div className="account-row account-empty">
                  <span className="account-icon account-icon-warn"><AlertTriangle size={18} /></span>
                  <div className="account-main">
                    <span className="account-name">Aucun compte synchronisé</span>
                    <span className="account-iban">Supprimez puis reconnectez en validant la sélection des comptes dans votre banque.</span>
                  </div>
                </div>
              )}
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
