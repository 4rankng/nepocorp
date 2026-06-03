import React from 'react';
import { Plus } from 'lucide-react';
import { CardSection } from './CardSection';
import { JourneyLegRow } from './JourneyLegRow';
import { RoutePickerModal } from './RoutePickerModal';
import { useTripFormContext } from '../../hooks/useTripFormContext';

interface JourneyLegsCardProps {
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /**
   * Section number to display in the corner badge. Defaults to 2 since this
   * card is section #2 inside TripCreatePage. When embedded as a sub-card
   * (e.g. nested inside another section on TripEditPage), pass `null` to
   * suppress the number — otherwise the page ends up with two "2" badges
   * side-by-side, which confuses users.
   */
  number?: number | null;
}

export function JourneyLegsCard({ collapsible, defaultCollapsed, number = 2 }: JourneyLegsCardProps) {
  const form = useTripFormContext();
  const {
    legs, addLeg, removeLeg, updateLeg,
    routePickerState, onRoutePicked, dismissRoutePicker, onKmManualBlur,
  } = form;
  const totalKm = legs.reduce((sum, leg) => sum + (Number(leg.km) || 0), 0);

  return (
    <CardSection
      number={number != null ? number : undefined}
      title="Hành trình chi tiết"
      subtitle="Khai báo các chặng đường, cự ly và tải trọng"
      badge="optional"
      collapsible={collapsible}
      defaultCollapsed={defaultCollapsed}
    >
      {legs.length === 0 ? (
        <div className="tc-journey-empty">
          <div className="tc-journey-empty__illustration">
            <svg aria-hidden="true" width="60" height="40" viewBox="0 0 60 40">
              <circle cx="8" cy="32" r="4" fill="#16A34A" />
              <path d="M8 28 Q 15 8, 30 20 T 52 8" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="3,3" fill="none" />
              <circle cx="52" cy="8" r="4" fill="#DC2626" />
            </svg>
          </div>
          <div className="tc-journey-empty__text">
            <h4 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: 700, color: 'var(--fg-1)' }}>Chưa có chặng nào</h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--fg-3)' }}>
              Khai báo từng chặng để tự động tính nhiên liệu theo định mức × Km. Bạn cũng có thể bỏ qua và nhập thủ công.
            </p>
          </div>
          <button type="button" className="btn btn--secondary btn--sm" onClick={addLeg}>
            <Plus size={14} />
            Thêm chặng đầu tiên
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {legs.map((leg, idx) => (
              <JourneyLegRow
                key={leg.id}
                leg={leg}
                onRemove={() => removeLeg(idx)}
                onUpdate={(field, value) => updateLeg(idx, field, value)}
                canRemove={legs.length > 1}
                onKmBlur={() => { void onKmManualBlur(idx); }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div className="form-summary" style={{ margin: 0 }}>
              <span>Tổng số chặng: <strong>{legs.length}</strong></span>
              <span>Tổng cự ly: <strong>{totalKm.toLocaleString('vi-VN')} Km</strong></span>
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={addLeg}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Thêm chặng
            </button>
          </div>
          {routePickerState && (
            <RoutePickerModal
              origin={routePickerState.origin}
              destination={routePickerState.destination}
              routes={routePickerState.routes}
              onSelect={onRoutePicked}
              onDismiss={dismissRoutePicker}
            />
          )}
        </>
      )}
    </CardSection>
  );
}
