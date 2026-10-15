import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, isSimulated, setActiveToken } from '../api';
import type { SignInInput } from '../api/client';
import type { AuthSession, SessionUser } from '../types/domain';
import type { Capability, Role } from '../lib/permissions';
import { can, capabilitiesFor } from '../lib/permissions';
import { queryClient } from './queryClient';

/**
 * Authentication and session state.
 *
 * The provider owns the session token, restores it on boot, and enforces
 * expiry both on a timer and on 401 responses from the data source. When
 * a session is lost the app records *why* so the sign-in screen can
 * explain it. Frontend checks are a usability layer: the data source
 * remains the authority for what the session may do.
 */

const TOKEN_KEY = 'proofops.auth.token';
const EXPIRY_CHECK_MS = 15_000;

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

/** Why a session ended, when it ended involuntarily. */
export type SessionEnd = 'expired' | 'rejected' | null;

interface AuthContextValue {
  session: AuthSession | null;
  user: SessionUser | null;
  role: Role | null;
  status: AuthStatus;
  /** Set when the session was lost involuntarily (expiry / rejection). */
  sessionEnd: SessionEnd;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  can: (capability: Capability) => boolean;
  canAll: (required: Capability[]) => boolean;
  isSimulated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** True when the stored expiry has already passed. */
function isExpired(session: AuthSession | null, now = Date.now()): boolean {
  if (!session?.expiresAt) return false;
  const expires = new Date(session.expiresAt).getTime();
  if (Number.isNaN(expires)) return false;
  return expires <= now;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [sessionEnd, setSessionEnd] = useState<SessionEnd>(null);
  const bootstrapDone = useRef(false);

  /** Drop the session locally and record why. */
  const endSession = useCallback((reason: SessionEnd) => {
    setActiveToken(null);
    persistToken(null);
    setSession(null);
    setStatus('signedOut');
    setSessionEnd(reason);
  }, []);

  const signOut = useCallback(async () => {
    const token = readStoredToken();
    try {
      if (token) await api.signOut(token);
    } catch {
      /* the session may already be gone; local teardown still happens */
    } finally {
      // Voluntary sign-out records no involuntary reason.
      endSession(null);
    }
  }, [endSession]);

  const signIn = useCallback(async (input: SignInInput) => {
    const next = await api.signIn(input);
    setActiveToken(next.token);
    persistToken(next.token);
    setSession(next);
    setStatus('signedIn');
    setSessionEnd(null);
  }, []);

  // Bootstrap: restore a session when the token is still valid.
  useEffect(() => {
    if (bootstrapDone.current) return;
    bootstrapDone.current = true;
    let cancelled = false;
    const token = readStoredToken();
    setActiveToken(token);
    api
      .currentSession(token ?? undefined)
      .then((existing) => {
        if (cancelled) return;
        if (existing) {
          setActiveToken(existing.token);
          persistToken(existing.token);
          setSession(existing);
          setStatus('signedIn');
          setSessionEnd(null);
        } else if (token) {
          // A stored token that the source rejects means the session was
          // lost (expired or revoked) — record the reason so the sign-in
          // screen can explain it instead of silently bouncing the user.
          endSession('expired');
        } else {
          endSession(null);
        }
      })
      .catch(() => {
        if (!cancelled) endSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [endSession]);

  // Expiry guard: a session that passes its expiry is treated as gone,
  // with the reason recorded for the sign-in screen.
  useEffect(() => {
    if (status !== 'signedIn') return;
    const check = () => {
      if (isExpired(session)) endSession('expired');
    };
    const timer = window.setInterval(check, EXPIRY_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [session, status, endSession]);

  // Data-source rejections: when the source answers 401 the session is no
  // longer usable, so recover by ending it and surfacing the reason.
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== 'updated') return;
      const state = event.query.state;
      if (state.status !== 'error') return;
      const error = state.error as { status?: number } | null;
      if (error && error.status === 401) {
        endSession('expired');
      }
    });
    return () => unsubscribe();
  }, [endSession]);

  const value = useMemo<AuthContextValue>(() => {
    const role = session?.user.role ?? null;
    return {
      session,
      user: session?.user ?? null,
      role,
      status,
      sessionEnd,
      signIn,
      signOut,
      can: (capability) => (role ? can(role, capability) : false),
      canAll: (required) => (role ? required.every((item) => can(role, item)) : false),
      isSimulated,
    };
  }, [session, status, sessionEnd, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** Capability list for the current role — handy for debugging and tests. */
export function useCapabilities(): Capability[] {
  const { role } = useAuth();
  return role ? capabilitiesFor(role) : [];
}
