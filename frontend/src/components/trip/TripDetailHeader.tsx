import React from 'react';
import {
  ArrowLeft, Play, Pencil, Lock, XCircle, Shuffle, FilePen,
  Truck, User, MapPin, Calendar, Package, Building2, Ruler,
} from 'lucide-react';
import { formatDate } from '../../lib/format';
import type { TripDetail } from '@nepocorp/shared';
import { TripStatus, TRIP_STATUS_LABELS, FUEL_MODE_LABELS } from '@nepocorp/shared';
import { Loader2 } from 'lucide-react';

interface TripDetailHeaderProps {
  trip: TripDetail;
  onBack: () => void;
  canEdit: boolean;
  canCancel: boolean;
  canDispatch: boolean;
  canLock: boolean;
  canReassign: boolean;
  canAdjust: boolean;
  needsPhotos: boolean;
  actionLoading: boolean;
  onDispatch: () => void;
  onEdit: () => void;
  onLock: () => void;
  onCancel: () => void;
  onReassign: () => void;
  onAdjust: () => void;
}

function StatusBadge({ status }: { status: TripStatus }) {
  const labels: Record<TripStatus, { text: string; className: string }> = {
    [TripStatus.CREATED]: { text: 'Mới tạo', className: 'status-badge--new' },
    [TripStatus.IN_TRANSIT]: { text: 'Đang chạy', className: 'status-badge--transit' },
    [TripStatus.COMPLETED]: { text: 'Hoàn thành', className: 'status-badge--completed' },
    [TripStatus.LOCKED]: { text: 'Đã khóa', className: 'status-badge--locked' },
    [TripStatus.CANCELED]: { text: 'Đã hủy', className: 'status-badge--canceled' },
  };
  const { text, className } = labels[status] ?? { text: status, className: '' };
  return (
    <span className={`status-badge ${className}`}>
      <span className="status-badge__pulse" />
      {text}
    </span>
  );
}

export function TripDetailHeader({
  trip,
  onBack,
  canEdit,
  canCancel,
  canDispatch,
  canLock,
  canReassign,
  canAdjust,
  needsPhotos,
  actionLoading,
  onDispatch,
  onEdit,
  onLock,
  onCancel,
  onReassign,
  onAdjust,
}: TripDetailHeaderProps) {
  return (
    <header className="page-header anim d1">
      <div className="header-left">
        <button className="back-btn" onClick={onBack} aria-label="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div className="title-block">
          <div className="title-row">
            <h1>Lệnh vận chuyển</h1>
            <StatusBadge status={trip.status} />
          </div>
          <div className="company">
            <Building2 size={15} />
            {trip.customer?.name ?? '—'}
          </div>
        </div>
      </div>

      <div className="header-actions">
        {canEdit && (
          <button className="btn btn-ghost" onClick={onEdit}>
            <Pencil size={15} />
            Chỉnh sửa
          </button>
        )}
        {canReassign && (
          <button className="btn btn-ghost" onClick={onReassign}>
            <Shuffle size={15} />
            Phân xe lại
          </button>
        )}
        {canCancel && (
          <button className="btn btn-danger" onClick={onCancel}>
            <XCircle size={15} />
            Hủy chuyến
          </button>
        )}
        {canDispatch && (
          <button className="btn btn-primary" onClick={onDispatch} disabled={actionLoading}>
            {actionLoading ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
            Xuất phát
          </button>
        )}
        {trip.status === TripStatus.IN_TRANSIT && (
          <button className="btn btn-primary" onClick={onEdit}>
            <Pencil size={14} />
            Nhập số liệu
          </button>
        )}
        {canLock && (
          <button
            className="btn btn-primary"
            disabled={actionLoading || needsPhotos}
            title={needsPhotos ? 'Chưa có ảnh chuyến đi. Vui lòng tải lên ít nhất 1 ảnh trước khi khóa.' : undefined}
            onClick={onLock}
          >
            {actionLoading ? <Loader2 size={14} className="spin" /> : <Lock size={14} />}
            Khóa chuyến
          </button>
        )}
        {canAdjust && (
          <button className="btn btn-ghost" onClick={onAdjust}>
            <FilePen size={15} />
            Điều chỉnh
          </button>
        )}
      </div>
    </header>
  );
}
