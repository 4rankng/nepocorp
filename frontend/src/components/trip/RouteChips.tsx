import React from 'react';
import './RouteChips.css';
import type { RouteOption } from '../../hooks/useTripOptions';

interface RouteChipsProps {
  routes: RouteOption[];
  onSelect: (routeId: number) => void;
}

export function RouteChips({ routes, onSelect }: RouteChipsProps) {
  const visible = routes.slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div className="tc-route-suggest">
      <span className="tc-route-suggest__label">Chọn nhanh</span>
      <div className="tc-route-suggest__strip">
        {visible.map((route) => {
          const parts = route.name.split('→');
          return (
            <button
              key={route.id}
              type="button"
              className="tc-route-chip"
              title={route.name}
              onClick={() => onSelect(route.id)}
            >
              {parts[0]?.trim()}
              {parts.length > 1 && (
                <>
                  <span className="tc-route-chip__arrow">→</span>
                  {parts[1]?.trim()}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
