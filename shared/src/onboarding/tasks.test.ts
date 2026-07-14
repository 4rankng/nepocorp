// Catalog integrity tests for the onboarding task list (Phase 6). Run via tsx.
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ONBOARDING_TASKS, tasksForRole } from './tasks.ts';
import { PRODUCT_EVENTS } from './events.ts';
import { TOUR_IDS } from '../tours/catalog.ts';
import { Role } from '../constants/index.ts';

const KNOWN_EVENTS = new Set<string>(PRODUCT_EVENTS);
const KNOWN_TOURS = new Set<string>(TOUR_IDS);
const OFFICE_ROLES = new Set([Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT]);

describe('onboarding task catalog integrity', () => {
  test('every completionEvent is a known product event', () => {
    for (const t of ONBOARDING_TASKS) {
      assert.ok(
        KNOWN_EVENTS.has(t.completionEvent),
        `task "${t.id}" has unknown completionEvent "${t.completionEvent}"`,
      );
    }
  });

  test('every tourId is a known curated tour', () => {
    for (const t of ONBOARDING_TASKS) {
      if (t.tourId) {
        assert.ok(
          KNOWN_TOURS.has(t.tourId),
          `task "${t.id}" references unknown tour "${t.tourId}"`,
        );
      }
    }
  });

  test('no duplicate ids within a role', () => {
    const seen = new Map<string, Set<string>>();
    for (const t of ONBOARDING_TASKS) {
      const key = t.role;
      if (!seen.has(key)) seen.set(key, new Set());
      const s = seen.get(key)!;
      assert.ok(!s.has(t.id), `duplicate task id "${t.id}" for role ${key}`);
      s.add(t.id);
    }
  });

  test('only office roles appear (no DRIVER/FORWARDER)', () => {
    for (const t of ONBOARDING_TASKS) {
      assert.ok(
        OFFICE_ROLES.has(t.role),
        `task "${t.id}" has non-office role ${t.role}`,
      );
    }
  });

  test('every task has a non-empty title and positive sortOrder', () => {
    for (const t of ONBOARDING_TASKS) {
      assert.ok(t.title.trim(), `task "${t.id}" has an empty title`);
      assert.ok(t.sortOrder > 0, `task "${t.id}" has non-positive sortOrder`);
    }
  });

  test('tasksForRole returns role-scoped, ordered tasks', () => {
    const mgr = tasksForRole(Role.MANAGER);
    assert.ok(mgr.length >= 1, 'MANAGER has tasks');
    for (const t of mgr) assert.strictEqual(t.role, Role.MANAGER);
    // Sorted ascending by sortOrder.
    for (let i = 1; i < mgr.length; i++) {
      assert.ok(mgr[i - 1].sortOrder <= mgr[i].sortOrder, 'MANAGER tasks not sorted');
    }
    // DRIVER/FORWARDER get nothing.
    assert.deepStrictEqual(tasksForRole(Role.DRIVER).length, 0);
    assert.deepStrictEqual(tasksForRole(Role.FORWARDER).length, 0);
  });

  test('the manager create-first-trip task launches the create-trip tour', () => {
    const t = ONBOARDING_TASKS.find((x) => x.id === 'manager-create-first-trip');
    assert.ok(t, 'manager-create-first-trip task exists');
    assert.strictEqual(t!.tourId, 'create-trip');
    assert.strictEqual(t!.completionEvent, 'trip.created');
  });

  test('manager orientation tasks use distinct page-view completion events', () => {
    const dashboard = ONBOARDING_TASKS.find((x) => x.id === 'manager-visit-dashboard');
    const tripList = ONBOARDING_TASKS.find((x) => x.id === 'manager-open-trip-list');
    assert.strictEqual(dashboard?.completionEvent, 'fleet.dashboard_viewed');
    assert.strictEqual(tripList?.completionEvent, 'trips.list_viewed');
  });
});
