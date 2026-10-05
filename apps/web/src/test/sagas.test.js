import { runSaga } from 'redux-saga';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { entitiesChanged } from '../app/syncActions';
import { authActions } from '../features/auth/authSlice';
import { loginSaga } from '../features/auth/authSaga';
import { loadDashboard } from '../features/dashboard/dashboardSlice';
import { searchAvailabilitySaga } from '../features/rooms/roomsSaga';
import { roomsActions } from '../features/rooms/roomsSlice';
import { createCrudSaga } from '../lib/createCrudSaga';
import { createCrudSlice } from '../lib/createCrudSlice';
import { callApi } from '../lib/sagaHelpers';

vi.mock('../api/endpoints', () => ({
  authApi: { login: vi.fn(), logout: vi.fn(), me: vi.fn() },
  dashboardApi: { overview: vi.fn() },
  roomsApi: { availability: vi.fn(), list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const { authApi, dashboardApi, roomsApi } = await import('../api/endpoints');

async function record(saga, action, state = {}) {
  const dispatched = [];
  await runSaga({ dispatch: (a) => dispatched.push(a), getState: () => state }, saga, action).toPromise();
  return dispatched;
}

beforeEach(() => vi.clearAllMocks());

describe('auth saga', () => {
  it('persists the session and signals success', async () => {
    authApi.login.mockResolvedValue({ data: { token: 'abc', expiresAt: '2099-01-01T00:00:00Z', user: { id: 'u1', name: 'Aarav Mehta', role: 'owner' } } });
    const dispatched = await record(loginSaga, authActions.loginRequest({ email: 'owner@homestay.demo', password: 'x' }));
    expect(dispatched[0]).toEqual(authActions.loginSuccess({ token: 'abc', expiresAt: '2099-01-01T00:00:00Z', user: { id: 'u1', name: 'Aarav Mehta', role: 'owner' } }));
    expect(JSON.parse(window.localStorage.getItem('homestay.session')).token).toBe('abc');
  });

  it('reports failures with field errors', async () => {
    authApi.login.mockRejectedValue({ message: 'Invalid email or password', status: 401, errors: [{ field: 'email', message: 'bad' }] });
    const dispatched = await record(loginSaga, authActions.loginRequest({}));
    expect(dispatched[0]).toEqual(authActions.loginFailure({ message: 'Invalid email or password', fieldErrors: { email: 'bad' } }));
  });
});

describe('callApi', () => {
  it('expires the session on 401 responses', async () => {
    const failing = vi.fn().mockRejectedValue({ message: 'expired', status: 401, errors: [] });
    const dispatched = [];
    await expect(
      runSaga({ dispatch: (a) => dispatched.push(a), getState: () => ({}) }, callApi, failing).toPromise(),
    ).rejects.toMatchObject({ status: 401 });
    expect(dispatched).toContainEqual(authActions.sessionExpired());
  });
});

describe('crud saga factory', () => {
  const slice = createCrudSlice({ name: 'widgets' });
  const api = {
    list: vi.fn().mockResolvedValue({ data: [{ id: 'w1' }], meta: { pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } } }),
    create: vi.fn().mockResolvedValue({ data: { id: 'w2' } }),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn().mockRejectedValue({ message: 'Cannot delete', status: 409, errors: [] }),
  };
  const saga = createCrudSaga({ slice, api, label: 'Widget', affects: ['dashboard'] });

  it('creates, toasts and broadcasts changes', async () => {
    const channelDispatched = [];
    const { stdChannel } = await import('redux-saga');
    const channel = stdChannel();
    const running = runSaga(
      { channel, dispatch: (a) => { channelDispatched.push(a); channel.put(a); }, getState: () => ({ widgets: slice.getInitialState() }) },
      saga,
    );
    channel.put(slice.actions.create({ name: 'New' }));
    await vi.waitFor(() => expect(channelDispatched.some((a) => a.type === 'sync/entitiesChanged')).toBe(true));
    expect(api.create).toHaveBeenCalledWith({ name: 'New' });
    expect(channelDispatched).toContainEqual(slice.actions.mutationSuccess({ action: 'create', data: { id: 'w2' } }));
    expect(channelDispatched.find((a) => a.type === 'ui/showToast').payload.message).toBe('Widget created');
    expect(channelDispatched).toContainEqual(entitiesChanged(['widgets', 'dashboard']));

    channel.put(slice.actions.remove('w1'));
    await vi.waitFor(() => expect(channelDispatched.some((a) => a.type === 'widgets/mutationFailure')).toBe(true));
    channel.put(slice.actions.fetchList());
    await vi.waitFor(() => expect(channelDispatched.some((a) => a.type === 'widgets/fetchListSuccess')).toBe(true));
    running.cancel();
  });
});

describe('feature sagas', () => {
  it('skips incomplete custom dashboard ranges', async () => {
    const dispatched = await record(loadDashboard, undefined, { dashboard: { filters: { range: 'custom', from: '2026-01-01', to: '' } } });
    expect(dashboardApi.overview).not.toHaveBeenCalled();
    expect(dispatched).toEqual([]);
  });

  it('loads the dashboard with cleaned params', async () => {
    dashboardApi.overview.mockResolvedValue({ data: { kpis: {} } });
    await record(loadDashboard, undefined, { dashboard: { filters: { range: '7d', from: '2026-01-01', to: '', propertyId: '' } } });
    expect(dashboardApi.overview).toHaveBeenCalledWith({ range: '7d' });
  });

  it('searches room availability', async () => {
    roomsApi.availability.mockResolvedValue({ data: [{ id: 'room_1' }] });
    const dispatched = await record(searchAvailabilitySaga, roomsActions.searchAvailability({ checkIn: '2026-01-01', checkOut: '2026-01-03', propertyId: '' }));
    expect(roomsApi.availability).toHaveBeenCalledWith({ checkIn: '2026-01-01', checkOut: '2026-01-03' });
    expect(dispatched).toContainEqual(roomsActions.availabilityLoaded([{ id: 'room_1' }]));
  });
});
