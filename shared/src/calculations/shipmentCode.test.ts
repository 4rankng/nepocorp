import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShipmentCode,
  shipmentCodePrefix,
  shipmentCodeSeqRe,
} from './shipmentCode';

// NEPO-61 — auto-code contract [Mã KH][Năm][STT], e.g. MCT26026.
// These pins are the format contract shared by the backend generator and the
// UI display; the backend max-seq scan mirrors shipmentCodeSeqRe exactly.
describe('shipmentCodePrefix', () => {
  test('keeps ASCII alphanumerics and uppercases', () => {
    assert.equal(shipmentCodePrefix('mct'), 'MCT');
    assert.equal(shipmentCodePrefix('MCT'), 'MCT');
    assert.equal(shipmentCodePrefix('Tmt'), 'TMT');
  });

  test('strips Vietnamese diacritics and đ/Đ', () => {
    assert.equal(shipmentCodePrefix('Mộc Trà'), 'MOCTRA');
    assert.equal(shipmentCodePrefix('Đà Lạt'), 'DALAT');
  });

  test('strips punctuation and whitespace', () => {
    assert.equal(shipmentCodePrefix('MCT - 01'), 'MCT01');
    // Cap 6: 'CTYTNHHXNK' truncates to the first 6 usable chars.
    assert.equal(shipmentCodePrefix('Cty TNHH XNK'), 'CTYTNH');
  });

  test('caps at 6 characters', () => {
    assert.equal(shipmentCodePrefix('MOCTRACOA').length, 6);
    assert.equal(shipmentCodePrefix('MOCTRACOA'), 'MOCTRA');
  });

  test('returns empty string for unusable input', () => {
    assert.equal(shipmentCodePrefix(''), '');
    assert.equal(shipmentCodePrefix('---'), '');
  });
});

describe('buildShipmentCode', () => {
  test('formats [prefix][YY][STT×3] — the MCT26026 shape', () => {
    assert.equal(buildShipmentCode('MCT', 2026, 26), 'MCT26026');
    assert.equal(buildShipmentCode('TMT', 2026, 4), 'TMT26004');
  });

  test('zero-pads the year to 2 digits and the sequence to 3', () => {
    assert.equal(buildShipmentCode('ABC', 2027, 1), 'ABC27001');
    assert.equal(buildShipmentCode('ABC', 2099, 999), 'ABC99999');
  });

  test('sequence beyond 999 grows (never truncated)', () => {
    assert.equal(buildShipmentCode('MCT', 2026, 1000), 'MCT261000');
  });
});

describe('shipmentCodeSeqRe', () => {
  test('matches codes of the same customer+year and captures the seq tail', () => {
    const re = shipmentCodeSeqRe('MCT', 2026);
    assert.ok(re.test('MCT26026'));
    assert.equal(re.exec('MCT26026')?.[1], '026');
    assert.ok(re.test('MCT261000'));
    assert.equal(re.exec('MCT261000')?.[1], '1000');
  });

  test('rejects other customers and other years', () => {
    const re = shipmentCodeSeqRe('MCT', 2026);
    assert.ok(!re.test('TMT26001'));
    assert.ok(!re.test('MCT25001'));
    assert.ok(!re.test('MCTA26001'));
  });

  test('mirrors buildShipmentCode for every sample', () => {
    for (let seq = 1; seq <= 12; seq += 1) {
      const code = buildShipmentCode('MCT', 2026, seq);
      const match = shipmentCodeSeqRe('MCT', 2026).exec(code);
      assert.ok(match, `expected ${code} to match`);
      assert.equal(Number(match![1]), seq);
    }
  });
});
