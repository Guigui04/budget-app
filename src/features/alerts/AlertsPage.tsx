import { BellOff, CheckCheck, AlertCircle } from 'lucide-react'
import { useAlerts, useMarkAlertRead } from '@/data/hooks'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatRelative } from '@/lib/format'
import { alertCopy } from './alertCopy'

export function AlertsPage() {
  const { data: alerts = [] } = useAlerts()
  const mark = useMarkAlertRead()
  const unread = alerts.filter((a) => !a.isRead).length

  return (
    <div className="page">
      <div className="row-head rise">
        <h2 className="block-title">{unread > 0 ? `${unread} non lues` : 'À jour'}</h2>
        {unread > 0 && (
          <button className="link-btn" onClick={() => mark.mutate({ all: true })}>
            <CheckCheck size={16} /> Tout marquer lu
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <EmptyState icon={BellOff} title="Aucune notification" hint="Vous serez prévenu des dépassements et anomalies." />
      ) : (
        <div className="alert-list">
          {alerts.map((a, i) => {
            const copy = alertCopy(a)
            return (
              <button
                key={a.id}
                className={`card card-pad alert-item rise ${a.isRead ? 'read' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => mark.mutate({ id: a.id })}
              >
                <span className="alert-icon" style={{ background: `${copy.color}22`, color: copy.color }}>
                  <AlertCircle size={18} />
                </span>
                <div className="alert-body">
                  <span className="alert-title">{copy.title}</span>
                  <span className="alert-desc">{copy.description}</span>
                  <span className="alert-time">{formatRelative(a.createdAt)}</span>
                </div>
                {!a.isRead && <span className="unread-dot" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
