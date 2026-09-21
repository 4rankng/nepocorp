import { describe, expect, it } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { draftChanged, figuresPayloadFromDraft, invalidQuickField, quickDraftFromTrip } from './trip-list-helpers';

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

describe('quick edit money parsing (kanban 20260921_3)', () => {
  it('saves revenue typed with Vietnamese thousand separators', () => {
    const draft = { ...quickDraftFromTrip(trip({ revenue: '0' })), revenue: '1.000.000' };

    // Before the fix a grouped amount parsed to NaN and the save wrote revenue 0.
    expect(figuresPayloadFromDraft(trip({ revenue: '0' }), draft).revenue).toBe(1_000_000);
  });

  it('accepts a comma-grouped amount too', () => {
    const draft = { ...quickDraftFromTrip(trip({ revenue: '0' })), revenue: '1,000,000' };

    expect(figuresPayloadFromDraft(trip({ revenue: '0' }), draft).revenue).toBe(1_000_000);
  });

  it('keeps a decimal litre value', () => {
    const draft = { ...quickDraftFromTrip(trip()), fuelLiters: '120.5' };

    expect(figuresPayloadFromDraft(trip(), draft).fuelLitersOverride).toBe(120.5);
  });

  it('flags a non-numeric amount instead of silently saving 0', () => {
    const draft = { ...quickDraftFromTrip(trip()), revenue: 'một triệu' };

    expect(invalidQuickField(draft)).toBe('revenue');
    expect(invalidQuickField({ ...draft, revenue: '1000000' })).toBeNull();
  });

  it('treats an emptied field as a deliberate zero/clear', () => {
    const draft = { ...quickDraftFromTrip(trip()), revenue: '' };

    expect(invalidQuickField(draft)).toBeNull();
    expect(figuresPayloadFromDraft(trip(), draft).revenue).toBe(0);
  });
});

describe('quick edit figures payload without route legs (kanban 20260921_3)', () => {
  it('omits legs for a trip that has none, so the save is not rejected', () => {
    const legless = trip({ legs: [] });
    const payload = figuresPayloadFromDraft(legless, quickDraftFromTrip(legless));

    expect('legs' in payload).toBe(false);
  });

  it('sends the legs it has', () => {
    const withLegs = trip({
      legs: [{ sequence: 1, origin: 'Hải Phòng', destination: 'Bắc Ninh', km: 120, loadingType: 'HANG' }] as TripDetail['legs'],
    });
    const payload = figuresPayloadFromDraft(withLegs, quickDraftFromTrip(withLegs));

    expect(payload.legs).toEqual([{ sequence: 1, origin: 'Hải Phòng', destination: 'Bắc Ninh', km: 120, loadingType: 'HANG' }]);
  });
});
