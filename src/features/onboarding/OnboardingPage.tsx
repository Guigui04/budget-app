import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Copy, Sparkles, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useSession } from '@/store/session'

type OnboardingMode = 'create' | 'join'
type BusyAction = 'create' | 'join' | 'continue' | null

export function OnboardingPage() {
  const navigate = useNavigate()
  const status = useSession((s) => s.status)
  const user = useSession((s) => s.user)
  const initialize = useSession((s) => s.initialize)
  const createHousehold = useSession((s) => s.createHousehold)
  const joinHousehold = useSession((s) => s.joinHousehold)

  const [mode, setMode] = useState<OnboardingMode>('create')
  const [householdName, setHouseholdName] = useState(() =>
    user?.displayName ? `Foyer de ${user.displayName}` : 'Notre foyer',
  )
  const [inviteCode, setInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState<BusyAction>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true })
  }, [navigate, status])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setBusy('create')
    setError(null)
    setCopied(false)
    try {
      const code = await createHousehold(householdName)
      setInviteCode(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le foyer.')
    } finally {
      setBusy(null)
    }
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault()
    setBusy('join')
    setError(null)
    try {
      await joinHousehold(joinCode)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de rejoindre ce foyer.')
    } finally {
      setBusy(null)
    }
  }

  async function copyInviteCode() {
    if (!inviteCode) return
    if ('clipboard' in navigator) await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
  }

  async function continueToApp() {
    setBusy('continue')
    setError(null)
    try {
      await initialize()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ouvrir le foyer.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="onboarding">
      <div className="login-theme">
        <ThemeToggle variant="icon" />
      </div>

      <section className="onboarding-card rise">
        <div className="onboarding-brand">
          <span className="login-mark" aria-hidden="true"><Sparkles size={28} /></span>
          <span className="section-label">Première connexion</span>
          <h1 className="onboarding-title">Votre foyer</h1>
          <p>Créez un espace commun ou rejoignez celui de votre partenaire avec son code.</p>
        </div>

        <div className="onboarding-choice" role="tablist" aria-label="Choix du foyer">
          <button
            type="button"
            className={mode === 'create' ? 'active' : ''}
            onClick={() => setMode('create')}
            role="tab"
            aria-selected={mode === 'create'}
          >
            <Users size={17} /> Créer
          </button>
          <button
            type="button"
            className={mode === 'join' ? 'active' : ''}
            onClick={() => setMode('join')}
            role="tab"
            aria-selected={mode === 'join'}
          >
            <UserPlus size={17} /> Rejoindre
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={onCreate}>
            <div className="field">
              <label htmlFor="household-name">Nom du foyer</label>
              <input
                id="household-name"
                className="input"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Notre foyer"
                autoComplete="organization"
              />
            </div>

            {inviteCode ? (
              <div className="invite-panel">
                <span className="section-label">Code d'invitation</span>
                <button type="button" className="invite-code" onClick={copyInviteCode}>
                  <span>{inviteCode}</span>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
                <p>Partagez ce code à la deuxième personne, puis continuez.</p>
                <Button type="button" block onClick={continueToApp} disabled={busy === 'continue'}>
                  {busy === 'continue' ? 'Ouverture…' : <>Entrer dans Foyer <ArrowRight size={18} /></>}
                </Button>
              </div>
            ) : (
              <Button type="submit" block disabled={busy === 'create'}>
                {busy === 'create' ? 'Création…' : 'Créer notre foyer'}
              </Button>
            )}
          </form>
        ) : (
          <form onSubmit={onJoin}>
            <div className="field">
              <label htmlFor="invite-code">Code reçu</label>
              <input
                id="invite-code"
                className="input invite-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                placeholder="ex. a1b2c3d4"
                autoCapitalize="none"
                autoComplete="one-time-code"
              />
            </div>
            <Button type="submit" block disabled={busy === 'join'}>
              {busy === 'join' ? 'Connexion…' : 'Rejoindre le foyer'}
            </Button>
          </form>
        )}

        {error && <p className="onboarding-error">{error}</p>}
      </section>
    </div>
  )
}
