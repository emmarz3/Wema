/**
 * Role model and capability map.
 *
 * The categories below are the ones the interface is designed around. What a
 * signed-in user may actually do is decided by the data source; until a
 * backend issues real permissions, capabilities are derived from the
 * demonstration role attached to the session.
 */

export const roles = [
  'super_admin',
  'simulator_admin',
  'operations_user',
  'developer',
  'viewer',
] as const;

export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super administrator',
  simulator_admin: 'Simulator administrator',
  operations_user: 'Operations user',
  developer: 'Developer',
  viewer: 'Viewer',
};

export const capabilities = [
  'manage_customers',
  'manage_accounts',
  'execute_transactions',
  'reverse_transactions',
  'control_simulation',
  'run_scenarios',
  'manage_infrastructure',
  'view_events',
  'view_audit',
  'manage_settings',
] as const;

export type Capability = (typeof capabilities)[number];

const matrix: Record<Role, Capability[]> = {
  super_admin: [...capabilities],
  simulator_admin: [
    'manage_customers',
    'manage_accounts',
    'execute_transactions',
    'reverse_transactions',
    'control_simulation',
    'run_scenarios',
    'manage_infrastructure',
    'view_events',
    'view_audit',
  ],
  operations_user: [
    'manage_customers',
    'execute_transactions',
    'view_events',
  ],
  developer: [
    'manage_customers',
    'manage_accounts',
    'execute_transactions',
    'view_events',
    'view_audit',
  ],
  viewer: ['view_events'],
};

export function capabilitiesFor(role: Role): Capability[] {
  return matrix[role] ?? [];
}

export function can(role: Role, capability: Capability): boolean {
  return capabilitiesFor(role).includes(capability);
}

/** Human sentence describing what a role is for. */
export const roleDescriptions: Record<Role, string> = {
  super_admin: 'Full access, including settings and administration.',
  simulator_admin:
    'Operates the simulation lifecycle, scenarios and infrastructure conditions.',
  operations_user:
    'Performs day-to-day customer and transaction operations.',
  developer:
    'Reads ledger, audit and event data while building integrations.',
  viewer: 'Read-only visibility of events and activity.',
};

/** Sessions that can see a given navigation section. */
export const sectionRoles: Record<string, Role[]> = {
  overview: [...roles],
  customers: [...roles],
  accounts: [...roles],
  transactions: [...roles],
  ledger: ['super_admin', 'simulator_admin', 'developer'],
  simulation: ['super_admin', 'simulator_admin'],
  scenarios: ['super_admin', 'simulator_admin'],
  infrastructure: ['super_admin', 'simulator_admin'],
  events: [...roles],
  audit: ['super_admin', 'simulator_admin', 'developer'],
  settings: ['super_admin'],
};

export function canSeeSection(role: Role, section: string): boolean {
  const allowed = sectionRoles[section];
  return !allowed || allowed.includes(role);
}
