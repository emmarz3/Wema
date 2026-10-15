import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { AuthNotice } from '../components/ui/AuthNotice';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { demoAccounts } from '../api/simulated/auth';
import { isSimulated } from '../api';
import { roles, roleLabels, type Role } from '../lib/permissions';

/**
 * Sign-in screen.
 *
 * Built strictly against the session endpoints in the API contract:
 * email + password exchanged for a session token. There is no
 * forgot-password, registration or invitation flow because the contract
 * does not define one — the interface does not offer what the source
 * cannot perform.
 */

const schema = z.object({
  email: z
    .string()
    .min(1, 'Enter your email address.')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Enter your password.')
    .min(8, 'Password must be at least 8 characters.'),
});

type FormValues = z.infer<typeof schema>;

interface LocationState {
  from?: string;
  reason?: 'expired';
}

export function SignInPage() {
  const { signIn, status, sessionEnd } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  /** Demonstration role selector — a real backend assigns the account's
   *  own role and ignores this. */
  const [role, setRole] = useState<Role>('analyst');

  const state = (location.state ?? null) as LocationState | null;
  const expiredNotice = sessionEnd === 'expired' || state?.reason === 'expired';

  useEffect(() => {
    if (status === 'signedIn') {
      const target = state?.from && state.from !== '/sign-in' ? state.from : '/app';
      navigate(target, { replace: true });
    }
  }, [status, state?.from, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const roleOptions = useMemo(
    () => roles.map((value) => ({ value, label: roleLabels[value] })),
    [],
  );

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn({ ...values, role });
      // The effect above navigates once the session lands.
      toast.push({ tone: 'success', title: 'Signed in' });
    } catch {
      // The source refused the credentials (or was unreachable). No
      // session exists; the panel says so without inventing one.
      setFormError(
        'Sign-in failed. Check the email and password, or try again in a moment.',
      );
    }
  });

  return (
    <div className="py-2">
      {expiredNotice ? (
        <AuthNotice
          title="Your session expired"
          description="For your protection the previous session was closed. Sign in again to continue — nothing was lost."
        />
      ) : null}

      <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-secondary">
        Access the ProofOps workspace with your account credentials.
      </p>

      {formError ? (
        <AuthNotice
          title="Could not sign in"
          description={formError}
        />
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Work email" htmlFor="signin-email" error={errors.email?.message} required>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            placeholder="you@organisation.test"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="signin-password"
          error={errors.password?.message}
          required
        >
          <Input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>

        <Field
          label="Sign in as (demonstration)"
          htmlFor="signin-role"
          hint={
            isSimulated
              ? 'A real backend assigns the role attached to your account; this selector only applies to demonstration sign-ins.'
              : 'The backend assigns the role attached to your account.'
          }
        >
          <Select
            id="signin-role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          icon={isSubmitting ? undefined : <LogIn aria-hidden className="size-4" />}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {isSimulated ? (
        <div className="mt-6 rounded-control border border-line bg-surface-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <KeyRound aria-hidden className="size-3.5" />
            Demonstration accounts
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
            Any valid email with a password of at least 8 characters signs in.
            Pick a demonstration account to explore its role, or use the
            selector above with any email. Sessions last 30 minutes.
          </p>
          <ul className="mt-2 space-y-1">
            {demoAccounts.map((account) => (
              <li key={account.email} className="text-xs text-ink-secondary">
                <button
                  type="button"
                  className="rounded text-left font-technical text-ink underline decoration-dotted hover:text-brand"
                  onClick={() => {
                    setValue('email', account.email, { shouldValidate: true });
                    setRole(account.role);
                  }}
                >
                  {account.email}
                </button>{' '}
                — {roleLabels[account.role]}
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-secondary">
            <ShieldAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Simulated sessions only. Do not enter real credentials.
          </p>
        </div>
      ) : null}
    </div>
  );
}
