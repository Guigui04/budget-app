import { useMemo, useState } from 'react'
import { Landmark, ShieldCheck, ChevronRight, Search } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { startBankAuth } from '@/lib/bank/client'
import { useInstitutions } from '@/data/hooks'

interface Props {
  open: boolean
  onClose: () => void
}

export function ConnectBankSheet({ open, onClose }: Props) {
  const { data: banks = [], isLoading, isError } = useInstitutions('FR')
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return banks
    return banks.filter((b) => b.name.toLowerCase().includes(q))
  }, [banks, query])

  async function connect(name: string, country: string) {
    setBusy(name)
    setError(null)
    const res = await startBankAuth(name, country)
    setBusy(null)
    if (res.redirectUrl) {
      window.location.assign(res.redirectUrl)
    } else if (res.error) {
      setError(res.error)
    } else if (res.demo) {
      setError('Mode démo : connectez un projet Supabase pour une vraie connexion bancaire.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Connecter une banque">
      <div className="consent-note">
        <ShieldCheck size={18} />
        <p>
          Lecture seule (DSP2). Vous serez redirigé vers votre banque pour valider l’accès.
          Aucune donnée d’identification ne transite par l’app.
        </p>
      </div>

      <div className="bank-search">
        <Search size={16} />
        <input
          className="bank-search-input"
          placeholder="Rechercher votre banque…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {isLoading && <p className="consent-demo">Chargement des banques…</p>}
      {isError && <p className="sync-note error">Impossible de charger la liste des banques.</p>}
      {error && <p className="sync-note error">{error}</p>}

      <div className="bank-pick-list">
        {filtered.map((b) => (
          <button
            key={b.name}
            className="bank-pick"
            onClick={() => connect(b.name, b.country)}
            disabled={busy !== null}
          >
            <span className="bank-logo"><Landmark size={18} /></span>
            <span className="bank-pick-name">{b.name}</span>
            {busy === b.name ? <span className="bank-pick-loading">…</span> : <ChevronRight size={18} />}
          </button>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="consent-demo">Aucune banque ne correspond à « {query} ».</p>
        )}
      </div>
    </Sheet>
  )
}
