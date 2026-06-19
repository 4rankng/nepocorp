import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ClipboardList,
  CreditCard,
  Megaphone,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Truck,
  XCircle,
} from 'lucide-react';
import { Drawer } from './UI';
import { EmptyIllustration } from './shared';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotificationQueries';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatRelativeTime } from '../lib/date';
import { routes } from '../lib/routes';
import { NotificationType } from '@tingting/shared';
import type { LucideIcon } from 'lucide-react';
import type { Notification } from '@tingting/shared';
import './NotificationDrawer.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: Props) {
  const { data, isLoading, isFetching, refetch } = useNotifications(1, 100);
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const items = useMemo(() => data?.items ?? [], [data]);
  const totalNotifications = data?.total ?? items.length;
  const unread = items.filter(n => !n.isRead);
  const unreadTotal = unreadData?.count ?? unread.length;
  const counts = useMemo(() => buildCounts(items, unreadTotal), [items, unreadTotal]);
  const filtered = useMemo(() => {
    if (filter === 'unread') return items.filter(n => !n.isRead);
    if (filter === 'operations' || filter === 'finance' || filter === 'alerts')
      return items.filter(n => categoryFor(n) === filter);
    return items;
  }, [filter, items]);
  const groups = useMemo(() => groupNotifications(filtered), [filtered]);

  function handleOpen(n: Notification) {
    if (!n.isRead) markAsRead.mutate(n.id);
    const url = urlForNotification(n, user?.role);
    if (url) navigate(url);
    onClose();
  }

  function handleReadOnly(n: Notification) {
    if (!n.isRead) markAsRead.mutate(n.id);
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Thông báo"
      subtitle={totalNotifications > 0 ? `${unreadTotal} chưa đọc trên ${totalNotifications} thông báo` : 'Trung tâm nhắc việc'}
      footer={
        unreadTotal > 0 ? (
          <button className="notification-mark-all" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
            <CheckCheck size={18} />
            Đánh dấu tất cả đã đọc
          </button>
        ) : undefined
      }
    >
      <div className="notification-center">
        <div className="notification-summary">
          <div className="notification-summary__icon" aria-hidden>
            <Bell size={22} />
          </div>
          <div>
            <div className="notification-summary__label">Hộp thông báo</div>
            <div className="notification-summary__value">
              {unreadTotal > 0 ? `${unreadTotal} việc cần xem` : 'Tất cả đã được xử lý'}
            </div>
            <div className="notification-summary__hint">
              Bấm một thông báo để mở đúng màn hình liên quan.
            </div>
          </div>
          <button className="notification-refresh" type="button" onClick={() => refetch()} disabled={isFetching} aria-label="Tải lại thông báo">
            <RefreshCw size={17} className={isFetching ? 'is-spinning' : undefined} />
          </button>
        </div>

        <PushNotificationToggle />

        <NotificationFilters
          active={filter}
          counts={counts}
          onChange={setFilter}
        />

      {isLoading ? (
          <NotificationSkeleton />
        ) : items.length === 0 ? (
          <div className="notification-empty">
          <EmptyIllustration name="empty-notifications" width={150} height={124} style={{ margin: '0 auto 8px', display: 'block' }} />
            <div className="notification-empty__title">Chưa có thông báo</div>
            <div className="notification-empty__text">Khi có chuyến mới, thanh toán, phạt hoặc nhắc việc quan trọng, hệ thống sẽ đưa vào đây.</div>
        </div>
        ) : filtered.length === 0 ? (
          <div className="notification-empty notification-empty--compact">
            <div className="notification-empty__title">Không có mục trong bộ lọc này</div>
            <div className="notification-empty__text">Chọn “Tất cả” để xem toàn bộ thông báo gần nhất.</div>
          </div>
      ) : (
          <div className="notification-list">
            {groups.map(group => (
              <section className="notif-section" key={group.label}>
                <div className="notif-section-label">{group.label}</div>
                {group.items.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onOpen={() => handleOpen(n)}
                    onMarkRead={() => handleReadOnly(n)}
                  />
                ))}
              </section>
            ))}
          </div>
      )}
      </div>
    </Drawer>
  );
}

type NotificationFilter = 'all' | 'unread' | 'operations' | 'finance' | 'alerts';
type NotificationCategory = 'operations' | 'finance' | 'alerts' | 'system';

