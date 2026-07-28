import { useEffect, useMemo, useState } from 'react';
import {
  VehicleScheduleStatus,
  type VehicleComponent,
  type VehicleSchedule,
} from '@tingting/shared';
import { Ban, CalendarPlus, Check, Clock3, Pencil } from 'lucide-react';
import { Drawer } from '../../../components/UI';
import { StatusStrip } from '../../../components/shared/StatusStrip';
import { VehicleScheduleForm, type VehicleScheduleDraft } from './VehicleScheduleForm';
import type { VehicleScheduleOpenMode } from './VehicleScheduleTrigger';

interface VehicleScheduleManagerProps {
  isOpen: boolean;
  initialMode?: VehicleScheduleOpenMode;
  vehicleComponent: VehicleComponent;
  vehicleId: number;
  vehiclePlate: string;
  items: VehicleSchedule[];
  loading?: boolean;
  saving?: boolean;
  onClose: () => void;
  onCreate: (draft: VehicleScheduleDraft) => void | Promise<unknown>;
  onUpdate: (id: number, draft: VehicleScheduleDraft) => void | Promise<unknown>;
  onComplete: (id: number) => void | Promise<unknown>;
  onCancel: (id: number) => void | Promise<unknown>;
}

const managerDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function scheduleToDraft(item: VehicleSchedule): VehicleScheduleDraft {
  return {
    kind: item.kind,
    title: item.title,
    documentNumber: item.documentNumber,
    notes: item.notes,
    remindAt: item.remindAt,
    dueAt: item.dueAt,
  };
}

