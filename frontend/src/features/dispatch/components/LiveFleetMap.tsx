import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LoadingType } from '@tingting/shared';
import type { LiveFleetVehicle } from '@tingting/shared';
import { LIVE_STATUS_COLOR, LIVE_STATUS_LABEL, liveMarkerIcon, escapeHtml } from '../../../lib/liveFleet';
import { computeRemainingRoute } from '../../../lib/liveRoute';

/**
 * Live fleet map (Dispatch page). For each truck on an active trip:
 *  - live marker (colored by status)
 *  - remaining route to its destination (detected current leg via heading → đi/về)
 *  - destination marker
 * Polled every ~25s; redraws each refresh, refits bounds only when the truck
 * set changes. Marker styling lives in lib/liveFleet.ts; leg detection in
 * lib/liveRoute.ts. leaflet.css is imported globally in main.tsx.
 */

interface LiveFleetMapProps {
  vehicles: LiveFleetVehicle[];
  height?: string;
}

function formatLastSeen(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { hour12: false });
}

function popupHtml(v: LiveFleetVehicle): string {
  const e = escapeHtml;
  const color = LIVE_STATUS_COLOR[v.status];
  const label = LIVE_STATUS_LABEL[v.status];
  const mono = "font-family:'JetBrains Mono', monospace;";
  const sans = "font-family:'Be Vietnam Pro', sans-serif;";
  return `<div style="min-width:210px; ${sans} font-size:13px; line-height:1.5;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
      <strong style="font-size:14px;">${e(v.licensePlate)}</strong>
      <span style="background:${color}22; color:${color}; padding:1px 8px; border-radius:999px; font-size:11px; font-weight:600;">${label}</span>
    </div>
    ${v.tripCode ? `<div>Mã chuyến: <span style="${mono}">${e(v.tripCode)}</span></div>` : ''}
    ${v.customerName ? `<div>Khách hàng: ${e(v.customerName)}</div>` : ''}
    ${v.routeName ? `<div>Tuyến: ${e(v.routeName)}</div>` : ''}
    <div>Tốc độ: <span style="${mono}">${Math.round(v.speed)} km/h</span> · ${v.ignitionOn ? 'động cơ bật' : 'động cơ tắt'}</div>
    ${v.driverName ? `<div>Lái xe: ${e(v.driverName)}</div>` : ''}
    ${v.address ? `<div style="color:#6B7280;">${e(v.address)}</div>` : ''}
    <div style="color:#9CA3AF; font-size:11px; margin-top:4px;">Cập nhật: ${formatLastSeen(v.lastSeenAt)}</div>
  </div>`;
}

function destinationIcon(loadingType: LoadingType): L.DivIcon {
  const color = loadingType === LoadingType.HANG ? '#00B14F' : '#6B7280';
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="font-size:22px; line-height:1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
        <span style="color:${color};">📍</span>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 22],
    popupAnchor: [0, -20],
  });
}

export function LiveFleetMap({ vehicles, height = '380px' }: LiveFleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  // Refit bounds only when trucks enter/leave — not on every 25s refresh.
  const markerSetKeyRef = useRef<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([16.047079, 108.206230], 6); // Centered on Vietnam
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear + redraw each refresh: positions update, stale markers vanish.
    layerGroup.clearLayers();
    if (vehicles.length === 0) return;

    const truckMarkers: L.Marker[] = [];
    const destMarkers: L.Marker[] = [];

    for (const v of vehicles) {
      // Remaining route to destination (current leg detected via heading).
      if (v.legs && v.legs.length > 0) {
        // Heading only disambiguates đi/về while the truck is actually moving —
        // when stopped the reported angle is often 0/stale, which would bias leg
        // selection toward a north-bound leg. Pass undefined so proximity wins.
        const route = computeRemainingRoute(
          v.lat,
          v.lng,
          v.status === 'moving' ? v.angle : undefined,
          v.legs,
        );
        if (route) {
          if (route.remainingPath.length >= 2) {
            L.polyline(route.remainingPath, {
              color: route.loadingType === LoadingType.HANG ? '#00B14F' : '#6B7280',
              weight: 4,
              opacity: 0.7,
              dashArray: '6 8',
              lineJoin: 'round',
            }).addTo(layerGroup);
          }
          if (route.destinationPoint) {
            destMarkers.push(
              L.marker(route.destinationPoint, { icon: destinationIcon(route.loadingType), zIndexOffset: 500 })
                .addTo(layerGroup)
                .bindPopup(
                  `<strong>${escapeHtml(route.destinationName)}</strong><br/>` +
                  `${route.loadingType === LoadingType.HANG ? 'Chuyến đi (có hàng)' : 'Chuyến về (chạy vỏ)'}<br/>` +
                  `Còn <span style="font-family:'JetBrains Mono',monospace;">${route.distanceKm.toFixed(1)}</span> km`,
                ),
            );
          }
        }
      }

      truckMarkers.push(
        L.marker([v.lat, v.lng], { icon: liveMarkerIcon(v.status, v.angle), zIndexOffset: 1000 })
          .addTo(layerGroup)
          .bindPopup(popupHtml(v)),
      );
    }

    const setKey = vehicles.map((v) => v.truckId).sort((a, b) => a - b).join(',');
    if (setKey !== markerSetKeyRef.current) {
      markerSetKeyRef.current = setKey;
      const all = [...truckMarkers, ...destMarkers];
      if (all.length > 0) {
        map.fitBounds(L.featureGroup(all).getBounds(), { padding: [50, 50], maxZoom: 13 });
      }
    }

    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [vehicles]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
        markerSetKeyRef.current = '';
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height,
        borderRadius: 'var(--radius-lg, 12px)',
        overflow: 'hidden',
        border: '1px solid var(--border-2, #E5E7EB)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
