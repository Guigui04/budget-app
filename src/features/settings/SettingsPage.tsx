import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Palette, Landmark, ShieldCheck, LogOut, Smartphone, ChevronRight, UserRound } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Avatar } from '@/components/ui/Avatar'
import { useSession } from '@/store/session'
import { usePrefs } from '@/store/prefs'
import { useSavePushSubscription, useUpdateProfile } from '@/data/hooks'
import { demoUsers } from '@/data/demo'
import { requestPushSubscription, type PushOutcome } from '@/lib/push'
import { Button } from '@/components/ui/Button'
import { PinSettings } from './PinSettings'
import type { AlertType } from '@/types'

const alertLabels: Record<AlertType, string> = {
  budget_exceeded: 'Dépassement de budget',
  budget_warning: 'Budget bientôt atteint',
  large_transaction: 'Grosse transaction',
  new_subscription: 'Nouvel abonnement',
  consent_expiring: 'Consentement bancaire',
  sync_error: 'Échec de synchronisation',
}

const pushMessage: Record<PushOutcome, string> = {
  granted: 'Notifications activées ✓',
  denied: 'Permission refusée — activez-la dans les réglages du navigateur.',
  unsupported: 'Notifications non supportées sur cet appareil.',
  'needs-install': "Sur iPhone : ajoutez l'app à l'écran d'accueil, puis ouvrez-la pour activer les notifications.",
  'missing-key': 'Clé publique VAPID manquante. Ajoutez VITE_VAPID_PUBLIC_KEY dans les variables.',
  'save-error': "L'abonnement n'a pas pu être enregistré.",
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, household, signOut, initialize } = useSession()
  const { alertPrefs, toggleAlert } = usePrefs()
  const savePush = useSavePushSubscription()
  const updateProfile = useUpdateProfile()
  const [pushState, setPushState] = useState<PushOutcome | null>(null)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [householdName, setHouseholdName] = useState(household?.name ?? '')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  async function enablePush() {
    const result = await requestPushSubscription()
    if (result.outcome !== 'granted' || !result.subscription) {
      setPushState(result.outcome)
      return
    }

    try {
      await savePush.mutateAsync(result.subscription)
      await initialize()
      setPushState('granted')
    } catch {
      setPushState('save-error')
    }
  }

  async function saveProfile() {
    if (!user) return
    setProfileMessage(null)
    try {
      const result = await updateProfile.mutateAsync({
        userId: user.id,
        displayName,
        householdId: household?.id ?? null,
        householdName,
      })
      if (!result.demo) await initialize()
      setProfileMessage('Profil mis à jour.')
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Mise à jour impossible.')
    }
  }

  return (
    <div className="page settings">
      <section className="card card-pad household-card rise">
        <span className="section-label">Foyer partagé</span>
        <div className="household-members">
          {demoUsers.map((u) => (
            <div key={u.id} className="member">
              <Avatar name={u.displayName} color={u.avatarColor} size={44} />
              <span>{u.displayName}</span>
              {u.id === user?.id && <span className="member-you">vous</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="settings-group rise" style={{ animationDelay: '25ms' }}>
        <div className="settings-head"><UserRound size={16} /> Profil</div>
        <div className="card card-pad profile-form">
          <div className="field">
            <label htmlFor="display-name">Nom affiché</label>
            <input
              id="display-name"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom"
            />
          </div>
          <div className="field">
            <label htmlFor="household-name">Nom du foyer</label>
            <input
              id="household-name"
              className="input"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Notre foyer"
            />
          </div>
          <Button block onClick={saveProfile} disabled={updateProfile.isPending || !displayName.trim()}>
            {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          {profileMessage && <p className="profile-note">{profileMessage}</p>}
        </div>
      </section>

      <section className="settings-group rise" style={{ animationDelay: '50ms' }}>
        <div className="settings-head"><Palette size={16} /> Apparence</div>
        <div className="card card-pad settings-row-between">
          <span>Thème</span>
          <ThemeToggle />
        </div>
      </section>

      <section className="settings-group rise" style={{ animationDelay: '100ms' }}>
        <div className="settings-head"><Bell size={16} /> Notifications</div>
        <div className="card">
          <button className="settings-row" onClick={enablePush} disabled={savePush.isPending}>
            <Smartphone size={18} />
            <span className="settings-row-label">
              {savePush.isPending
                ? 'Activation…'
                : user?.hasPushSubscription ? 'Notifications push actives' : 'Activer les notifications push'}
            </span>
            <ChevronRight size={18} />
          </button>
          {pushState && <p className="push-status">{pushMessage[pushState]}</p>}
          <div className="settings-divider" />
          {(Object.keys(alertLabels) as AlertType[]).map((type) => (
            <div key={type} className="settings-row">
              <span className="settings-row-label">{alertLabels[type]}</span>
              <button
                className={`toggle ${alertPrefs[type] ? 'on' : ''}`}
                onClick={() => toggleAlert(type)}
                aria-label={alertLabels[type]}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-group rise" style={{ animationDelay: '150ms' }}>
        <div className="settings-head"><Landmark size={16} /> Banques & données</div>
        <div className="card">
          <button className="settings-row" onClick={() => navigate('/comptes')}>
            <Landmark size={18} />
            <span className="settings-row-label">Comptes connectés</span>
            <ChevronRight size={18} />
          </button>
          <div className="settings-divider" />
          <PinSettings />
        </div>
      </section>

      <section className="settings-group rise" style={{ animationDelay: '200ms' }}>
        <div className="card card-pad security-note">
          <ShieldCheck size={18} />
          <p>Lecture seule · données cloisonnées par foyer (RLS) · aucun secret stocké sur l’appareil.</p>
        </div>
      </section>

      <button className="signout-btn rise" style={{ animationDelay: '240ms' }} onClick={() => { signOut(); navigate('/login') }}>
        <LogOut size={18} /> Se déconnecter
      </button>

      <p className="version-note">Foyer · v1.0 · distribué en privé</p>
    </div>
  )
}
