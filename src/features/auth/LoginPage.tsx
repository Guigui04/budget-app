import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useSession } from '@/store/session'
import { isSupabaseConfigured } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

export function LoginPage() {
  const { status, signIn, signUp, signInDemo, error } = useSession()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  if (status === 'authenticated') return <Navigate to="/" replace />
  if (status === 'onboarding') return <Navigate to="/bienvenue" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email, password)
        if (needsConfirmation) {
          setNotice('Compte créé. Vérifiez votre e-mail pour confirmer, puis connectez-vous.')
        }
      } else {
        await signIn(email, password)
      }
    } catch {
      // L'erreur est déjà exposée via le store (error).
    } finally {
      setBusy(false)
    }
  }

  const submitLabel = busy
    ? mode === 'signup' ? 'Création…' : 'Connexion…'
    : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'

  return (
    <div className="login">
      <div className="login-theme">
        <ThemeToggle variant="icon" />
      </div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="login-brand">
          <span className="login-mark" aria-hidden="true"><Sparkles size={28} /></span>
          <h1 className="login-title">Foyer</h1>
          <p className="login-tagline">Le budget du foyer, en un coup d’œil.</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === 'signup' ? 6 : undefined}
              required
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          {notice && <p className="login-note">{notice}</p>}
          <Button type="submit" block disabled={busy}>
            {submitLabel}
          </Button>
        </form>

        <p className="login-switch">
          {mode === 'signin' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
          <button
            type="button"
            className="login-switch-btn"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
              setNotice(null)
            }}
          >
            {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>

        <div className="login-sep"><span>ou</span></div>

        <Button variant="ghost" block onClick={signInDemo}>
          <Sparkles size={18} /> Explorer en mode démo
        </Button>

        {!isSupabaseConfigured && (
          <p className="login-note">
            Aucun projet Supabase configuré — l’app tourne sur un foyer de démonstration.
            Renseignez <code>VITE_SUPABASE_URL</code> pour brancher vos vraies données.
          </p>
        )}
      </motion.div>

      <p className="login-foot">Distribué en privé · usage strictement personnel</p>
    </div>
  )
}
