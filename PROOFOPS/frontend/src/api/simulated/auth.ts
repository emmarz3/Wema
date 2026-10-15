/**
 * Simulated authentication handlers.
 *
 * The simulated source implements exactly the three auth routes in the
 * contract — sign in, read the session, sign out. It issues non-privileged
 * demonstration tokens: nothing here is a credential, and a real backend
 * would replace this module wholesale when `VITE_DATA_SOURCE=backend`.
 *
 * Deliberately NOT implemented (not in the contract, so the interface
 * never offers them): forgot-password, reset-password, registration and
 * invitations.
 */
import type { ApiRequest, ApiResponse } from '../types';
import type { AuthSession, SessionUser } from '../../types/domain';
import type { Role } from '../../lib/permissions';
import { roleLabels } from '../../lib/permissions';
import { registerHandler } from './index';
import { uuid } from '../../lib/utils';

const TOKEN_KEY = 'proofops.simulated.session';
const SESSIONS_KEY = 'proofops.simulated.sessions';

/** Session lifetime for the demonstration session. */
const SESSION_TTL_MS = 30 * 60 * 1000;

interface SimSession {
  token: string;
  user: SessionUser;
  expiresAt: string;
}

/** Demonstration accounts. Roles are what the interface demonstrates. */
const DEMO_USERS: Array<Omit<SessionUser, 'organisation'> & { id: string }> = [
  {
    id: 'usr_amara',
    email: 'amara.okafor@proofops.test',
    name: 'Amara Okafor',
    title: 'Head of Financial Operations',
    role: 'owner',
  },
  {
    id: 'usr_tunde',
    email: 'tunde.bello@proofops.test',
    name: 'Tunde Bello',
    title: 'Operations Manager',
    role: 'admin',
  },
  {
    id: 'usr_chidi',
    email: 'chidi.nwosu@proofops.test',
    name: 'Chidi Nwosu',
    title: 'Operations Analyst',
    role: 'analyst',
  },
  {
    id: 'usr_sim',
    email: 'sim.developer@proofops.test',
    name: 'Sim Developer',
    title: 'Integrations Engineer',
    role: 'developer',
  },
  {
    id: 'usr_grace',
    email: 'grace.view@proofops.test',
    name: 'Grace View',
    title: 'Finance Reviewer',
    role: 'viewer',
  },
];

function organisation() {
  return { id: 'org_proofops', name: 'ProofOps Sandbox' };
}

function readSessions(): Record<string, SimSession> {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SimSession>) : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, SimSession>): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    /* storage unavailable */
  }
}

function findUserByEmail(email: string) {
  return DEMO_USERS.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

/** The role a real backend would assign; the selector only applies to
 *  unknown demonstration emails. */
function roleForSignIn(email: string, hint?: Role): Role {
  const known = findUserByEmail(email);
  return known ? known.role : hint ?? 'analyst';
}

function toSession(user: SessionUser): SimSession {
  const session: SimSession = {
    token: uuid('demo'),
    user,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  const sessions = readSessions();
  sessions[session.token] = session;
  writeSessions(sessions);
  try {
    localStorage.setItem(TOKEN_KEY, session.token);
  } catch {
    /* storage unavailable */
  }
  return session;
}

function toAuthSession(session: SimSession): AuthSession {
  return { token: session.token, user: session.user, expiresAt: session.expiresAt };
}

function json(status: number, body: unknown): ApiResponse {
  return { status, ok: status >= 200 && status < 300, body };
}

function parseBody<T>(request: ApiRequest): T {
  return (request.body ?? {}) as T;
}

function tokenOf(request: ApiRequest): string | undefined {
  if (request.token) return request.token;
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

interface SignInBody {
  email?: string;
  password?: string;
  /** Demonstration role hint; ignored for known demo accounts. */
  role?: Role;
}

function handleSignIn(request: ApiRequest): ApiResponse {
  const body = parseBody<SignInBody>(request);
  const email = (body.email ?? '').trim();
  const password = body.password ?? '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(422, {
      code: 'validation_failed',
      message: 'Enter a valid email address.',
      details: { email: 'Enter a valid email address.' },
    });
  }
  if (password.length < 8) {
    return json(422, {
      code: 'validation_failed',
      message: 'Password must be at least 8 characters.',
      details: { password: 'Password must be at least 8 characters.' },
    });
  }

  const role = roleForSignIn(email, body.role);
  const known = findUserByEmail(email);
  const user: SessionUser = known
    ? { ...known, organisation: organisation() }
    : {
        id: uuid('usr'),
        email,
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        role,
        title: roleLabels[role],
        organisation: organisation(),
      };

  const session = toSession(user);
  return json(200, toAuthSession(session));
}

function handleSession(request: ApiRequest): ApiResponse {
  const token = tokenOf(request);
  if (!token) {
    return json(401, {
      code: 'session_expired',
      message: 'No active session. Sign in again to continue.',
    });
  }
  const session = readSessions()[token];
  if (!session) {
    return json(401, {
      code: 'session_expired',
      message: 'This session is no longer valid. Sign in again to continue.',
    });
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    const sessions = readSessions();
    delete sessions[token];
    writeSessions(sessions);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
    return json(401, {
      code: 'session_expired',
      message: 'Your session expired. Sign in again to continue.',
    });
  }
  return json(200, toAuthSession(session));
}

function handleSignOut(request: ApiRequest): ApiResponse {
  const token = tokenOf(request);
  const sessions = readSessions();
  if (token && sessions[token]) {
    delete sessions[token];
    writeSessions(sessions);
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
  return json(204, null);
}

/** Registers the auth routes with the simulated transport. */
export function registerAuthHandlers(): void {
  registerHandler('POST', '/auth/sign-in', handleSignIn);
  registerHandler('GET', '/auth/session', handleSession);
  registerHandler('POST', '/auth/sign-out', handleSignOut);
}

/** Exposed for the sign-in page's demonstration account list. */
export const demoAccounts = DEMO_USERS.map((user) => ({
  email: user.email,
  name: user.name,
  role: user.role,
  title: user.title,
}));
