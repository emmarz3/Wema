import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, isSimulated, setActiveToken } from '../api';
import type { SignInInput } from '../api/client';
import type { AuthSession, SessionUser } from '../types/domain';
import type { Role } from '../lib/permissions';
import { can, capabilitiesFor } from '../lib/permissions';

const TOKEN_KEY = 'proofbank.auth.token';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  session: AuthSession | null;
  user: SessionUser | null;
  role: Role | null;
  status: AuthStatus;
  /** Sign in with the simulated data source. */
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Whether the current session may perform a capability. */
  can: (capability: Parameters<typeof can>[1]) => boolean;
  /** True when the session carries the simulated-data marker. */
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Bootstrap: adopt an existing session when one is still valid.
  useEffect(() => {
    let cancelled = false;
    const token = readStoredToken();
    setActiveToken(token);
    api
      .currentSession(token ?? undefined)
      .then((existing) => {
        if (cancelled) return;
        if (existing) {
          setSession(existing);
          setActiveToken(existing.token);
          persistToken(existing.token);
          setStatus('signedIn');
        } else {
          setSession(null);
          setActiveToken(null);
          persistToken(null);
          setStatus('signedOut');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('signedOut');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (input: SignInInput) => {
    const next = await api.signIn(input);
    setActiveToken(next.token);
    persistToken(next.token);
    setSession(next);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.signOut(readStoredToken() ?? undefined);
    } finally {
      setActiveToken(null);
      persistToken(null);
      setSession(null);
      setStatus('signedOut');
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = session?.user.role ?? null;
    return {
      session,
      user: session?.user ?? null,
      role,
      status,
      signIn,
      signOut,
      can: (capability) => (role ? can(role, capability) : false),
      isSimulated,
    };
  }, [session, status, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** Convenience hook for permission checks in components. */
export function useCapabilities(): ReturnType<typeof capabilitiesFor> {
  const { role } = useAuth();
  return capabilitiesFor(role ?? 'viewer');
}
