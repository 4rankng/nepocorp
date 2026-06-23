/**
 * Route capture — unit tests for the pure polyline/slicing helpers.
 * Covers encode↔decode round-trip, reversal, bidirectional resolution,
 * coord-based leg slicing, and spatial dedup.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  encodePolyline, decodePolyline, reverseEncodedPolyline, resolveRoute,
  sliceLegByPlaces, dedupPoints, type LngLat, type RouteEntry,
} from '../services/gps/route-capture';

describe('route-capture: polyline codec', () => {
  test('encode ↔ decode round-trips within 1e-5', () => {
    const pts: LngLat[] = [[20.869, 106.715], [21.00123, 106.60045], [21.2, 106.1]];
    const dec = decodePolyline(encodePolyline(pts));
    assert.equal(dec.length, pts.length);
    for (let i = 0; i < pts.length; i++) {
      assert.ok(Math.abs(dec[i][0] - pts[i][0]) < 1e-5, `lat ${i}`);
      assert.ok(Math.abs(dec[i][1] - pts[i][1]) < 1e-5, `lng ${i}`);
    }
  });

  test('reverseEncodedPolyline reverses point order (same set)', () => {
    const pts: LngLat[] = [[20.8, 106.7], [21.0, 106.6], [21.2, 106.1]];
    const rev = decodePolyline(reverseEncodedPolyline(encodePolyline(pts)));
    assert.deepEqual(rev, [pts[2], pts[1], pts[0]]);
  });
});

describe('route-capture: resolveRoute (bidirectional)', () => {
  test('direct (origin,destination) match wins', () => {
    const m = new Map<string, RouteEntry>([['a|b', { polyline: 'AB', km: 10 }]]);
    assert.deepEqual(resolveRoute(m, 'A', 'B'), { polyline: 'AB', km: 10 });
  });

  test('falls back to reversed pair when direct absent', () => {
    const m = new Map<string, RouteEntry>([['b|a', { polyline: 'BA', km: 12 }]]);
    const r = resolveRoute(m, 'A', 'B'); // no a|b → use b|a reversed
    assert.ok(r);
    assert.equal(r!.km, 12);
    assert.equal(r!.polyline, reverseEncodedPolyline('BA'));
  });

  test('returns null when neither direction is present', () => {
    assert.equal(resolveRoute(new Map(), 'A', 'B'), null);
  });
});

describe('route-capture: sliceLegByPlaces (coord-based)', () => {
  const origin: LngLat = [20.869, 106.715];
  const dest: LngLat = [20.867, 106.062];

  test('slices origin → destination when the trail passes both', () => {
    const pts: LngLat[] = [origin, [20.9, 106.6], [21.0, 106.3], dest];
    const r = sliceLegByPlaces(pts, 0, origin, dest, 5);
    assert.ok(r);
    assert.deepEqual(r!.points[0], origin);
    assert.deepEqual(r!.points[r!.points.length - 1], dest);
    assert.equal(r!.endIdx, 3);
  });

  test('returns null when the truck never approached the origin (within tol)', () => {
    // Trail starts ~45 km from the origin → no point within 5 km.
    const pts: LngLat[] = [[21.0, 106.3], dest];
    assert.equal(sliceLegByPlaces(pts, 0, origin, dest, 5), null);
  });

  test('respects fromIdx (search starts mid-trail)', () => {
    const pts: LngLat[] = [origin, [20.9, 106.6], dest];
    // fromIdx=2 → origin not found after index 2 → null
    assert.equal(sliceLegByPlaces(pts, 2, origin, dest, 5), null);
  });
});

describe('route-capture: dedupPoints', () => {
  test('drops points within radiusM of the last kept point', () => {
    const pts: LngLat[] = [[20.869, 106.715], [20.86905, 106.71505], [20.95, 106.6]]; // middle ~8 m from pts[0]
    const d = dedupPoints(pts, 15);
    assert.equal(d.length, 2);
    assert.deepEqual(d[1], [20.95, 106.6]);
  });

  test('keeps everything when points are well separated', () => {
    const pts: LngLat[] = [[20.869, 106.715], [20.95, 106.6], [21.0, 106.3]];
    assert.equal(dedupPoints(pts, 15).length, 3);
  });
});
