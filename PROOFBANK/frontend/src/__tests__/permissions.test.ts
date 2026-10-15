import { describe, expect, it } from 'vitest';
import {
  can,
  canSeeSection,
  capabilitiesFor,
  roleLabels,
  roles,
} from '../lib/permissions';

describe('role capabilities', () => {
  it('exposes exactly the five designed role categories', () => {
    expect([...roles]).toEqual([
      'super_admin',
      'simulator_admin',
      'operations_user',
      'developer',
      'viewer',
    ]);
  });

  it('gives supervisors full control', () => {
    expect(can('super_admin', 'manage_settings')).toBe(true);
    expect(can('super_admin', 'control_simulation')).toBe(true);
  });

  it('denies simulation control to operations users', () => {
    expect(can('operations_user', 'control_simulation')).toBe(false);
    expect(can('operations_user', 'execute_transactions')).toBe(true);
  });

  it('keeps viewers read-only', () => {
    expect([...capabilitiesFor('viewer')]).toEqual(['view_events']);
    expect(can('viewer', 'execute_transactions')).toBe(false);
  });

  it('never grants developers settings or simulation control', () => {
    expect(can('developer', 'manage_settings')).toBe(false);
    expect(can('developer', 'control_simulation')).toBe(false);
  });
});

describe('section visibility', () => {
  it('hides privileged sections from viewers', () => {
    expect(canSeeSection('viewer', 'settings')).toBe(false);
    expect(canSeeSection('viewer', 'simulation')).toBe(false);
    expect(canSeeSection('viewer', 'overview')).toBe(true);
  });

  it('allows simulators into every operational section', () => {
    expect(canSeeSection('simulator_admin', 'simulation')).toBe(true);
    expect(canSeeSection('simulator_admin', 'scenarios')).toBe(true);
    expect(canSeeSection('simulator_admin', 'settings')).toBe(false);
  });

  it('labels every role for the interface', () => {
    for (const role of roles) {
      expect(roleLabels[role].length).toBeGreaterThan(0);
    }
  });
});
