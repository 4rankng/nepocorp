import React, { useEffect, useState } from 'react';
import { Modal } from '../UI';
import { LeafletMap } from '../shared/LeafletMap';
import type { RouteSuggestion } from '../../lib/maps';

interface RoutePickerModalProps {
  origin: string;
  destination: string;
  routes: RouteSuggestion[];
  onSelect: (route: RouteSuggestion) => void | Promise<void>;
  onDismiss: () => void;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} phút`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
}

/**
 * Lets the user pick among multiple Google Maps route alternatives for the
 * same (origin, destination) pair — e.g. QL5 vs. Hà Nội–Hải Phòng expressway.
 *
 * Layout: a route list on the left and a Leaflet preview on the right that
 * updates as the user hovers over a route so they can see the path before
 * committing.
 */
export function RoutePickerModal({
  origin,
  destination,
  routes,
  onSelect,
  onDismiss,
}: RoutePickerModalProps) {
  const [hoveredIdx, setHoveredIdx] = useState(0);
  const [highlighted, setHighlighted] = useState<RouteSuggestion>(routes[0]);
  const [submitting, setSubmitting] = useState(false);

  // If the routes list changes while the modal is open (e.g. parent re-renders),
  // keep `highlighted` pointing at a real element.
  useEffect(() => {
    if (routes.length === 0) return;
    if (!routes.find((r) => r === highlighted)) {
      setHighlighted(routes[0]);
      setHoveredIdx(0);
    }
  }, [routes, highlighted]);

  const handleSelect = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSelect(highlighted);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      title="Chọn tuyến đường"
      onClose={onDismiss}
      maxWidth={780}
      footer={
        <>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onDismiss}
            disabled={submitting}
          >
            Bỏ qua
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleSelect}
            disabled={submitting || !highlighted}
          >
            Xác nhận — {highlighted?.km.toLocaleString('vi-VN')} km
          </button>
        </>
      }
    >
      <div className="route-picker">
        <div className="route-picker__intro">
          <div className="route-picker__route-line">
            <span className="route-picker__dot route-picker__dot--start" aria-hidden />
            <span className="route-picker__place">{origin}</span>
            <span className="route-picker__arrow" aria-hidden>→</span>
            <span className="route-picker__place">{destination}</span>
            <span className="route-picker__dot route-picker__dot--end" aria-hidden />
          </div>
          <p className="route-picker__hint">
            Tìm thấy {routes.length} tuyến khả thi. Chọn tuyến phù hợp với xe của bạn.
          </p>
        </div>
        <div className="route-picker__panels">
          <ul className="route-picker__list" role="radiogroup" aria-label="Danh sách tuyến">
            {routes.map((route, idx) => {
              const isActive = idx === hoveredIdx;
              return (
                <li
                  key={`${route.summary}-${idx}`}
                  className={`route-picker-option${isActive ? ' is-active' : ''}`}
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={0}
                  onMouseEnter={() => {
                    setHoveredIdx(idx);
                    setHighlighted(route);
                  }}
                  onFocus={() => {
                    setHoveredIdx(idx);
                    setHighlighted(route);
                  }}
                  onClick={() => {
                    setHoveredIdx(idx);
                    setHighlighted(route);
                  }}
                >
                  <div className="route-picker-option__radio" aria-hidden>
                    <span className="route-picker-option__radio-dot" />
                  </div>
                  <div className="route-picker-option__body">
                    <div className="route-picker-option__title">
                      {route.summary || `Tuyến ${idx + 1}`}
                    </div>
                    <div className="route-picker-option__meta">
                      <span className="route-picker-option__km">
                        <strong>{route.km.toLocaleString('vi-VN')}</strong> km
                      </span>
                      <span className="route-picker-option__sep" aria-hidden>·</span>
                      <span className="route-picker-option__duration">
                        {formatDuration(route.durationSeconds)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="route-picker__preview">
            <LeafletMap
              legs={[{ origin, destination, polylinePath: highlighted?.polylinePath ?? null }]}
              height={260}
              originName={origin}
              destinationName={destination}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
