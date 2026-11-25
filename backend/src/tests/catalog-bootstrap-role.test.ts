/**
 * Bootstrap-by-role regression (NEPO-66) for GET /api/catalogs/bootstrap.
 *
 * QA round-22 (build 6997ef56, demo.tingting.vip): the FORWARDER 'Thêm lô
 * hàng' dialog picked its customer from this bootstrap, and the portal trim
 * handed FORWARDER an empty customers list — 0 options in the Khách hàng
 * picker, client validation "Khách hàng là bắt buộc", so Ops biển could not
 * create any lô from the web UI. The mapping now keeps the customers list for
 * FORWARDER (trimmed to the portal projection) while DRIVER keeps the fully
 * stripped shape.
 *
 * Pure-mapping tier: the decision lives in lib/catalog-portal.ts, so this
 * suite needs no DB/HTTP harness (photo-authz.test.ts idiom). Runner-agnostic:
 * registers under both `pnpm exec vitest run` and the canonical `pnpm test`
 * (tsx --test) via the VITEST env flag — see payment-ledger-test-utils.ts.
 */
import assert from 'node:assert/strict';
import { describe as nodeDescribe, test as nodeTest } from 'node:test';
import { Role } from '@tingting/shared';
import { portalBootstrapCatalog, type PortalCustomer } from '../lib/catalog-portal';

// Runner-agnostic binding: vitest cannot be imported outside a vitest run — a
// static `import 'vitest'` would crash the canonical `pnpm test` (tsx --test),
// while vitest itself does not register node:test definitions ("No test suite
// found"). So node:test is imported statically (harmless under vitest) and the
// vitest module is chosen at runtime by the VITEST env flag vitest sets in its
// workers (payment-ledger-test-utils.ts idiom).
interface RunnerApi {
  describe: (name: string, fn: () => void) => void;
  test: (name: string, fn: () => void | Promise<void>) => void | Promise<unknown>;
}

let testApi: RunnerApi;
if (process.env.VITEST) {
  const vitest = await import('vitest');
  testApi = { describe: vitest.describe, test: vitest.test };
} else {
  testApi = { describe: nodeDescribe, test: nodeTest };
}
const describe = testApi.describe;
const test = testApi.test;

/** Full office bootstrap customer row — carries the fields portals must not. */
function officeCustomerRow(id: number) {
  return {
    id,
    name: `Khách hàng QA ${id}`,
    shortName: `KQ${id}`,
    taxCode: '0312345678',
    contactPerson: 'Nguyễn Văn A',
    phone: '0901234567',
    contactInfo: 'note',
    creditLimit: '50000000',
    status: 'ACTIVE',
    isCarrier: false,
    debitNoteMode: 'MONTHLY',
    debitNoteTemplateId: null,
    debtClosedUntil: null,
    linkedSupplierId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };
}

function officeBootstrapBlob() {
  return {
    customers: [officeCustomerRow(1), officeCustomerRow(2)],
    trucks: [{ id: 11, licensePlate: '51C-111.11' }],
    drivers: [{ id: 21, name: 'Lái xe B' }],
    routes: [{ id: 31, name: 'Tuyến QA' }],
    cargoTypes: [{ id: 41, name: 'Hàng xuất' }],
    expenseCategories: [{ id: 51, name: 'Cầu đường' }],
    suppliers: [{ id: 61, name: 'NCC QA' }],
    trailers: [{ id: 71, licensePlate: '51R-222.22' }],
    containerTypes: [{ id: 81, code: '20DC', name: "20'DC" }],
    ports: [{ id: 91, name: 'Cát Lái' }],
    forwarderExpenseTypes: [{ id: 101, code: 'LIFTING', name: 'Nâng hạ', status: 'ACTIVE' }],
  };
}

const PORTAL_STRIPPED_KEYS = [
  'trucks', 'drivers', 'routes', 'cargoTypes', 'expenseCategories', 'suppliers', 'trailers',
] as const;

describe('portal bootstrap by role (NEPO-66)', () => {
  test('FORWARDER keeps the customers list — its lô form picks the customer from it', () => {
    const blob = officeBootstrapBlob();
    const portal = portalBootstrapCatalog(blob, Role.FORWARDER);

    assert.equal(portal.customers.length, 2, 'FORWARDER must not receive an empty customers list');
    assert.deepEqual(
      portal.customers.map((c) => c.id),
      [1, 2],
    );
    assert.equal(portal.customers[0].name, 'Khách hàng QA 1');
    assert.equal(portal.customers[0].shortName, 'KQ1');
    assert.equal(portal.customers[0].isCarrier, false);
    assert.equal(portal.customers[0].linkedSupplierId, null);
  });

  test('FORWARDER customers are trimmed to the portal projection — no tax/credit/debt fields', () => {
    const portal = portalBootstrapCatalog(officeBootstrapBlob(), Role.FORWARDER);
    const PORTAL_CUSTOMER_FIELDS: Record<string, true> = {
      id: true,
      name: true,
      shortName: true,
      contactPerson: true,
      phone: true,
      isCarrier: true,
      linkedSupplierId: true,
    };

    for (const customer of portal.customers as PortalCustomer[]) {
      for (const key of Object.keys(customer)) {
        assert.ok(PORTAL_CUSTOMER_FIELDS[key], `portal customer must not carry field "${key}"`);
      }
    }
  });

  test('FORWARDER still loses the fleet catalogs; forwarder-facing catalogs pass through', () => {
    const blob = officeBootstrapBlob();
    const portal = portalBootstrapCatalog(blob, Role.FORWARDER);

    for (const key of PORTAL_STRIPPED_KEYS) {
      assert.deepEqual(portal[key], [], `portal bootstrap must strip "${key}" for FORWARDER`);
    }
    assert.deepEqual(portal.containerTypes, blob.containerTypes);
    assert.deepEqual(portal.ports, blob.ports);
    assert.deepEqual(portal.forwarderExpenseTypes, blob.forwarderExpenseTypes);
  });

  test('DRIVER keeps the fully stripped portal shape — customers included', () => {
    const portal = portalBootstrapCatalog(officeBootstrapBlob(), Role.DRIVER);

    assert.deepEqual(portal.customers, [], 'DRIVER portal must not receive customers');
    for (const key of PORTAL_STRIPPED_KEYS) {
      assert.deepEqual(portal[key], [], `portal bootstrap must strip "${key}" for DRIVER`);
    }
  });

  test('office roles are not portal-trimmed — the route only calls this for DRIVER/FORWARDER', () => {
    // Guard the contract boundary: MANAGER responses go through res.json(data)
    // untouched. This pin makes a future role added to the portal branch a
    // conscious decision rather than an accident of the role check.
    const blob = officeBootstrapBlob();
    const portal = portalBootstrapCatalog(blob, Role.MANAGER);

    assert.deepEqual(portal.customers, [], 'portal trim treats non-portal roles like DRIVER — the route must not call it for MANAGER');
  });
});
