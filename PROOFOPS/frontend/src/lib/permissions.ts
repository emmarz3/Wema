/**
 * Role model and capability map for the ProofOps workspace.
 *
 * The categories below are the ones the interface is designed around. What a
 * signed-in user may actually do is decided by the backend; the frontend
 * map is a usability layer only — it hides what a role should not see and
 * never widens what the backend permits.
 */

export const roles = ['owner', 'admin', 'analyst', 'developer', 'viewer'] as const;

export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  analyst: 'Operations analyst',
  developer: 'Developer',
  viewer: 'Viewer',
};

export const roleDescriptions: Record<Role, string> = {
  owner: 'Full access to the workspace, including administration and audit.',
  admin:
    'Manages members, provider configuration and the reconciliation programme.',
  analyst:
    'Runs verifications, reviews evidence, and works discrepancies and incidents.',
  developer:
    'Manages API keys, webhooks and integration settings, and reads request logs.',
  viewer: 'Read-only visibility of verifications, records and infrastructure.',
};

export const capabilities = [
  'verify_transactions',
  'review_evidence',
  'manage_discrepancies',
  'manage_incidents',
  'run_reconciliation',
  'manage_proof_shares',
  'view_infrastructure',
  'use_investigator',
  'manage_api_keys',
  'manage_webhooks',
  'manage_members',
  'view_audit',
  'manage_settings',
] as const;

export type Capability = (typeof capabilities)[number];

const matrix: Record<Role, Capability[]> = {
  owner: [...capabilities],
  admin: [
    'verify_transactions',
    'review_evidence',
    'manage_discrepancies',
    'manage_incidents',
    'run_reconciliation',
    'manage_proof_shares',
    'view_infrastructure',
    'use_investigator',
    'manage_members',
    'view_audit',
  ],
  analyst: [
    'verify_transactions',
    'review_evidence',
    'manage_discrepancies',
    'manage_incidents',
    'run_reconciliation',
    'manage_proof_shares',
    'view_infrastructure',
    'use_investigator',
  ],
  developer: [
    'verify_transactions',
    'view_infrastructure',
    'use_investigator',
    'manage_api_keys',
    'manage_webhooks',
    'view_audit',
  ],
  viewer: ['view_infrastructure', 'use_investigator'],
};

export function capabilitiesFor(role: Role): Capability[] {
  return matrix[role] ?? [];
}

export function can(role: Role, capability: Capability): boolean {
  return capabilitiesFor(role).includes(capability);
}

export function canAll(role: Role, required: Capability[]): boolean {
  return required.every((capability) => can(role, capability));
}

/** Workspace sections and the roles that may see them. */
export const sectionRoles: Record<string, Role[]> = {
  overview: [...roles],
  verification: [...roles],
  proof: [...roles],
  reconciliation: ['owner', 'admin', 'analyst'],
  infrastructure: [...roles],
  incidents: [...roles],
  investigator: [...roles],
  developer: ['owner', 'developer'],
  notifications: [...roles],
  settings: ['owner', 'admin', 'developer'],
};

export function canSeeSection(role: Role, section: string): boolean {
  const allowed = sectionRoles[section];
  return !allowed || allowed.includes(role);
}
