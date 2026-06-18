import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from './UI';
import { EmptyIllustration } from './shared';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotificationQueries';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatRelativeTime } from '../lib/date';
import type { Notification } from '@tingting/shared';

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
      <PushNotificationToggle />
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-3)' }}>Đang tải…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-3)' }}>
          <EmptyIllustration name="empty-notifications" width={150} height={124} style={{ margin: '0 auto 8px', display: 'block' }} />
          <div>Không có thông báo</div>
        </div>
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

/** Push-notification opt-in toggle shown at the top of the drawer. */
function PushNotificationToggle() {
  const { isSupported, permissionStatus, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '10px 4px', borderBottom: '1px solid var(--border-1, rgba(0,0,0,0.08))',
  };
  const labelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--ink-1, #111)' };
  const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--ink-3, #888)', textAlign: 'right' };

  if (!isSupported) {
    return (
      <div style={rowStyle}>
        <span style={labelStyle}>Thông báo đẩy</span>
        <span style={hintStyle}>Trình duyệt không hỗ trợ</span>
      </div>
    );
  }
  if (permissionStatus === 'denied') {
    return (
      <div style={rowStyle}>
        <span style={labelStyle}>Thông báo đẩy</span>
        <span style={hintStyle}>Bật lại quyền trong cài đặt trình duyệt</span>
      </div>
    );
  }

  const on = isSubscribed;
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => (on ? unsubscribe() : subscribe())}
      style={{ ...rowStyle, width: '100%', background: 'transparent', border: 'none', cursor: isLoading ? 'wait' : 'pointer', textAlign: 'left' }}
    >
      <span style={labelStyle}>Thông báo đẩy</span>
      <span aria-hidden style={{
        width: 38, height: 22, borderRadius: 999, padding: 2, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center',
        background: on ? 'var(--accent, #00B14F)' : 'var(--ink-4, #c8c8c8)',
        transition: 'background .15s ease',
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transform: on ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform .15s ease',
        }} />
      </span>
    </button>
  );
}
