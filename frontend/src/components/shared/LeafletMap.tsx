import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { decodePolyline } from '../../lib/maps';

interface LeafletMapProps {
  polylinePath?: string | null;
  legs?: Array<{ origin: string; destination: string; polylinePath?: string | null }> | null;
  originName?: string;
  destinationName?: string;
  height?: string | number;
  className?: string;
}

export function LeafletMap({
  polylinePath,
  legs,
  originName = 'Điểm đi',
  destinationName = 'Điểm đến',
  height = '350px',
  className = '',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([16.047079, 108.206230], 6); // Centered on Vietnam

      // Dark Theme Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    if (!map || !layerGroup) return;

    // Clear previous drawings
    layerGroup.clearLayers();

    const drawRoute = (polyline: string, color: string, startPopup: string, endPopup: string) => {
      const coordinates = decodePolyline(polyline);
      if (coordinates.length === 0) return null;

      // Draw Polyline
      const routePolyline = L.polyline(coordinates, {
        color,
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(layerGroup);

      // Start Marker
      const startIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
          width: 12px; 
          height: 12px; 
          background: #10B981; 
          border: 2px solid #FFFFFF; 
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker(coordinates[0], { icon: startIcon })
        .addTo(layerGroup)
        .bindPopup(startPopup);

      // End Marker
      const endIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
          width: 12px; 
          height: 12px; 
          background: #EF4444; 
          border: 2px solid #FFFFFF; 
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker(coordinates[coordinates.length - 1], { icon: endIcon })
        .addTo(layerGroup)
        .bindPopup(endPopup);

      return routePolyline;
    };

    if (legs && legs.length > 0) {
      const polylines: L.Polyline[] = [];
      legs.forEach((leg, index) => {
        if (leg.polylinePath) {
          // Alternate Colors: Green, Cyan, Blue, Purple
          const colors = ['#10B981', '#06B6D4', '#3B82F6', '#8B5CF6'];
          const color = colors[index % colors.length];
          const p = drawRoute(
            leg.polylinePath,
            color,
            `<strong>Chặng ${index + 1} xuất phát:</strong> ${leg.origin}`,
            `<strong>Chặng ${index + 1} đích đến:</strong> ${leg.destination}`
          );
          if (p) polylines.push(p);
        }
      });

      if (polylines.length > 0) {
        const bounds = L.featureGroup(polylines).getBounds();
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
        });
      }
    } else if (polylinePath) {
      const p = drawRoute(polylinePath, '#10B981', `<strong>Từ:</strong> ${originName}`, `<strong>Đến:</strong> ${destinationName}`);
      if (p) {
        map.fitBounds(p.getBounds(), {
          padding: [50, 50],
          maxZoom: 13,
        });
      }
    }

    // Recalculate container dimensions on load/tab switch
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [polylinePath, legs, originName, destinationName]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      className={className} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height, 
        borderRadius: 'var(--radius-lg, 12px)', 
        overflow: 'hidden', 
        border: '1px solid var(--border-2, #E5E7EB)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
