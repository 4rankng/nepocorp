import React from 'react';
import {
  ArrowLeft, Play, Pencil, Lock, LockOpen, XCircle, Shuffle, FilePen,
  Building2, Loader2,
} from 'lucide-react';
import type { TripDetail } from '@tingting/shared';
import { TripStatus } from '@tingting/shared';
import type { TripPermissions } from '../types';

interface TripHeaderProps {
  trip: TripDetail;
  permissions: TripPermissions;
  actionLoading: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDispatch: () => void;
  onLock: () => void;
  onCancel: () => void;
  onReassign: () => void;
  onAdjust: () => void;
  onUnlock: () => void;
}

function StatusBadge({ status }: { status: TripStatus }) {
  const labels: Record<TripStatus, { text: string; className: string }> = {
    [TripStatus.CREATED]: { text: 'Mới tạo', className: 'tc-status-pill--draft' },
    [TripStatus.IN_TRANSIT]: { text: 'Đang chạy', className: 'tc-status-pill--in-transit' },
    [TripStatus.COMPLETED]: { text: 'Hoàn thành', className: 'tc-status-pill--completed' },
    [TripStatus.LOCKED]: { text: 'Đã khóa', className: 'tc-status-pill--locked' },
    [TripStatus.CANCELED]: { text: 'Đã hủy', className: 'tc-status-pill--canceled' },
  };
  const { text, className } = labels[status] ?? { text: status, className: '' };
  return (
    <span className={`tc-status-pill ${className}`}>
      {text}
    </span>
  );
}

export function TripHeader({
  trip, permissions, actionLoading,
  onBack, onEdit, onDispatch, onLock, onCancel, onReassign, onAdjust, onUnlock,
}: TripHeaderProps) {
  const { canEdit, canEditActuals, canCancel, canDispatch, canLock, canReassign, canAdjust, canUnlock, needsPhotos } = permissions;

  return (
    <header className="tc-page-head anim d1">
      <div className="header-left">
        <button className="tc-back-btn" onClick={onBack} aria-label="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div className="tc-title-wrap">
          <h1 className="tc-page-title">
            {trip.tripCode || 'Lệnh vận chuyển'}
            <StatusBadge status={trip.status} />
          </h1>
          <p className="tc-page-sub company">
            <Building2 size={15} />
            {trip.customer?.name ?? '—'}
          </p>
        </div>
      </div>

      <div className="header-actions">
        {canEdit && (
          <button className="btn btn--ghost" onClick={onEdit}>
            <Pencil size={15} />Chỉnh sửa
          </button>
        )}
        {canReassign && (
          <button className="btn btn--ghost" onClick={onReassign}>
            <Shuffle size={15} />Phân xe lại
          </button>
        )}
        {canCancel && (
          <button className="btn btn--danger" onClick={onCancel}>
            <XCircle size={15} />Hủy chuyến
          </button>
        )}
        {canDispatch && (
          <button className="btn btn--primary" onClick={onDispatch} disabled={actionLoading}>
            {actionLoading ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
            Xuất phát
          </button>
        )}
        {/*
          Accountant + manager may both enter financial figures (fuel, road
          allowance, tiền đi đường, vé, driver salary, etc.) on IN_TRANSIT +
          COMPLETED trips. `canEdit` already shows the manager-only "Chỉnh
          sửa" button on COMPLETED, so the "Nhập số liệu" variant is
          suppressed there to avoid showing two buttons that lead to the
          same place. This is the fix for the bug where accountant had no
          entry point to the actuals form on completed trips.
        */}
        {canEditActuals && !canEdit && (
          <button className="btn btn--primary" onClick={onEdit}>
            <Pencil size={14} />Nhập số liệu
          </button>
        )}
        {canUnlock && (
          <button className="btn btn--ghost" onClick={onUnlock} disabled={actionLoading}>
            {actionLoading ? <Loader2 size={14} className="spin" /> : <LockOpen size={15} />}
            Mở khóa
          </button>
        )}
        {canLock && (
          <button
            className="btn btn--primary"
            disabled={actionLoading || needsPhotos}
            title={needsPhotos ? 'Chưa có ảnh chuyến đi. Vui lòng tải lên ít nhất 1 ảnh trước khi khóa.' : undefined}
            onClick={onLock}
          >
            {actionLoading ? <Loader2 size={14} className="spin" /> : <Lock size={14} />}
            Khóa chuyến
          </button>
        )}
        {canAdjust && (
          <button className="btn btn--ghost" onClick={onAdjust}>
            <FilePen size={15} />Điều chỉnh
          </button>
        )}
      </div>
    </header>
  );
}
