import {
  ClockCircleOutlined,
  TeamOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import type {
  ActivityMessage,
  ActivitySocketStatus,
} from "../../hooks/useActivitySocket";

interface ActivityPanelProps {
  status: ActivitySocketStatus;
  onlineCount: number;
  messages: ActivityMessage[];
}

const statusText: Record<ActivitySocketStatus, string> = {
  connecting: "连接中",
  open: "在线",
  closed: "重连中",
  error: "离线",
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ActivityPanel = ({ status, onlineCount, messages }: ActivityPanelProps) => {
  return (
    <section className="activity-panel" aria-label="实时地图动态">
      <div className="activity-panel-header">
        <div>
          <span className="map-section-label">Live Presence</span>
          <strong>实时动态</strong>
        </div>
        <span className={`activity-status ${status}`}>
          <WifiOutlined />
          {statusText[status]}
        </span>
      </div>

      <div className="activity-online">
        <TeamOutlined />
        <span>当前在线</span>
        <strong>{onlineCount}</strong>
      </div>

      <div className="activity-feed">
        {messages.length === 0 ? (
          <p className="activity-empty">等待新的地图浏览或维护动态。</p>
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
  );
};

export default ActivityPanel;
