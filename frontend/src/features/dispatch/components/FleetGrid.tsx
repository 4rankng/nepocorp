import { Clock, UserX, Wrench } from 'lucide-react';
import { getInitials } from '../../../lib/avatar';
import { formatDayMonth } from '../../../lib/date';
import { avatarColorClass } from '../utils';
import type { Driver, Truck } from '../utils';
import type { NormalizedTrip } from '../../../hooks/useTripQueries';

interface FleetGridProps {
  trucks: Truck[];
  activeTrips: NormalizedTrip[];
  drivers: Driver[];
  onTripClick: (tripId: number) => void;
}

function getActiveTripForTruck(truckId: number, activeTrips: NormalizedTrip[]) {
  return activeTrips.find((t) => t.truckId === truckId);
}

function getDefaultDriverForTruck(truckId: number, drivers: Driver[]) {
  return drivers.find((d) => d.assignedTruckId === truckId);
}

export function FleetGrid({ trucks, activeTrips, drivers, onTripClick }: FleetGridProps) {
  if (trucks.length === 0) {
    return (
      <div style={{ gridColumn: '1 / -1', padding: '32px 40px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <img src="/assets/illustrations/empty-fleet.svg" alt="" aria-hidden="true" style={{ width: 160, height: 132, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        Không có xe nào trong nhóm này.
      </div>
    );
  }

  return (
    <>
      {trucks.map((truck) => {
        const activeTrip = getActiveTripForTruck(truck.id, activeTrips);
        const defDriver = getDefaultDriverForTruck(truck.id, drivers);
        const isMaint = truck.status === 'MAINTENANCE';
        const onClickCard = activeTrip ? () => onTripClick(activeTrip.id) : undefined;

        let pill: { cls: string; text: string };
        if (isMaint) pill = { cls: 'pill-maint', text: 'Bảo dưỡng' };
        else if (activeTrip) pill = { cls: 'pill-running', text: 'Đang chạy' };
        else if (defDriver) pill = { cls: 'pill-ready', text: 'Sẵn sàng' };
        else pill = { cls: 'pill-noassign', text: 'Chưa giao' };

        return (
          <div key={truck.id} className={`vcard${onClickCard ? ' is-clickable' : ''}`} onClick={onClickCard}>
            <div className="vcard-top">
              <span className={`plate${isMaint ? ' maint' : ''}`}>{truck.licensePlate}</span>
              <span className={`status-pill ${pill.cls}`}><span className="sd" />{pill.text}</span>
            </div>
            <div className="v-driver-row">
              {isMaint ? <div className="no-driver"><Wrench size={14} /> Bảo dưỡng định kỳ</div>
              : activeTrip ? <><div className={`driver-avatar ${avatarColorClass(activeTrip.driverId)}`}>{getInitials(activeTrip.driverName)}</div><div><div className="driver-name">{activeTrip.driverName}</div><div className="driver-meta">Tài xế đang chạy</div></div></>
              : defDriver ? <><div className={`driver-avatar ${avatarColorClass(defDriver.id)}`}>{getInitials(defDriver.name)}</div><div><div className="driver-name">{defDriver.name}</div><div className="driver-meta">Tài xế chính</div></div></>
              : <div className="no-driver"><UserX size={14} /> Chưa giao tài xế</div>}
            </div>
            {activeTrip && (
              <div className="v-body">
                <div className="vrow"><span className="lab">Tuyến</span><span className="val">{activeTrip.routeName}</span></div>
                <div className="vrow"><span className="lab">Khách</span><span className="val">{activeTrip.customerName}</span></div>
              </div>
            )}
            <div className="v-bottom-meta">
              {activeTrip ? <><Clock size={12} /> Khởi hành {formatDayMonth(activeTrip.departureDate)}</>
              : isMaint ? <><Wrench size={12} /> Bảo dưỡng</>
              : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
