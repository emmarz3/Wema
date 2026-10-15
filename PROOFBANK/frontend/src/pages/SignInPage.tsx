import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { BrandMark, Wordmark } from '../components/layout/Brand';
import { EnvironmentIndicator } from '../components/layout/Environment';
import { useAuth } from '../state/auth';
import { roles, roleLabels, roleDescriptions } from '../lib/permissions';
import type { Role } from '../lib/permissions';
import { ApiError } from '../api/errors';

const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(72, 'Use at most 72 characters.'),
  role: z.enum(roles, { message: 'Choose a demonstration role.' }),
});

type SignInForm = z.infer<typeof signInSchema>;

const operatorEmails: Record<Role, string> = {
  super_admin: 'amara.okafor@proofbank.test',
  simulator_admin: 'tunde.bello@proofbank.test',
  operations_user: 'chidi.nwosu@proofbank.test',
  developer: 'sim.developer@proofbank.test',
  viewer: 'grace.view@proofbank.test',
};

export function SignInPage() {
  const { signIn, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', role: 'simulator_admin' },
  });

  const selectedRole = watch('role');
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    '/overview';

  async function onSubmit(values: SignInForm) {
    setFormError(null);
    try {
      await signIn(values);
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(
          error.fields && Object.keys(error.fields).length > 0
            ? error.message
            : `${error.message} ${error.userGuidance}`,
        );
      } else {
        setFormError('The sign-in request could not be completed.');
      }
    }
  }

  return (
    <div className="shell-height flex flex-col lg:flex-row">
      {/* Identity panel */}
      <section className="flex flex-col justify-between gap-8 bg-plum px-6 py-8 text-white sm:px-10 lg:w-[46%] lg:py-12">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark className="size-9" />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight">ProofBank</span>
              <span className="text-[0.6875rem] text-white/70">
                Transaction operations & simulation console
              </span>
            </span>
          </div>

          <h1 className="mt-10 max-w-md text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            Prove every transaction, before real money moves.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
            A controlled banking simulation environment for demonstrating and
            testing financial operations and infrastructure events — including
            the simulated activity ProofOps consumes.
          </p>

          <ul className="mt-8 flex max-w-md flex-col gap-3 text-sm text-white/85">
            {[
              'Operate simulated customers, accounts and transactions',
              'Execute deposits, withdrawals and internal transfers',
              'Inspect ledger postings and event delivery attempts',
              'Run scenarios that reproduce failure conditions on demand',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Badge tone="warning" className="self-start bg-warning/15 text-warning">
            Simulated data only
          </Badge>
          <p className="max-w-md text-xs leading-relaxed text-white/60">
            ProofBank is an independent simulation environment built for a
            hackathon demonstration. It is not Wema Bank&apos;s official banking
            software, is not connected to real banking infrastructure, and no
            transaction created here moves real money.
          </p>
        </div>
      </section>

      {/* Sign-in form */}
      <section className="flex flex-1 items-center justify-center bg-canvas px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center lg:justify-start">
            <EnvironmentIndicator showIdentityText={false} />
          </div>

          <div className="rounded-panel border border-line bg-surface p-6 shadow-xs">
            <h2 className="text-lg font-semibold tracking-tight text-plum">
              Sign in to the workspace
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Access is granted to demonstrating operators of the simulated
              environment.
            </p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3 py-2.5 text-sm text-danger"
                >
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <Field label="Email address" error={errors.email?.message} required>
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    autoComplete="username"
                    placeholder="name@proofbank.test"
                    invalid={Boolean(errors.email)}
                    {...register('email')}
                  />
                )}
              </Field>

              <Field
                label="Password"
                error={errors.password?.message}
                hint="Demonstration sign-in: any password of 8 characters or more is accepted."
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    invalid={Boolean(errors.password)}
                    {...register('password')}
                  />
                )}
              </Field>

              <Field
                label="Demonstration role"
                error={errors.role?.message}
                hint={roleDescriptions[selectedRole]}
              >
                {(props) => (
                  <Select
                    {...props}
                    invalid={Boolean(errors.role)}
                    {...register('role')}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Button
                type="submit"
                className="mt-1 w-full"
                loading={isSubmitting || status === 'loading'}
                icon={<LogIn aria-hidden className="size-4" />}
              >
                Sign in
              </Button>
            </form>

            <div className="mt-5 rounded-control border border-line bg-surface-muted/60 px-3 py-2.5">
              <p className="text-xs font-medium text-ink">
                Demonstration operators
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                {roles
                  .map((role) => `${roleLabels[role]}: ${operatorEmails[role]}`)
                  .join(' · ')}
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-ink-secondary">
            <Wordmark /> sign-in is simulated for this demonstration.
          </p>
        </div>
      </section>
    </div>
  );
}
