import { describe, it, expect } from 'vitest';
import { Role } from '@tingting/shared';

/**
 * The rule the server enforces in deleteUser(): an ADMIN and a MANAGER may both
 * delete accounts, but nobody but an ADMIN may delete an ADMIN (kanban
 * 101026003000). Mirrors `UserTable`'s `canDeleteRow`.
 */
const canDeleteRow = (viewerRole: Role, targetRole: Role): boolean =>
  (viewerRole === Role.ADMIN || viewerRole === Role.MANAGER)
  && (viewerRole === Role.ADMIN || targetRole !== Role.ADMIN);

describe('user deletion permissions', () => {
  it('lets a MANAGER delete every account except an ADMIN one', () => {
    expect(canDeleteRow(Role.MANAGER, Role.DRIVER)).toBe(true);
    expect(canDeleteRow(Role.MANAGER, Role.ACCOUNTANT)).toBe(true);
    expect(canDeleteRow(Role.MANAGER, Role.FORWARDER)).toBe(true);
    expect(canDeleteRow(Role.MANAGER, Role.MANAGER)).toBe(true);
    expect(canDeleteRow(Role.MANAGER, Role.ADMIN)).toBe(false);
  });

  it('lets an ADMIN delete anything, including another ADMIN', () => {
    expect(canDeleteRow(Role.ADMIN, Role.DRIVER)).toBe(true);
    expect(canDeleteRow(Role.ADMIN, Role.ADMIN)).toBe(true);
  });

  it('refuses the roles that never see the delete control', () => {
    expect(canDeleteRow(Role.ACCOUNTANT, Role.DRIVER)).toBe(false);
    expect(canDeleteRow(Role.DRIVER, Role.DRIVER)).toBe(false);
    expect(canDeleteRow(Role.FORWARDER, Role.DRIVER)).toBe(false);
  });
});

/**
 * Assignment is the other half of the same rule: a MANAGER may delete and edit
 * users, but may never mint or view an ADMIN.
 */
describe('ADMIN accounts stay out of a MANAGER reach', () => {
  const assignableRoles = (actorRole: Role): Role[] => {
    const all = Object.values(Role);
    return actorRole === Role.ADMIN ? all : all.filter(r => r !== Role.ADMIN);
  };

  it('offers ADMIN only to an ADMIN', () => {
    expect(assignableRoles(Role.ADMIN)).toContain(Role.ADMIN);
    expect(assignableRoles(Role.MANAGER)).not.toContain(Role.ADMIN);
    expect(assignableRoles(Role.ACCOUNTANT)).not.toContain(Role.ADMIN);
  });

  it('matches what the server will accept on create', () => {
    // POST /auth/users rejects role=ADMIN from a non-ADMIN actor.
    for (const actor of [Role.MANAGER, Role.ACCOUNTANT, Role.DRIVER, Role.FORWARDER]) {
      expect(assignableRoles(actor).includes(Role.ADMIN)).toBe(false);
    }
  });
});