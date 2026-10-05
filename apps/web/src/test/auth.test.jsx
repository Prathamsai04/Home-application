import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../app/store';
import { ProtectedRoute, RequirePermission } from '../components/layout/AppLayout';
import { authActions } from '../features/auth/authSlice';
import LoginPage from '../features/auth/LoginPage';

vi.mock('../api/endpoints', () => {
  const pending = () => new Promise(() => {});
  const crud = { list: pending, get: pending, create: pending, update: pending, remove: pending };
  return {
    authApi: { login: vi.fn(), logout: vi.fn().mockResolvedValue({}), me: pending },
    demoApi: { status: vi.fn().mockResolvedValue({ data: { seedVersion: '1.0', anchorDate: '2026-03-15', instanceId: 'abc', seededAt: 'x', counts: {} } }) },
    lookupsApi: { get: pending },
    dashboardApi: { overview: pending },
    reportsApi: { get: pending },
    settingsApi: { get: pending, update: pending },
    propertiesApi: crud,
    roomsApi: { ...crud, availability: pending },
    guestsApi: crud,
    reservationsApi: crud,
    paymentsApi: { ...crud, refund: pending },
    housekeepingApi: crud,
    maintenanceApi: crud,
    notificationsApi: crud,
    usersApi: crud,
  };
});

const { authApi } = await import('../api/endpoints');

function renderApp(store, initialPath = '/login') {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Dashboard home</p>} />
            <Route
              path="/payments"
              element={
                <RequirePermission permission="payments:view">
                  <p>Payments ledger</p>
                </RequirePermission>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

const session = (role) => ({
  token: 't',
  expiresAt: '2099-01-01T00:00:00.000Z',
  user: { id: 'u1', name: 'Test User', email: `${role}@homestay.demo`, role },
});

beforeEach(() => vi.clearAllMocks());

describe('LoginPage', () => {
  it('shows demo mode messaging and validates input', async () => {
    renderApp(createAppStore());
    expect(screen.getByText('DEMO MODE')).toBeInTheDocument();
    expect(await screen.findByText(/Seed v1\.0/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('signs in with a demo account and redirects', async () => {
    authApi.login.mockResolvedValue({ data: session('owner') });
    renderApp(createAppStore());
    await userEvent.click(screen.getByRole('button', { name: /Owner/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Dashboard home')).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith({ email: 'owner@homestay.demo', password: 'Password123!' });
  });

  it('shows server errors', async () => {
    authApi.login.mockRejectedValue({ message: 'Invalid email or password', status: 401, errors: [] });
    renderApp(createAppStore());
    await userEvent.type(screen.getByLabelText('Email'), 'owner@homestay.demo');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});

describe('route guards', () => {
  it('redirects anonymous users to login', async () => {
    renderApp(createAppStore(), '/');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(await screen.findByText(/Seed v1\.0/)).toBeInTheDocument();
  });

  it('restores a persisted session from browser storage', () => {
    window.localStorage.setItem('homestay.session', JSON.stringify(session('manager')));
    renderApp(createAppStore(), '/');
    expect(screen.getByText('Dashboard home')).toBeInTheDocument();
  });

  it('enforces role permissions', () => {
    const store = createAppStore();
    store.dispatch(authActions.loginSuccess(session('staff')));
    renderApp(store, '/payments');
    expect(screen.getByText('Access restricted')).toBeInTheDocument();
    expect(screen.queryByText('Payments ledger')).not.toBeInTheDocument();
  });

  it('allows permitted roles', () => {
    const store = createAppStore();
    store.dispatch(authActions.loginSuccess(session('manager')));
    renderApp(store, '/payments');
    expect(screen.getByText('Payments ledger')).toBeInTheDocument();
  });
});
