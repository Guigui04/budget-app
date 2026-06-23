import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useSession } from '@/store/session'
import { useAlerts } from '@/data/hooks'
import { haptic } from '@/lib/haptics'

interface TopBarProps {
  title: string
  greeting?: string
  isHome?: boolean
}

export function TopBar({ title, greeting, isHome }: TopBarProps) {
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const { data: alerts = [] } = useAlerts()
  const unread = alerts.filter((a) => !a.isRead).length

  return (
    <header className="topbar">
      <button
        className="topbar-id"
        aria-label="Réglages"
        onClick={() => { haptic('tap'); navigate('/reglages') }}
      >
        {user && <Avatar name={user.displayName} color={user.avatarColor} size={44} />}
        <span className="topbar-id-text">
          {isHome && greeting ? (
            <>
              <span className="topbar-greeting">{greeting}</span>
              <span className="topbar-name">{user?.displayName}</span>
            </>
          ) : (
            <span className="topbar-page">{title}</span>
          )}
        </span>
      </button>

      <button
        className="icon-btn"
        aria-label="Notifications"
        onClick={() => { haptic('tap'); navigate('/alertes') }}
      >
        <Bell size={20} />
        {unread > 0 && <span className="badge-dot" />}
      </button>
    </header>
  )
}
