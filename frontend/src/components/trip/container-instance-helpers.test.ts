import { describe, expect, it } from 'vitest';
import { buildContainerBatchPayload, emptyRow, type ContainerRow } from './container-instance-helpers';

const row = (overrides: Partial<ContainerRow> = {}): ContainerRow => ({
  ...emptyRow(),
  ...overrides,
});

describe('buildContainerBatchPayload — container type must survive number/seal edits', () => {
  it('omits containerTypeId for a persisted row whose type is unknown, instead of sending null', () => {
    const [item] = buildContainerBatchPayload([row({ id: 465, containerNumber: 'VSGU4251046' })]);

    // Absent = "keep the stored type"; null would wipe what the planner chose.
    expect('containerTypeId' in item).toBe(false);
  });

  it('sends the stored type for a persisted row that has one', () => {
    const [item] = buildContainerBatchPayload([row({ id: 465, containerTypeId: 4, containerNumber: 'VSGU4251046' })]);

    expect(item.containerTypeId).toBe(4);
  });

  it('sends an explicit null for a brand-new row without a type', () => {
    const [item] = buildContainerBatchPayload([row({ containerNumber: 'TSTU0000001' })]);

    expect(item.id).toBeUndefined();
    expect(item.containerTypeId).toBeNull();
  });

  it('trims the container number and keeps only filled seals', () => {
    const [item] = buildContainerBatchPayload([row({
      id: 7,
      containerTypeId: 2,
      containerNumber: '  TSTU0000002  ',
      seals: [
        { _key: 'a', sealNumber: ' VS667604 ', sealType: ' Customs ', notes: '' },
        { _key: 'b', sealNumber: '   ', sealType: '', notes: '' },
      ],
    })]);

    expect(item.containerNumber).toBe('TSTU0000002');
    expect(item.seals).toEqual([{ id: undefined, sealNumber: 'VS667604', sealType: 'Customs', notes: null }]);
  });

  it('maps an empty container number and weight to null rather than NaN', () => {
    const [item] = buildContainerBatchPayload([row({ id: 9, containerTypeId: 1 })]);

    expect(item.containerNumber).toBeNull();
    expect(item.cargoWeightKg).toBeNull();
  });
});
