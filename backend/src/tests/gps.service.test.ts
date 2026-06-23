import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePlate,
  parseBachKhoaDate,
  parseAspDate,
  isStale,
  deriveStatus,
  reviveDate,
} from '../services/gps.service';
import { parseBachKhoaResponse } from '@tingting/shared';
import type { BachKhoaVehicle } from '@tingting/shared';

const vehicle = (over: Partial<BachKhoaVehicle>): BachKhoaVehicle => ({
  Message: 'OK',
  NumberPlate: '15C-160.55',
  DeviceID: '602752',
  DriverName: null,
  DriverLicense: null,
  Date: '10:15:50 - 26/11/2018',
  Lt: 21.003803,
  Ln: 105.910861,
  Address: null,
  Angle: 0,
  CarStatus: null,
  Speed: 0,
  Acc: null,
  Oil: 0,
  ...over,
});

describe('normalizePlate', () => {
  test('strips separators + uppercases (dash/dot/space variance)', () => {
    assert.equal(normalizePlate('15C-160.55'), '15C16055');
    assert.equal(normalizePlate('15c.160.55'), '15C16055');
    assert.equal(normalizePlate(' 15C 160 55 '), '15C16055');
  });

  test('our DB format matches the provider documented format', () => {
    // Our trucks: "15C-136.31"; provider doc: "15C-160.55" → both normalize equal-shape.
    assert.equal(normalizePlate('15C-136.31').length, normalizePlate('15C-160.55').length);
  });

  test('nullish / empty → empty string', () => {
    assert.equal(normalizePlate(null), '');
    assert.equal(normalizePlate(undefined), '');
    assert.equal(normalizePlate(''), '');
  });
});

describe('parseBachKhoaDate', () => {
  test('parses "HH:mm:ss - dd/MM/yyyy" as Vietnam local (UTC+7)', () => {
    // 10:15:50 on 26/11/2018 in UTC+7 = 03:15:50Z same day.
    const d = parseBachKhoaDate('10:15:50 - 26/11/2018');
    assert.ok(d);
    assert.equal(d!.toISOString(), '2018-11-26T03:15:50.000Z');
  });

  test('null / undefined / malformed → null', () => {
    assert.equal(parseBachKhoaDate(null), null);
    assert.equal(parseBachKhoaDate(undefined), null);
    assert.equal(parseBachKhoaDate(''), null);
    assert.equal(parseBachKhoaDate('not a date'), null);
  });
});

describe('isStale', () => {
  test('null date → stale', () => {
    assert.equal(isStale(null), true);
  });

  test('fresh within 10min threshold', () => {
    assert.equal(isStale(new Date(Date.now() - 5 * 60_000)), false);
  });

  test('stale beyond 10min threshold', () => {
    assert.equal(isStale(new Date(Date.now() - 11 * 60_000)), true);
  });
});

describe('deriveStatus', () => {
  test('stale → offline regardless of speed', () => {
    assert.equal(deriveStatus(true, false, 60), 'offline');
  });

  test('lostSignal → offline', () => {
    assert.equal(deriveStatus(false, true, 0), 'offline');
  });

  test('speed > 0 → moving', () => {
    assert.equal(deriveStatus(false, false, 50), 'moving');
  });

  test('speed 0 → stopped', () => {
    assert.equal(deriveStatus(false, false, 0), 'stopped');
  });
});

describe('parseAspDate', () => {
  test('parses /Date(epoch)/ → Date', () => {
    const d = parseAspDate('/Date(1782217250000)/');
    assert.ok(d);
    assert.equal(d!.getTime(), 1782217250000);
  });

  test('null / malformed → null', () => {
    assert.equal(parseAspDate(null), null);
    assert.equal(parseAspDate('not a date'), null);
    assert.equal(parseAspDate(''), null);
  });
});

describe('reviveDate', () => {
  // Regression: getLiveFleet caches the provider payload in Redis as JSON, which
  // flattens `lastSeenAt: Date` to an ISO string. On a cache hit the value is a
  // string, so `isStale(date)` crashed at `date.getTime()` (HTTP 500 on
  // /api/trips/live-fleet). reviveDate restores the typed Date | null model.
  test('revives a JSON-round-tripped ISO string back to a Date', () => {
    const d = reviveDate('2018-11-26T03:15:50.000Z');
    assert.ok(d instanceof Date);
    assert.equal(d!.toISOString(), '2018-11-26T03:15:50.000Z');
  });

  test('passes a real Date through unchanged', () => {
    const original = new Date('2018-11-26T03:15:50.000Z');
    assert.equal(reviveDate(original), original);
  });

  test('null / undefined / empty / garbage → null', () => {
    assert.equal(reviveDate(null), null);
    assert.equal(reviveDate(undefined), null);
    assert.equal(reviveDate(''), null);
    assert.equal(reviveDate('not a date'), null);
  });

  test('isStale does not throw when fed a revived string (the original crash)', () => {
    const tenSecondsAgoIso = new Date(Date.now() - 10_000).toISOString();
    assert.equal(isStale(reviveDate(tenSecondsAgoIso)), false);
  });
});

describe('parseBachKhoaResponse (shared)', () => {
  test('array parsed; drops rows with no plate or no GPS fix', () => {
    const res = parseBachKhoaResponse([
      vehicle({ NumberPlate: '15C-160.55' }),                    // kept
      vehicle({ NumberPlate: '', Lt: 21, Ln: 105 }),             // dropped: no plate
      vehicle({ NumberPlate: '15C-139.82', Lt: 0, Ln: 0 }),      // dropped: no fix
    ]);
    assert.equal(res.length, 1);
    assert.equal(res[0].NumberPlate, '15C-160.55');
  });

  test('single error object (e.g. access denied) → []', () => {
    const res = parseBachKhoaResponse({
      Message: 'Không có quyền truy cập', NumberPlate: null, Lt: 0, Ln: 0,
    });
    assert.deepEqual(res, []);
  });

  test('non-array / null / undefined → []', () => {
    assert.deepEqual(parseBachKhoaResponse(null), []);
    assert.deepEqual(parseBachKhoaResponse(undefined), []);
    assert.deepEqual(parseBachKhoaResponse('a string'), []);
  });
});
