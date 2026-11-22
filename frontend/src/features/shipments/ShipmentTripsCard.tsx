/**
 * Chuyến liên quan card — truck trips hanging off the lô (NEPO-61).
 * Read-only: the link lives on the trip side (TripEdit → shipmentId); this
 * card only lists what the lô detail payload returns.
 */
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import type { ShipmentTripRow } from '@tingting/shared';
import { formatCurrency, formatDatePadded } from '../../lib/format';
import { tripStatusLabel, tripStatusColor } from './shipmentDisplay';
import './shipment-cards.css';

interface Props {
  trips: ShipmentTripRow[];
}

export default function ShipmentTripsCard({ trips }: Props) {
  return (
    <section className="shipment-card" data-testid="shipment-trips">
      <div className="shipment-card__head">
        <Truck size={15} aria-hidden="true" />
        <span className="shipment-card__title">Chuyến liên quan</span>
        <small className="shipment-card__count">{trips.length}</small>
      </div>

      {trips.length === 0 ? (
        <div className="shipment-card__empty">
          Chưa có chuyến nào gắn vào lô — gắn từ màn sửa chuyến (Lô hàng → chọn mã lô).
        </div>
      ) : (
        <div className="table-scroll">
          <table className="shipment-trips-table">
            <thead>
              <tr>
                <th>Mã chuyến</th>
                <th>Biển số</th>
                <th>Trạng thái</th>
                <th>Ngày chạy</th>
                <th className="num">Doanh thu</th>
                <th className="num">Tổng chi</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/trips/${t.id}`} className="shipment-trips-table__code">
                      {t.tripCode ?? `#${t.id}`}
                    </Link>
                  </td>
                  <td>{t.plate ?? '—'}</td>
                  <td>
                    <span
                      className="shipment-trips-table__status"
                      style={{ color: tripStatusColor(t.status) }}
                    >
                      {tripStatusLabel(t.status)}
                    </span>
                  </td>
                  <td className="shipment-trips-table__date">{formatDatePadded(t.departureDate ?? null)}</td>
                  <td className="num shipment-trips-table__money">{formatCurrency(t.revenue)}</td>
                  <td className="num shipment-trips-table__money">{formatCurrency(t.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