interface NotificationMeta {
  icon: LucideIcon;
  tone: 'green' | 'blue' | 'amber' | 'red' | 'zinc';
  category: NotificationCategory;
  action: string;
}

const NOTIFICATION_META: Record<string, NotificationMeta> = {
  [NotificationType.TRIP_CREATED]: { icon: ClipboardList, tone: 'blue', category: 'operations', action: 'Mở chuyến' },
  [NotificationType.TRIP_DISPATCHED]: { icon: Truck, tone: 'green', category: 'operations', action: 'Xem chuyến' },
  [NotificationType.TRIP_IN_TRANSIT]: { icon: Truck, tone: 'green', category: 'operations', action: 'Theo dõi' },
  [NotificationType.TRIP_COMPLETED]: { icon: PackageCheck, tone: 'green', category: 'operations', action: 'Kiểm tra' },
  [NotificationType.TRIP_LOCKED]: { icon: PackageCheck, tone: 'zinc', category: 'finance', action: 'Xem khóa' },
  [NotificationType.TRIP_UNLOCKED]: { icon: RefreshCw, tone: 'amber', category: 'finance', action: 'Kiểm tra' },
  [NotificationType.TRIP_CANCELED]: { icon: XCircle, tone: 'red', category: 'alerts', action: 'Xem lý do' },
  [NotificationType.PAYMENT_RECEIVED]: { icon: CreditCard, tone: 'green', category: 'finance', action: 'Đối chiếu' },
  [NotificationType.PENALTY_CREATED]: { icon: ShieldAlert, tone: 'amber', category: 'alerts', action: 'Xem phạt' },
  [NotificationType.PENALTY_CANCELED]: { icon: Check, tone: 'zinc', category: 'alerts', action: 'Xem cập nhật' },
  [NotificationType.OVERDUE_PAYMENT]: { icon: AlertTriangle, tone: 'red', category: 'alerts', action: 'Xử lý' },
  [NotificationType.SALARY_PERIOD_CLOSING]: { icon: AlertTriangle, tone: 'amber', category: 'finance', action: 'Xem lương' },
  [NotificationType.SYSTEM_ANNOUNCEMENT]: { icon: Megaphone, tone: 'blue', category: 'system', action: 'Xem thêm' },
};

function metaFor(notification: Notification): NotificationMeta {
  return NOTIFICATION_META[notification.type] ?? { icon: Bell, tone: 'zinc', category: 'system', action: 'Mở' };
}

function categoryFor(notification: Notification): NotificationCategory {
  return metaFor(notification).category;
}

/** In-app deep link for a notification tap. Mirrors the backend push urlFor()
 *  (services/notification.service.ts) so a drawer tap and a push open the
 *  same screen, and keeps DRIVER/FORWARDER inside their own portal instead
 *  of landing on a forbidden office route. */
function urlForNotification(n: Notification, role: string | undefined): string | undefined {
  const id = n.relatedEntityId;
  switch (n.relatedEntityType) {
    case 'trips':
      if (!id) return undefined;
      if (role === 'DRIVER') return routes.myTripDetail(id);
      if (role === 'FORWARDER') return routes.myForwarderTripDetail(id);
      return routes.tripDetail(id);
    case 'penalties':
      return role === 'DRIVER' ? routes.myPenalties : routes.penalties;
    case 'payments':
      return role === 'DRIVER' ? routes.myEarnings : routes.finance;
    default:
      return undefined;
  }
}

function buildCounts(items: Notification[], unreadTotal: number) {
  return {
    all: items.length,
    unread: unreadTotal,
    operations: items.filter(n => categoryFor(n) === 'operations').length,
    finance: items.filter(n => categoryFor(n) === 'finance').length,
    alerts: items.filter(n => categoryFor(n) === 'alerts').length,
  } satisfies Record<NotificationFilter, number>;
}

function groupNotifications(items: Notification[]) {
  const unread = items.filter(n => !n.isRead);
  const read = items.filter(n => n.isRead);
  return [
    ...(unread.length > 0 ? [{ label: 'Mới', items: unread }] : []),
    ...(read.length > 0 ? [{ label: unread.length > 0 ? 'Đã đọc' : 'Gần đây', items: read }] : []),
  ];
}

