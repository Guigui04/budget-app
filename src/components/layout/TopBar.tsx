import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useSession } from '@/store/session'
import { useAlerts } from '@/data/hooks'

interface TopBarProps {
  title: string
  greeting?: string
}

export function TopBar({ title, greeting }: TopBarProps) {
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const { data: alerts = [] } = useAlerts()
  const unread = alerts.filter((a) => !a.isRead).length

  return (
    <header className="topbar">
      <div className="topbar-title">
        {greeting && <span className="topbar-greeting">{greeting}</span>}
        <span className="topbar-page">{title}</span>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" aria-label="Notifications" onClick={() => navigate('/alertes')}>
          <Bell size={20} />
          {unread > 0 && <span className="badge-dot" />}
        </button>
        <button className="icon-btn" aria-label="Réglages" onClick={() => navigate('/reglages')} style={{ padding: 0 }}>
          {user ? <Avatar name={user.displayName} color={user.avatarColor} size={42} /> : null}
        </button>
      </div>
    </header>
  )
}
