import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from './UI';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotificationQueries';
import { useAuth } from '../hooks/useAuth';
import { formatRelativeTime } from '../lib/date';
import type { Notification } from '@nepocorp/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: Props) {
  const { data, isLoading } = useNotifications(1, 100);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();
  const { user } = useAuth();

  const items = data?.items ?? [];
  const unread = items.filter(n => !n.isRead);
  const read = items.filter(n => n.isRead);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  function handleClick(n: Notification) {
    if (!n.isRead) markAsRead.mutate(n.id);
    const role = user?.role;
    if (n.relatedEntityType === 'trips' && n.relatedEntityId) {
      if (role === 'DRIVER') navigate(`/my-trips/${n.relatedEntityId}`);
      else if (role === 'FORWARDER') navigate(`/my-forwarder-trips/${n.relatedEntityId}`);
      else navigate(`/trips/${n.relatedEntityId}`);
    } else if (n.relatedEntityType === 'penalties') {
      if (role === 'DRIVER') navigate('/my-penalties');
      else navigate('/penalties');
    } else if (n.relatedEntityType === 'payments') {
      if (role === 'DRIVER') navigate('/my-earnings');
      else navigate('/finance');
    }
    handleClose();
  }

  function handleMarkAll() {
    markAllAsRead.mutate();
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title="Thông báo"
      subtitle={unread.length > 0 ? `${unread.length} chưa đọc` : undefined}
      footer={
        unread.length > 0 ? (
          <button className="btn btn--sm" onClick={handleMarkAll} style={{ width: '100%' }}>
            Đánh dấu đã đọc tất cả
          </button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-3)' }}>Đang tải…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-3)' }}>Không có thông báo</div>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="notif-section">
              <div className="notif-section-label">Mới</div>
              {unread.map(n => (
                <NotificationItem key={n.id} notification={n} onClick={() => handleClick(n)} />
              ))}
            </div>
          )}
          {read.length > 0 && (
            <div className="notif-section">
              {unread.length > 0 && <div className="notif-section-label">Đã đọc</div>}
              {read.map(n => (
                <NotificationItem key={n.id} notification={n} onClick={() => handleClick(n)} />
              ))}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

function NotificationItem({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  const n = notification;
  return (
    <button
      className={`notif-item ${n.isRead ? 'notif-item--read' : 'notif-item--unread'}`}
      onClick={onClick}
    >
      <span className={`notif-dot ${n.isRead ? '' : 'notif-dot--unread'}`} />
      <div className="notif-content">
        <div className="notif-title">{n.title}</div>
        <div className="notif-message">{n.message}</div>
        <div className="notif-time">{formatRelativeTime(n.createdAt)}</div>
      </div>
    </button>
  );
}
