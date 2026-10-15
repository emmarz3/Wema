/**
 * ProofOps API contract — the single source of truth for every route the
 * interface calls.
 *
 * Screen code never builds URLs inline; new endpoints are added here first
 * so the contract stays auditable. This contract is what the frontend is
 * built against: the same routes are served either by the bundled
 * simulated source (`VITE_DATA_SOURCE=simulated`) or by the real ProofOps
 * backend (`VITE_DATA_SOURCE=backend`, `VITE_API_BASE_URL`).
 *
 * Routes marked `sandbox: true` operate on simulated data only and never
 * write to real financial records.
 */

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  /** One-line statement of what the backend must return or accept. */
  summary: string;
  /** True when the route is safe to expose publicly (no session). */
  public?: boolean;
}

export const routes = {
  health: {
    ping: {
      method: 'GET',
      path: '/health',
      summary: 'Liveness probe.',
      public: true,
    },
  },

  auth: {
    signIn: {
      method: 'POST',
      path: '/auth/sign-in',
      summary:
        'Exchange credentials for a session. The backend decides the session role; the client never assigns its own role.',
      public: true,
    },
    session: {
      method: 'GET',
      path: '/auth/session',
      summary: 'Return the session for the supplied token, or 401.',
    },
    signOut: {
      method: 'POST',
      path: '/auth/sign-out',
      summary: 'Invalidate the current session.',
    },
  },

  overview: {
    summary: {
      method: 'GET',
      path: '/overview/summary',
      summary:
        'Operational summary for a window: verification counts by result, discrepancies, reconciliation, provider health, delivery and incident counts, recent activity.',
    },
  },

  verifications: {
    list: {
      method: 'GET',
      path: '/verifications',
      summary:
        'List verification records with search and filters (reference, provider, merchant, proof ID, result, transaction status, reversal, source availability, amount range, date range), sorting and pagination.',
    },
    detail: {
      method: 'GET',
      path: '/verifications/:id',
      summary:
        'Full verification record: checks, receipt claims, source record comparison, evidence references, related events and deliveries, proof ID and audit history.',
    },
    create: {
      method: 'POST',
      path: '/verifications',
      summary:
        'Start a verification against the authoritative source. The backend owns the outcome; the response reports status, checks and ids. An idempotency key prevents duplicate runs.',
    },
    retry: {
      method: 'POST',
      path: '/verifications/:id/retry',
      summary: 'Re-run a failed verification. Idempotent per attempt id.',
    },
    recent: {
      method: 'GET',
      path: '/verifications/recent',
      summary: 'Most recent verification records for activity surfaces.',
    },
  },

  receipts: {
    upload: {
      method: 'POST',
      path: '/receipts',
      summary:
        'Upload receipt evidence. Returns a private receipt id; the file is never exposed through a public URL. Extraction runs source-side and is labelled as extracted claims.',
    },
    detail: {
      method: 'GET',
      path: '/receipts/:id',
      summary: 'Receipt metadata, extracted claims and a fresh private preview URL.',
    },
    preview: {
      method: 'GET',
      path: '/receipts/:id/preview',
      summary: 'Short-lived private preview URL for the uploaded file.',
    },
    review: {
      method: 'POST',
      path: '/receipts/:id/review',
      summary:
        'Record a reviewer decision over extracted fields. Records the decision and reviewer for audit.',
    },
  },

  proofs: {
    list: {
      method: 'GET',
      path: '/proofs',
      summary:
        'List proof records with search and filters by result, provider, status and date range.',
    },
    detail: {
      method: 'GET',
      path: '/proofs/:id',
      summary:
        'Proof record with evidence, check results, event history and status changes.',
    },
    shares: {
      method: 'POST',
      path: '/proofs/:id/shares',
      summary:
        'Create a share link with an expiry and an explicit field allow-list. Only authorised fields are exposed.',
    },
    revokeShare: {
      method: 'DELETE',
      path: '/proofs/:id/shares/:shareId',
      summary: 'Revoke a share link immediately.',
    },
    accessHistory: {
      method: 'GET',
      path: '/proofs/:id/access-history',
      summary: 'Recorded views of shared proof links.',
    },
    export: {
      method: 'GET',
      path: '/proofs/:id/export',
      summary: 'Export the proof record as a report file.',
    },
    publicView: {
      method: 'GET',
      path: '/public/proofs/:id',
      summary:
        'Public proof page payload limited to the fields authorised at share time.',
      public: true,
    },
  },

  reconciliation: {
    runs: {
      method: 'GET',
      path: '/reconciliation/runs',
      summary: 'List reconciliation runs with status and counts.',
    },
    detail: {
      method: 'GET',
      path: '/reconciliation/runs/:id',
      summary:
        'Run detail: column mapping, invalid rows, matched/unmatched/duplicate rows, amount and currency differences, timing differences, candidate matches.',
    },
    upload: {
      method: 'POST',
      path: '/reconciliation/runs',
      summary:
        'Create a run from an uploaded CSV. Validates column mapping and reports invalid rows before the run can start.',
    },
    mapping: {
      method: 'PUT',
      path: '/reconciliation/runs/:id/mapping',
      summary: 'Update the column mapping for a draft run.',
    },
    start: {
      method: 'POST',
      path: '/reconciliation/runs/:id/start',
      summary: 'Start a validated run. Progress is reported by the run status.',
    },
    decideCandidate: {
      method: 'POST',
      path: '/reconciliation/runs/:id/candidates/:candidateId',
      summary:
        'Accept or reject a suggested match. A suggestion is never confirmed without this action.',
    },
    export: {
      method: 'GET',
      path: '/reconciliation/runs/:id/export',
      summary: 'Export the run report.',
    },
  },

  infrastructure: {
    health: {
      method: 'GET',
      path: '/infrastructure/health',
      summary:
        'Provider health services, latency/error/volume series and open infrastructure incidents for the selected window.',
    },
    providers: {
      method: 'GET',
      path: '/infrastructure/providers',
      summary: 'Provider service list with current status and latency.',
    },
    deliveries: {
      method: 'GET',
      path: '/webhooks/deliveries',
      summary:
        'Webhook delivery list filtered by status, event type, provider and date range, with attempt history.',
    },
    deliveryDetail: {
      method: 'GET',
      path: '/webhooks/deliveries/:id',
      summary: 'One delivery with every attempt and provider response.',
    },
    events: {
      method: 'GET',
      path: '/events',
      summary:
        'Event ingestion list filtered by type, provider and status, newest first.',
    },
  },

  incidents: {
    list: {
      method: 'GET',
      path: '/incidents',
      summary:
        'Incidents filtered by status, severity, provider and assignee, sorted and paginated.',
    },
    detail: {
      method: 'GET',
      path: '/incidents/:id',
      summary:
        'Incident with timeline, related transactions, webhook attempts, evidence, notes and investigation.',
    },
    note: {
      method: 'POST',
      path: '/incidents/:id/notes',
      summary: 'Append an investigation note. Internal notes stay internal.',
    },
    assign: {
      method: 'POST',
      path: '/incidents/:id/assign',
      summary: 'Assign or reassign the incident owner.',
    },
    status: {
      method: 'POST',
      path: '/incidents/:id/status',
      summary: 'Move the incident through its lifecycle.',
    },
  },

  investigations: {
    create: {
      method: 'POST',
      path: '/investigations',
      summary:
        'Request an AI-assisted investigation of a subject. Returns structured facts, hypotheses, next checks and sources — the AI never verifies transactions or mutates records.',
    },
    detail: {
      method: 'GET',
      path: '/investigations/:id',
      summary: 'One investigation result with status and provenance.',
    },
  },

  developer: {
    keys: {
      method: 'GET',
      path: '/developer/keys',
      summary: 'API keys with prefixes, scopes and revocation state.',
    },
    createKey: {
      method: 'POST',
      path: '/developer/keys',
      summary:
        'Create an API key. The secret is returned exactly once, at creation.',
    },
    revokeKey: {
      method: 'POST',
      path: '/developer/keys/:id/revoke',
      summary: 'Revoke an API key immediately.',
    },
    webhooks: {
      method: 'GET',
      path: '/developer/webhooks',
      summary: 'Configured webhook endpoints (secrets are never returned).',
    },
    saveWebhook: {
      method: 'POST',
      path: '/developer/webhooks',
      summary:
        'Create or update a webhook endpoint. The signing secret is returned once at creation as a masked hint.',
    },
    requestLogs: {
      method: 'GET',
      path: '/developer/request-logs',
      summary: 'Recent API request log entries with status and duration.',
    },
  },

  notifications: {
    list: {
      method: 'GET',
      path: '/notifications',
      summary: 'Notifications for the signed-in user, newest first.',
    },
    markRead: {
      method: 'POST',
      path: '/notifications/:id/read',
      summary: 'Mark one notification read.',
    },
    markAllRead: {
      method: 'POST',
      path: '/notifications/read-all',
      summary: 'Mark every notification read.',
    },
    preferences: {
      method: 'GET',
      path: '/notifications/preferences',
      summary: 'Notification preferences for the signed-in user.',
    },
    savePreferences: {
      method: 'PUT',
      path: '/notifications/preferences',
      summary: 'Update notification preferences.',
    },
  },

  settings: {
    profile: {
      method: 'GET',
      path: '/settings/profile',
      summary: 'Profile and organisation for the signed-in user.',
    },
    members: {
      method: 'GET',
      path: '/settings/members',
      summary: 'Members and roles for the organisation.',
    },
    updateMemberRole: {
      method: 'POST',
      path: '/settings/members/:id/role',
      summary: 'Change a member role. Owner-only; server-enforced.',
    },
    audit: {
      method: 'GET',
      path: '/settings/audit',
      summary: 'Audit history of workspace actions.',
    },
  },
} as const;

export type RouteKey = keyof typeof routes;

/**
 * Substitutes `:param` placeholders in a route template.
 * Route templates are the single place paths are written.
 */
export function buildPath(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/:([A-Za-z]+)/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing route parameter "${key}" for ${template}`);
    }
    return encodeURIComponent(value);
  });
}

/** Appends defined query parameters to a path. */
export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** Every route as a flat list — used by the developer console and docs. */
export function allRoutes(): Array<RouteDefinition & { key: string }> {
  const flat: Array<RouteDefinition & { key: string }> = [];
  Object.values(routes).forEach((group) => {
    Object.values(group).forEach((route) => {
      if (route && typeof route === 'object' && 'path' in route) {
        flat.push({ ...route, key: route.path });
      }
    });
  });
  return flat;
}