function NotificationFilters({
  active,
  counts,
  onChange,
}: {
  active: NotificationFilter;
  counts: Record<NotificationFilter, number>;
  onChange: (value: NotificationFilter) => void;
}) {
  const filters: { key: NotificationFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
    { key: 'operations', label: 'Vận hành' },
    { key: 'finance', label: 'Tài chính' },
    { key: 'alerts', label: 'Cần xử lý' },
  ];

  return (
    <div className="notification-filters" role="group" aria-label="Lọc thông báo">
      {filters.map(filter => (
        <button
          key={filter.key}
          type="button"
          aria-pressed={active === filter.key}
          className={`notification-filter ${active === filter.key ? 'is-active' : ''}`}
          onClick={() => onChange(filter.key)}
        >
          <span>{filter.label}</span>
          <span className="notification-filter__count">{counts[filter.key]}</span>
        </button>
      ))}
    </div>
  );
}

function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
}: {
  notification: Notification;
  onOpen: () => void;
  onMarkRead: () => void;
}) {
  const n = notification;
  const meta = metaFor(n);
  const Icon = meta.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`notif-item notif-item--${meta.tone} ${n.isRead ? 'notif-item--read' : 'notif-item--unread'}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="notif-icon" aria-hidden>
        <Icon size={18} />
      </span>
      <div className="notif-content">
        <div className="notif-title-row">
          <span className="notif-title">{n.title}</span>
          {!n.isRead && <span className="notif-unread-pill">Mới</span>}
        </div>
        <div className="notif-message">{n.message}</div>
        <div className="notif-meta">
          <span>{formatRelativeTime(n.createdAt)}</span>
          <span aria-hidden>·</span>
          <span>{meta.action}</span>
        </div>
      </div>
      {!n.isRead && (
        <button
          type="button"
          className="notif-read-action"
          aria-label="Đánh dấu đã đọc"
          onClick={(event) => {
            event.stopPropagation();
            onMarkRead();
          }}
        >
          <Check size={16} />
        </button>
      )}
    </div>
  );
}

/** Push-notification opt-in toggle shown at the top of the drawer. */
function PushNotificationToggle() {
  const { isSupported, permissionStatus, isSubscribed, isLoading, errorMessage, subscribe, unsubscribe } = usePushNotifications();

  // Single early-return for the two states that can't toggle (unsupported /
  // denied). Same row/label, only the hint text differs.
  const hint = !isSupported
    ? 'Trình duyệt không hỗ trợ'
    : permissionStatus === 'denied'
      ? 'Quyền đang bị chặn trong cài đặt trình duyệt'
      : null;
  if (hint) {
    return (
      <div className="push-card push-card--disabled">
        <span className="push-card__icon" aria-hidden><BellOff size={18} /></span>
        <div className="push-card__copy">
          <div className="push-card__title">Thông báo trên điện thoại</div>
          <div className="push-card__text">{hint}. iOS: mở Cài đặt Safari/Chrome hoặc cài app ra màn hình chính nếu trình duyệt yêu cầu.</div>
        </div>
      </div>
    );
  }

  const on = isSubscribed;
  const statusText = errorMessage
    ? errorMessage
    : on
      ? 'Đang bật cho thiết bị này. Chỉ các việc quan trọng mới hiện ngoài app.'
      : permissionStatus === 'granted'
        ? 'Quyền trình duyệt đã bật. Bấm để hoàn tất kết nối thiết bị.'
        : 'Bật để nhận chuyến mới, phạt, hủy chuyến và thanh toán quan trọng.';
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => (on ? unsubscribe() : subscribe())}
      className={`push-card ${on ? 'is-on' : ''} ${errorMessage ? 'has-error' : ''}`}
    >
      <span className="push-card__icon" aria-hidden><Smartphone size={18} /></span>
      <span className="push-card__copy">
        <span className="push-card__title">Thông báo trên điện thoại</span>
        <span className="push-card__text">
          {isLoading ? 'Đang kết nối thiết bị...' : statusText}
        </span>
      </span>
      <span className="push-switch" aria-hidden>
        <span />
      </span>
    </button>
  );
}

function NotificationSkeleton() {
  return (
    <div className="notification-skeleton" aria-label="Đang tải thông báo">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="notification-skeleton__row" key={index}>
          <span />
          <div>
            <i />
            <b />
          </div>
        </div>
      ))}
    </div>
  );
}
