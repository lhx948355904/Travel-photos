import { ClockCircleOutlined, TeamOutlined, WifiOutlined } from '@ant-design/icons'
import type { ActivityMessage, ActivitySocketStatus } from '../../hooks/useActivitySocket'

interface ActivityPanelProps {
  status: ActivitySocketStatus
  onlineCount: number
  messages: ActivityMessage[]
}

const statusText: Record<ActivitySocketStatus, string> = {
  connecting: 'Connecting',
  open: 'Live',
  closed: 'Reconnecting',
  error: 'Offline',
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return '--:--'
  }
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ActivityPanel = ({ status, onlineCount, messages }: ActivityPanelProps) => {
  return (
    <section className="activity-panel" aria-label="Live map activity">
      <div className="activity-panel-header">
        <div>
          <span>WebSocket</span>
          <strong>Live Activity</strong>
        </div>
        <span className={`activity-status ${status}`}>
          <WifiOutlined />
          {statusText[status]}
        </span>
      </div>

      <div className="activity-online">
        <TeamOutlined />
        <span>Online now</span>
        <strong>{onlineCount}</strong>
      </div>

      <div className="activity-feed">
        {messages.length === 0 ? (
          <p className="activity-empty">Waiting for live events...</p>
        ) : (
          messages.map((message) => (
            <article className="activity-item" key={message.id}>
              <ClockCircleOutlined />
              <div>
                <p>{message.content}</p>
                <time>{formatTime(message.timestamp)}</time>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default ActivityPanel
