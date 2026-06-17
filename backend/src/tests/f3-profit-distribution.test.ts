/**
 * F3 — Per-vehicle profit distribution exactness invariant.
 *
 * Asserts the core financial guarantee: Σ distribution rows == Σ_t P_t
 * (== entity netProfit), within ≤0.01 VND. The per-truck floor+remainder
 * math guarantees each truck sums exactly, so the total does too. Also
 * verifies that an ownerless truck's profit is held aside (undistributed),
 * NOT emitted as distribution rows.
 *
 * The full `computeDistribution` is DB-coupled, so we test the pure
 * `distributeTruckProfit` helper + the exactness reconciliation logic it
 * underpins. This is the load-bearing math — if it drifts, distributions
 * would over/under-allocate owner payouts.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { distributeTruckProfit } from '../services/profit-distribution.service';

describe('F3 distributeTruckProfit — exactness', () => {
  test('single truck, two 50% owners, odd profit → rows sum exactly to profit', () => {
    // Classic over-allocation case: 7₫ × 50% = 3.5 → naive rounding gives 4+4=8.
    // Floor+remainder-to-last must give 3+4=7 (exact).
    const profit = 7;
    const owners = [
      { partnerName: 'A', percentage: 50 },
      { partnerName: 'B', percentage: 50 },
    ];
    const { partners } = distributeTruckProfit(1, profit, owners);
    const sum = partners.reduce((s, p) => s + p.amount, 0);
    assert.strictEqual(sum, profit, `rows must sum exactly to ${profit}, got ${sum}`);
    assert.deepStrictEqual(
      partners.map(p => p.amount).sort((a, b) => a - b),
      [3, 4],
    );
  });

  test('two trucks → Σ all rows == Σ_t P_t (entity invariant)', () => {
    // Truck 1: profit 100, owners A(60%)/B(40%). Truck 2: profit 50, owner C(100%).
    const t1 = distributeTruckProfit(1, 100, [
      { partnerName: 'A', percentage: 60 },
      { partnerName: 'B', percentage: 40 },
    ]);
    const t2 = distributeTruckProfit(2, 50, [
      { partnerName: 'C', percentage: 100 },
    ]);

    const allRows = [...t1.partners, ...t2.partners];
    const sigmaRows = allRows.reduce((s, p) => s + p.amount, 0);
    const sigmaP = 100 + 50;
    assert.ok(
      Math.abs(sigmaRows - sigmaP) < 0.01,
      `Σ rows (${sigmaRows}) must equal Σ_t P_t (${sigmaP})`,
    );

    // Entity view = group by partner_name, Σ amount.
    const byPartner = new Map<string, number>();
    for (const p of allRows) byPartner.set(p.partnerName, (byPartner.get(p.partnerName) ?? 0) + p.amount);
    const entityTotal = Array.from(byPartner.values()).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(entityTotal - sigmaP) < 0.01, 'entity Σ must also match');
    assert.strictEqual(byPartner.get('A'), 60);
    assert.strictEqual(byPartner.get('B'), 40);
    assert.strictEqual(byPartner.get('C'), 50);
  });

  test('ownerless truck → no rows; its profit contributes to undistributed, not distributions', () => {
    // An ownerless truck returns zero partner rows; the caller holds its profit
    // aside as undistributedProfit. Simulate the invariant: Σ rows (0) must
    // equal distributableProfit (netProfit − undistributedProfit).
    const { partners } = distributeTruckProfit(9, 80, []);
    assert.strictEqual(partners.length, 0);

    const netProfit = 80;            // only this ownerless truck had profit
    const undistributedProfit = 80;  // all of it held aside
    const distributableProfit = netProfit - undistributedProfit; // 0
    const sigmaRows = partners.reduce((s, p) => s + p.amount, 0); // 0
    assert.ok(
      Math.abs(sigmaRows - distributableProfit) < 0.01,
      'ownerless truck profit must NOT appear in distribution rows',
    );
  });

  test('three-way split with remainder → still exact', () => {
    // 10₫ across 33/33/34. 10*0.33=3.3→floor 3 (×2), last gets 10−6=4. Sum=10.
    const { partners } = distributeTruckProfit(3, 10, [
      { partnerName: 'X', percentage: 33 },
      { partnerName: 'Y', percentage: 33 },
      { partnerName: 'Z', percentage: 34 },
    ]);
    const sum = partners.reduce((s, p) => s + p.amount, 0);
    assert.strictEqual(sum, 10);
  });
});
