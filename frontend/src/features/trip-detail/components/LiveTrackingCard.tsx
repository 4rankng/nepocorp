import { Camera, Gauge, Fuel, Wrench, Clock, User, MapPin, Signal, RefreshCw } from 'lucide-react';
import type { LiveFleetVehicle, LiveFleetDetails } from '@tingting/shared';
import { LIVE_STATUS_COLOR, LIVE_STATUS_LABEL } from '../../../lib/liveFleet';
import { formatDateTimeVN } from '../../../lib/format';

/**
 * Live GPS telemetry for a trip's assigned truck — everything Bách Khoa exposes
 * for the device (portal endpoint). Rendered on the trip-detail page when the
 * trip is IN_TRANSIT. Fields are nullable: devices vary (no camera, no odometer,
 * no driver-card, etc.).
 */
interface LiveTrackingCardProps {
  vehicle: LiveFleetVehicle;
}

const MONO = "'JetBrains Mono', monospace";

function Num({ value, unit }: { value: number | null | undefined; unit?: string }) {
  if (value === null || value === undefined) return <span style={{ color: '#9CA3AF' }}>—</span>;
  return (
    <span style={{ fontFamily: MONO }}>
      {value.toLocaleString('vi-VN')}
      {unit ? ` ${unit}` : ''}
    </span>
  );
}

function Txt({ value }: { value: string | null | undefined }) {
  if (!value) return <span style={{ color: '#9CA3AF' }}>—</span>;
  return <span>{value}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border-2, #ECEFF1)' }}>
      <span style={{ color: 'var(--text-2, #6B7280)', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '14px 0 2px', color: 'var(--text-3, #9CA3AF)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {icon} {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function LiveTrackingCard({ vehicle }: LiveTrackingCardProps) {
  const d: LiveFleetDetails | null | undefined = vehicle.details;
  const color = LIVE_STATUS_COLOR[vehicle.status];
  const updated = formatDateTimeVN(vehicle.lastSeenAt);

  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="hicon" style={{ width: 22, height: 22 }}><MapPin size={14} /></span>
            Giám sát hành trình
          </h2>
          <span style={{ background: `${color}22`, color, padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
            {LIVE_STATUS_LABEL[vehicle.status]}
          </span>
        </div>
        <span title="Cập nhật tự động mỗi 25 giây" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3, #9CA3AF)' }}>
          <RefreshCw size={11} /> {updated}
        </span>
      </div>

      {/* Live camera snapshot */}
      {d?.cameraImage && (
        <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-2, #ECEFF1)', position: 'relative' }}>
          <img
            src={d.cameraImage}
            alt="Ảnh camera"
            style={{ display: 'block', width: '100%', maxHeight: 220, objectFit: 'cover' }}
            onError={(e) => { (e.currentTarget.parentElement!.style.display = 'none'); }}
          />
          <span style={{ position: 'absolute', left: 8, top: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Camera size={11} /> Camera
          </span>
        </div>
      )}

      {/* Position & motion */}
      <Section icon={<Gauge size={12} />} title="Vị trí & chuyển động">
        <Row label="Biển số"><span style={{ fontWeight: 700 }}>{vehicle.licensePlate}</span></Row>
        <Row label="Tốc độ"><Num value={Math.round(vehicle.speed)} unit="km/h" /></Row>
        <Row label="Động cơ">{vehicle.ignitionOn ? 'Bật' : 'Tắt'}</Row>
        {vehicle.angle ? <Row label="Hướng"><Num value={vehicle.angle} unit="°" /></Row> : null}
        <Row label="Địa điểm"><Txt value={vehicle.address} /></Row>
      </Section>

      {/* Fuel */}
      <Section icon={<Fuel size={12} />} title="Nhiên liệu">
        <Row label="Dầu (lít)"><Num value={vehicle.fuel} /></Row>
        {d ? <Row label="% dầu"><Num value={d.fuelPercent} unit="%" /></Row> : null}
      </Section>

      {d && (
        <>
          {/* Odometer / vehicle */}
          <Section icon={<MapPin size={12} />} title="Đồng hồ & xe">
            <Row label="Tổng số km"><Num value={d.odometerKm} unit="km" /></Row>
            <Row label="km hôm nay"><Num value={d.kmToday} unit="km" /></Row>
            <Row label="Model xe"><Txt value={d.modelCar} /></Row>
          </Section>

          {/* Engine & power */}
          <Section icon={<Wrench size={12} />} title="Động cơ & điện">
            <Row label="Đề máy từ"><Txt value={d.engineSince} /></Row>
            <Row label="Cửa"><Txt value={d.doorStatus} /></Row>
            <Row label="Điều hòa"><Txt value={d.airConditioning} /></Row>
            <Row label="Ắc quy"><Txt value={d.batteryV} /></Row>
          </Section>

          {/* Driving behaviour */}
          <Section icon={<Clock size={12} />} title="Thời gian lái">
            <Row label="Lái (phiên)"><Txt value={d.drivingTime} /></Row>
            <Row label="Lái hôm nay"><Txt value={d.drivingTimeToday} /></Row>
            <Row label="Số lần dừng"><Num value={d.stopCount} /></Row>
            <Row label="Quá tốc độ"><Num value={d.overSpeedCount} /></Row>
            <Row label="Thời gian đỗ"><Txt value={d.parkedTime} /></Row>
          </Section>

          {/* Signal */}
          <Section icon={<Signal size={12} />} title="Tín hiệu">
            <Row label="GPS">{vehicle.status === 'offline' ? 'Mất' : 'Có'}</Row>
            <Row label="GSM"><Num value={d.signalDb} unit="dB" /></Row>
          </Section>

          {/* Driver (device card) */}
          <Section icon={<User size={12} />} title="Lái xe (thẻ thiết bị)">
            <Row label="GPLX"><Txt value={d.driverLicense} /></Row>
            <Row label="Hết hạn GPLX"><Txt value={d.licenseExpiry} /></Row>
            <Row label="SĐT">
              {d.driverPhone ? <a href={`tel:${d.driverPhone}`} style={{ color: 'var(--brand, #00B14F)' }}>{d.driverPhone}</a> : <span style={{ color: '#9CA3AF' }}>—</span>}
            </Row>
          </Section>
        </>
      )}

      {!d && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2, #F5F7F6)', borderRadius: 8, fontSize: 12, color: 'var(--text-2, #6B7280)' }}>
          Chi tiết mở rộng (camera, đồng hồ, thời gian lái…) chỉ khả dụng khi nguồn dữ liệu là cổng portal.
        </div>
      )}
    </section>
  );
}
