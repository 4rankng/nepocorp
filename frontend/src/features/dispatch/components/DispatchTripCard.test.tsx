// NEPO-32 (id 625) — widget "Đơn hàng cần điều vận": tên khách hàng / lái xe /
// tuyến dài phải hiển thị TRỌN (wrap nhiều dòng), không dấu "…"; pill biển số
// giữ nguyên 1 dòng. Cặp với pages/dispatch-orders-no-truncate.test.ts (CSS contract).

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { formatDayMonth } from '../../../lib/date';
import { DispatchTripCard } from './DispatchTripCard';
import type { NormalizedTrip } from '../../../hooks/useTripQueries';
import type { ReassignState } from '../utils';

afterEach(cleanup);

const LONG_CUSTOMER = 'CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ DỊCH VỤ VẬN TẢI ĐA QUỐC GIA HOA SEN VIỆT NAM';
const LONG_DRIVER = 'Trần Văn Minh Quang Bình Nguyên';
const ROUTE_FROM = 'Zaitoon tea, Trạm Thần, Phú Thọ, Vĩnh Yên';
const ROUTE_TO = 'Cảng Hải Phòng, Đình Vũ, Lê Lợi';
const PLATE = '15C-180.99';

const reassignState: ReassignState = {
  carrierType: 'OWN', truckId: '', driverId: '', externalCarrierId: '',
  externalPlateNumber: '', externalDriverName: '', externalDriverPhone: '',
  loading: false, error: '',
};

function renderCard(overrides: Partial<NormalizedTrip> = {}) {
  const trip = {
    id: 901,
    status: 'CREATED',
    departureDate: '2026-12-01',
    tripCode: 'TRP-202612-9001',
    customerName: LONG_CUSTOMER,
    customerReference: 'KH-0042',
    truckPlate: PLATE,
    driverName: LONG_DRIVER,
    routeName: `${ROUTE_FROM} → ${ROUTE_TO}`,
    ...overrides,
  } as unknown as NormalizedTrip;
  return render(
    <DispatchTripCard
      trip={trip}
      isEditing={false}
      reassignState={reassignState}
      setReassignState={() => {}}
      trucks={[]}
      drivers={[]}
      carrierCustomers={[]}
      onDispatch={() => {}}
      onOpenReassign={() => {}}
      onCloseReassign={() => {}}
      onReassign={() => {}}
      dispatching={false}
      actionLoadingId={null}
    />,
  );
}

it('renders long customer / driver / route names in full — zero ellipsis', () => {
  const { container } = renderCard();

  // getByText fail nếu markup cắt/biến đổi tên — tên phải TRỌN vẹn trong DOM.
  expect(screen.getByText(LONG_CUSTOMER)).toBeTruthy();
  expect(screen.getByText(LONG_DRIVER)).toBeTruthy();
  expect(screen.getByText(ROUTE_FROM)).toBeTruthy();
  expect(screen.getByText(ROUTE_TO)).toBeTruthy();

  // Không dấu "…" ở bất kỳ cell nào của widget.
  expect(container.textContent ?? '').not.toContain('…');

  // Pill biển số giữ plate nguyên vẹn — không tách, không cắt.
  expect(container.querySelector('.assign-card .ap')?.textContent).toBe(PLATE);
});

it('keeps the NGÀY cell intact: badge Hôm nay + ngày đầy đủ', () => {
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const { container } = renderCard({ departureDate: todayIso });

  expect(screen.getByText('Hôm nay')).toBeTruthy();
  expect(container.querySelector('.o-date .day')?.textContent).toBe(formatDayMonth(todayIso));
});
