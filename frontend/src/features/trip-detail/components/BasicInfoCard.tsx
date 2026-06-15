import React, { useState } from 'react';
import { Truck, User, Calendar, Package, Hash, Pencil, CheckCircle } from 'lucide-react';
import { fmtDate } from '../formatters';
import type { TripDetail } from '@tingting/shared';

interface BasicInfoCardProps {
  trip: TripDetail;
  canChangeDate?: boolean;
  onChangeDepartureDate?: (newDate: string) => Promise<void>;
  actionLoading?: boolean;
}

export function BasicInfoCard({ trip, canChangeDate, onChangeDepartureDate, actionLoading }: BasicInfoCardProps) {
  const [editingDate, setEditingDate] = useState(false);
  const [pendingDate, setPendingDate] = useState(trip.departureDate);
  const rows = [
    { icon: <Truck size={17} />, label: 'Xe đầu', value: trip.truck?.licensePlate ?? '—', mono: true },
    { icon: <User size={17} />, label: 'Lái xe', value: trip.driver?.name ?? '—' },
    {
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="16" height="10" rx="1" /><path d="M18 12h3M9 16v2" /><circle cx="9" cy="18" r="2" />
        </svg>
      ),
      label: 'Rơ moóc',
      value: trip.trailer ? `${trip.trailer.licensePlate} · ${trip.trailer.type || (trip.trailerType ?? '—')}` : (trip.trailerType ?? '—'),
      mono: true,
    },
    { icon: <Package size={17} />, label: 'Số container', value: String(trip.containerCount ?? 1), mono: true },
    { icon: <Calendar size={17} />, label: 'Ngày khởi hành', value: fmtDate(trip.departureDate), mono: true, isDate: true },
    { icon: <CheckCircle size={17} />, label: 'Ngày hoàn thành', value: trip.completedAt ? fmtDate(trip.completedAt) : '—', mono: true },
    { icon: <Hash size={17} />, label: 'Mã tham chiếu', value: trip.customerReference ?? 'Chưa có', muted: !trip.customerReference, full: true },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <h2><span className="hicon"><Truck size={15} /></span>Thông tin cơ bản</h2>
      </div>
      <div className="card-body">
        <div className="info-list">
          {rows.map((row, i) => (
            <div className={`info-row${row.full ? ' info-row--full' : ''}`} key={i}>
              <span className="ri">{row.icon}</span>
              <div className="info-meta">
                <div className="lbl">{row.label}</div>
                <div className={`val ${row.mono ? 'mono' : ''} ${row.muted ? 'muted' : ''}`}>
                  {row.isDate && canChangeDate && !editingDate ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {row.value}
                      <button
                        className="btn-icon"
                        title="Thay đổi ngày khởi hành"
                        onClick={() => { setPendingDate(trip.departureDate); setEditingDate(true); }}
                        style={{ padding: 2 }}
                      >
                        <Pencil size={13} />
                      </button>
                    </span>
                  ) : row.isDate && editingDate ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <input
                        className="input mono"
                        type="date"
                        value={pendingDate}
                        onChange={(e) => setPendingDate(e.target.value)}
                        style={{ width: 150, padding: '2px 6px', fontSize: 13 }}
                      />
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={actionLoading || pendingDate === trip.departureDate}
                        onClick={async () => {
                          if (onChangeDepartureDate) {
                            try {
                              await onChangeDepartureDate(pendingDate);
                              setEditingDate(false);
                            } catch {
                              // Parent hook handles error display; keep editor open
                            }
                          }
                        }}
                        style={{ padding: '2px 8px', fontSize: 12 }}
                      >
                        {actionLoading ? '...' : 'Lưu'}
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setEditingDate(false)}
                        style={{ padding: '2px 8px', fontSize: 12 }}
                      >
                        Hủy
                      </button>
                    </span>
                  ) : (
                    row.value
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
