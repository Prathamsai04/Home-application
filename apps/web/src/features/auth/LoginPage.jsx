import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, CalendarCheck, Home, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { DEMO_USERS_PASSWORD, loginSchema } from '@homestay/shared';
import { Button, Input } from '../../components/ui';
import { SeedStatusIndicator } from '../../components/layout/DemoBanner';
import { demoActions } from '../demo/demoSlice';
import { authActions, selectIsAuthenticated } from './authSlice';

export const DEMO_ACCOUNTS = [
  { role: 'Owner', email: 'owner@homestay.demo', description: 'Full access incl. users & settings' },
  { role: 'Manager', email: 'manager@homestay.demo', description: 'Operations, payments & reports' },
  { role: 'Staff', email: 'staff@homestay.demo', description: 'Front desk & housekeeping' },
];

const HIGHLIGHTS = [
  { icon: CalendarCheck, text: 'Conflict-free reservations with live availability' },
  { icon: BarChart3, text: 'Revenue, occupancy and booking analytics' },
  { icon: Sparkles, text: 'Housekeeping and maintenance workflows' },
];

export function LoginPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const authenticated = useSelector(selectIsAuthenticated);
  const { status, error, signedOut } = useSelector((state) => state.auth);
  const [returnTo] = useState(() => (signedOut ? '/' : (location.state?.from ?? '/')));
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  useEffect(() => {
    dispatch(demoActions.fetchStatus());
  }, [dispatch]);

  useEffect(() => {
    Object.entries(error?.fieldErrors ?? {}).forEach(([field, message]) => setError(field, { message }));
  }, [error, setError]);

  if (authenticated) return <Navigate to={returnTo} replace />;

  const fill = (email) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', DEMO_USERS_PASSWORD, { shouldValidate: true });
  };

  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-700/40 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
            <Home className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="text-lg font-semibold">Homestay Cloud</p>
            <p className="text-xs uppercase tracking-widest text-brand-200">Property management</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight">Run every stay beautifully, from booking to checkout.</h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-brand-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-200/70">Fictional demo data · No real guests or payments</p>
      </section>

      <section className="flex flex-col justify-center bg-white px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p className="font-bold tracking-wider">DEMO MODE</p>
            <p className="mt-0.5">Using seeded in-memory data. Changes may reset at any time.</p>
            <p className="mt-1.5 text-amber-800/80">
              <SeedStatusIndicator compact />
            </p>
          </div>

          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-900">Sign in to your workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Use one of the demo accounts below. Password: {DEMO_USERS_PASSWORD}</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit((values) => dispatch(authActions.loginRequest(values)))} noValidate>
            {errorMessage && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}
            <Input label="Email" type="email" autoComplete="username" leftIcon={Mail} error={errors.email?.message} {...register('email')} />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              leftIcon={Lock}
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" loading={status === 'loading'}>
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick demo access</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fill(account.email)}
                  className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/60"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
                    {account.role}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{account.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
