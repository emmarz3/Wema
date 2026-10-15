import { describe, expect, it } from 'vitest';
import {
  can,
  canAll,
  canSeeSection,
  capabilities,
  capabilitiesFor,
  roleLabels,
  roles,
  sectionRoles,
} from '../lib/permissions';

describe('roles', () => {
  it('defines the five workspace roles with labels', () => {
    expect(roles).toHaveLength(5);
    roles.forEach((role) => expect(roleLabels[role]).toBeTruthy());
  });

  it('gives the owner every capability', () => {
    expect(capabilitiesFor('owner')).toEqual([...capabilities]);
  });

  it('keeps the viewer read-only for financial actions', () => {
    expect(can('viewer', 'verify_transactions')).toBe(false);
    expect(can('viewer', 'run_reconciliation')).toBe(false);
    expect(can('viewer', 'view_infrastructure')).toBe(true);
  });

  it('lets analysts verify but not administer', () => {
    expect(can('analyst', 'verify_transactions')).toBe(true);
    expect(can('analyst', 'manage_members')).toBe(false);
    expect(can('analyst', 'manage_api_keys')).toBe(false);
  });

  it('scopes developer console capabilities to developers and the owner', () => {
    expect(can('developer', 'manage_api_keys')).toBe(true);
    expect(can('admin', 'manage_api_keys')).toBe(false);
    expect(can('owner', 'manage_api_keys')).toBe(true);
  });

  it('evaluates combined requirements', () => {
    expect(canAll('admin', ['verify_transactions', 'run_reconciliation'])).toBe(true);
    expect(canAll('viewer', ['verify_transactions'])).toBe(false);
  });
});

describe('section visibility', () => {
  it('shows core sections to every role', () => {
    roles.forEach((role) => {
      ['overview', 'verification', 'proof', 'infrastructure', 'incidents'].forEach((section) => {
        expect(canSeeSection(role, section)).toBe(true);
      });
    });
  });

  it('limits reconciliation to roles that run it', () => {
    expect(canSeeSection('viewer', 'reconciliation')).toBe(false);
    expect(canSeeSection('analyst', 'reconciliation')).toBe(true);
  });

  it('limits the developer console and settings', () => {
    expect(canSeeSection('analyst', 'developer')).toBe(false);
    expect(canSeeSection('developer', 'developer')).toBe(true);
    expect(canSeeSection('admin', 'settings')).toBe(true);
    expect(canSeeSection('analyst', 'settings')).toBe(false);
  });

  it('treats unknown sections as visible so new areas are not silently hidden', () => {
    expect(canSeeSection('viewer', 'future-section')).toBe(true);
    expect(sectionRoles.future).toBeUndefined();
  });
});