export function VehicleScheduleManager({
  isOpen,
  initialMode = 'overview',
  vehicleComponent,
  vehicleId,
  vehiclePlate,
  items,
  loading = false,
  saving = false,
  onClose,
  onCreate,
  onUpdate,
  onComplete,
  onCancel,
}: VehicleScheduleManagerProps) {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [creating, setCreating] = useState(initialMode === 'create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setTab('active');
    setCreating(isOpen && initialMode === 'create');
    setEditingId(null);
    setActionError('');
  }, [initialMode, isOpen, vehicleComponent, vehicleId]);

  const { activeItems, historyItems } = useMemo(() => ({
    activeItems: items.filter(item => item.status === VehicleScheduleStatus.ACTIVE),
    historyItems: items.filter(item => item.status !== VehicleScheduleStatus.ACTIVE),
  }), [items]);
  const visibleItems = tab === 'active' ? activeItems : historyItems;
  const editingItem = editingId == null ? undefined : items.find(item => item.id === editingId);
  const componentLabel = vehicleComponent === 'TRUCK' ? 'Xe đầu kéo' : 'Rơ-moóc';
  const showForm = creating || editingItem !== undefined;
  const tabPanelId = `vehicle-schedule-${vehicleComponent.toLowerCase()}-${vehicleId}-panel`;

  const runAction = async (action: () => void | Promise<unknown>) => {
    setActionError('');
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không thể cập nhật lịch nhắc việc.');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Lịch nhắc việc"
      subtitle={`${componentLabel} ${vehiclePlate}`}
      className="vehicle-schedule-manager"
    >
      <div className="vehicle-schedule-manager__content" data-testid="vehicle-schedule-manager">
        {actionError && <div className="vehicle-schedule-form__error" role="alert">{actionError}</div>}
        {!showForm && (
          <>
            <div className="vehicle-schedule-manager__toolbar">
              <div className="vehicle-schedule-manager__tabs" role="tablist" aria-label="Trạng thái lịch">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'active'}
                  aria-controls={tabPanelId}
                  className={tab === 'active' ? 'is-active' : ''}
                  onClick={() => setTab('active')}
                >
                  <span>Đang theo dõi</span>
                  <span className="vehicle-schedule-manager__tab-count">{activeItems.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'history'}
                  aria-controls={tabPanelId}
                  className={tab === 'history' ? 'is-active' : ''}
                  onClick={() => setTab('history')}
                >
                  <span>Đã xử lý</span>
                  <span className="vehicle-schedule-manager__tab-count">{historyItems.length}</span>
                </button>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm vehicle-schedule-manager__add"
                onClick={() => setCreating(true)}
                aria-label="Thêm lịch nhắc việc"
              >
                <CalendarPlus size={16} aria-hidden="true" />
                <span className="vehicle-schedule-manager__add-label">Thêm lịch</span>
              </button>
            </div>

            <div
              id={tabPanelId}
              className="vehicle-schedule-manager__panel"
              role="tabpanel"
              aria-label={tab === 'active' ? 'Lịch đang theo dõi' : 'Lịch đã xử lý'}
            >
              {loading ? (
                <div className="vehicle-schedule-manager__loading">Đang tải lịch nhắc việc…</div>
              ) : visibleItems.length === 0 ? (
                <div className="vehicle-schedule-manager__empty">
                  {tab === 'active'
                    ? 'Chưa có lịch đang theo dõi cho phương tiện này.'
                    : 'Chưa có lịch đã xử lý.'}
                </div>
              ) : (
                <div className="vehicle-schedule-list">
                  {visibleItems.map(item => {
                    const reminderReached = new Date(item.remindAt).getTime() <= Date.now();
                    const stateLabel = item.status === VehicleScheduleStatus.COMPLETED
                      ? 'Đã hoàn thành'
                      : item.status === VehicleScheduleStatus.CANCELLED
                        ? 'Đã hủy'
                        : item.isOverdue
                          ? 'Quá hạn'
                          : reminderReached
                            ? 'Đến hạn nhắc'
                            : 'Sắp tới';
                    const stateClass = item.status === VehicleScheduleStatus.COMPLETED
                      ? 'completed'
                      : item.status === VehicleScheduleStatus.CANCELLED
                        ? 'cancelled'
                        : item.isOverdue
                          ? 'overdue'
                          : reminderReached
                            ? 'due'
                            : 'upcoming';
                    const stripColor = stateClass === 'completed'
                      ? 'var(--success)'
                      : stateClass === 'cancelled'
                        ? 'var(--ink-3)'
                        : stateClass === 'overdue'
                          ? 'var(--danger)'
                          : stateClass === 'due'
                            ? 'var(--warning)'
                            : 'var(--info)';

                    return (
                      <article
                        key={item.id}
                        className={`vehicle-schedule-row vehicle-schedule-row--${stateClass}`}
                        data-testid={`vehicle-schedule-row-${item.id}`}
                      >
                        <StatusStrip color={stripColor} />
                        <div className="vehicle-schedule-row__head">
                          <strong>{item.title}</strong>
                          <span className="vehicle-schedule-row__state">{stateLabel}</span>
                        </div>
                        <div className="vehicle-schedule-row__meta">
                          <Clock3 size={15} aria-hidden="true" />
                          <span>Hạn</span>
                          <time dateTime={item.dueAt}>
                            {managerDateFormatter.format(new Date(item.dueAt))}
                          </time>
                          {item.documentNumber && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Số {item.documentNumber}</span>
                            </>
                          )}
                        </div>
                        {item.notes && <p className="vehicle-schedule-row__notes">{item.notes}</p>}
                        {item.status === VehicleScheduleStatus.ACTIVE && (
                          <div className="vehicle-schedule-row__actions" aria-label={`Thao tác cho ${item.title}`}>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => setEditingId(item.id)}
                              aria-label={`Sửa lịch ${item.title}`}
                            >
                              <Pencil size={15} aria-hidden="true" /> Sửa
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm vehicle-schedule-row__complete"
                              onClick={() => {
                                if (window.confirm(`Đánh dấu “${item.title}” là đã hoàn thành? Lịch này sẽ không còn xuất hiện trong cảnh báo.`)) {
                                  void runAction(() => onComplete(item.id));
                                }
                              }}
                              aria-label={`Hoàn thành lịch ${item.title}`}
                            >
                              <Check size={15} aria-hidden="true" /> Hoàn thành
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm vehicle-schedule-row__cancel"
                              onClick={() => {
                                if (window.confirm(`Hủy lịch “${item.title}”? Lịch sẽ được giữ trong lịch sử và không còn cảnh báo.`)) {
                                  void runAction(() => onCancel(item.id));
                                }
                              }}
                              aria-label={`Hủy lịch ${item.title}`}
                            >
                              <Ban size={15} aria-hidden="true" /> Hủy
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {showForm && (
          <div className="vehicle-schedule-manager__form">
            <VehicleScheduleForm
              initialValue={editingItem ? scheduleToDraft(editingItem) : undefined}
              submitting={saving}
              onCancel={() => {
                setCreating(false);
                setEditingId(null);
              }}
              onSubmit={draft => runAction(async () => {
                if (editingItem) await onUpdate(editingItem.id, draft);
                else await onCreate(draft);
                setCreating(false);
                setEditingId(null);
              })}
            />
          </div>
        )}
      </div>
    </Drawer>
  );
}
