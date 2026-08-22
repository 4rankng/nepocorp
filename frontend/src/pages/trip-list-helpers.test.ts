import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { draftChanged, figuresPayloadFromDraft, quickDraftFromTrip } from './trip-list-helpers';

const trip = (overrides: Partial<TripDetail> = {}): TripDetail => ({
  id: 12,
  tripCode: 'LC-0012',
  departureDate: '2026-08-10',
  carrierType: 'OWN',
  status: TripStatus.COMPLETED,
  version: 3,
  revenue: '10800000',
  totalRoadAllowance: '2480000',
  roadAllowanceOverride: null,
  twoPointDeliveryBonus: '100000',
  driverSalary: '500000',
  fuelLiters: '120',
  fuelLitersOverride: null,
  legs: [],
  ...overrides,
} as TripDetail);

describe('quick edit road allowance round-trip', () => {
  it('seeds the road draft with the component before the two-point bonus', () => {
    const draft = quickDraftFromTrip(trip());

    // 2,480,000 received includes the 100,000 two-point payment; the editable
    // road component is the 2,380,000 the override field actually controls.
    expect(draft.roadAllowance).toBe('2380000');
  });

  it('seeds an existing override as-is', () => {
    const draft = quickDraftFromTrip(trip({ roadAllowanceOverride: '2500000' }));

    expect(draft.roadAllowance).toBe('2500000');
  });

  it('does not subtract the bonus for external trips', () => {
    const draft = quickDraftFromTrip(trip({ carrierType: 'EXTERNAL', totalRoadAllowance: '0' }));

    expect(draft.roadAllowance).toBe('');
  });

  it('keeps the road recompute path when the draft is untouched', () => {
    const original = quickDraftFromTrip(trip());
    const payload = figuresPayloadFromDraft(trip(), original);

    // Sending the bonus-inclusive total as an override would make the server
    // add the two-point payment on top of itself on every save.
    expect(payload.roadAllowanceOverride).toBeNull();
  });

  it('preserves an existing override when the road draft is untouched', () => {
    const overridden = trip({ roadAllowanceOverride: '2500000' });
    const payload = figuresPayloadFromDraft(overridden, quickDraftFromTrip(overridden));

    expect(payload.roadAllowanceOverride).toBe(2_500_000);
  });

  it('sends the edited value when the road draft changes', () => {
    const draft = { ...quickDraftFromTrip(trip()), roadAllowance: '2600000' };

    expect(draftChanged(trip(), draft)).toBe(true);
    expect(figuresPayloadFromDraft(trip(), draft).roadAllowanceOverride).toBe(2_600_000);
  });

  it('clears the override when the road draft is emptied', () => {
    const draft = { ...quickDraftFromTrip(trip()), roadAllowance: '' };

    expect(figuresPayloadFromDraft(trip(), draft).roadAllowanceOverride).toBeNull();
  });
});
