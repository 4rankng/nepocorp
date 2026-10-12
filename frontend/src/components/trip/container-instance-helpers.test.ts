import { describe, expect, it } from 'vitest';
import { buildContainerBatchPayload, emptyRow, rebindSavedContainerRows, type ContainerRow, type ServerContainer } from './container-instance-helpers';

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

  it('sends the row _key as clientKey so the server can echo back the exact row identity', () => {
    const r = row({ id: 9, containerNumber: 'TSTU0000001' });
    const [item] = buildContainerBatchPayload([r]);

    expect(item.clientKey).toBe(r._key);
  });
});

describe('rebindSavedContainerRows — every photo/seal stays on its own container', () => {
  // Prod trip TRP-202610-0029: the editor pool holds an empty padding row
  // before the captured rows, container numbers are blank (the optional field
  // was never filled), and the server responds in id order rather than payload
  // order. The old content/position match ("first blank row of the same type")
  // assigned row A's buffered photo to row B's container and dropped row C's.
  const savedItem = (id: number, clientKey: string | null, over: Partial<ServerContainer> = {}): ServerContainer => ({
    id,
    clientKey,
    containerNumber: null,
    seals: [],
    photos: [],
    ...over,
  });

  it('binds each row to its own container by echoed clientKey — blank numbers, empty pool rows, reordered response', () => {
    const padding = row();
    const rowA = row({ containerNumber: '', photoKeys: { cont: ['blob:a'], seal: ['blob:a-seal'] } });
    const rowB = row({ containerNumber: '', photoKeys: { cont: ['blob:b'], seal: [] } });
    const rowC = row({ containerNumber: '', photoKeys: { cont: [], seal: ['blob:c-seal'] } });

    const { rows, rowKeyToContainerId } = rebindSavedContainerRows(
      [
        savedItem(623, rowC._key),
        savedItem(621, rowA._key),
        savedItem(622, rowB._key),
      ],
      [padding, rowA, rowB, rowC],
    );

    expect(rowKeyToContainerId.get(rowA._key)).toBe(621);
    expect(rowKeyToContainerId.get(rowB._key)).toBe(622);
    expect(rowKeyToContainerId.get(rowC._key)).toBe(623);
    // The empty padding row never existed server-side — it must not steal a
    // binding, and nothing may bind to its key.
    expect(rowKeyToContainerId.has(padding._key)).toBe(false);
    // Each row keeps its own photo previews (flush swaps them in place).
    expect(rows.map((r) => r.photoKeys)).toEqual([rowC.photoKeys, rowA.photoKeys, rowB.photoKeys]);
  });

  it('keeps seal slots and their photos together when the server returns seals in another order', () => {
    const r = row({
      id: 620,
      seals: [
        { _key: 's1', sealNumber: 'SEAL1', sealType: '', notes: '' },
        { _key: 's2', sealNumber: 'SEAL2', sealType: '', notes: '' },
      ],
      photoKeys: { cont: [], seal: ['seal-photo-1', 'seal-photo-2'] },
    });

    const { rows } = rebindSavedContainerRows(
      [savedItem(620, r._key, {
        seals: [
          { id: 22, sealNumber: 'SEAL2' },
          { id: 21, sealNumber: 'SEAL1' },
        ],
      })],
      [r],
    );

    expect(rows[0].seals.map((s) => [s.id, s._key, s.sealNumber])).toEqual([
      [21, 's1', 'SEAL1'],
      [22, 's2', 'SEAL2'],
    ]);
    expect(rows[0].photoKeys.seal).toEqual(['seal-photo-1', 'seal-photo-2']);
  });

  it('falls back to the stable server id when the server does not echo a clientKey', () => {
    const r = row({ id: 620, containerNumber: 'YMMU7399456' });

    const { rows, rowKeyToContainerId } = rebindSavedContainerRows([savedItem(620, null)], [r]);

    expect(rows[0]._key).toBe(r._key);
    expect(rowKeyToContainerId.get(r._key)).toBe(620);
  });

  it('gives an unknown item (concurrently-added container) a fresh row without touching the others', () => {
    const r = row({ id: 620, photoKeys: { cont: ['cont-photo'], seal: [] } });

    const { rows, rowKeyToContainerId } = rebindSavedContainerRows(
      [savedItem(620, r._key), savedItem(624, null)],
      [r],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]._key).toBe(r._key);
    expect(rows[0].photoKeys.cont).toEqual(['cont-photo']);
    expect(rows[1]._key).not.toBe(r._key);
    expect(rowKeyToContainerId.get(r._key)).toBe(620);
  });
});
