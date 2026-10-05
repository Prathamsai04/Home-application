import { describe, expect, it } from 'vitest';
import { rootReducer } from '../app/store';
import { authActions } from '../features/auth/authSlice';
import { dashboardActions, isFilterComplete } from '../features/dashboard/dashboardSlice';
import { reservationsActions } from '../features/reservations/reservationsSlice';
import { roomsActions } from '../features/rooms/roomsSlice';
import { showToast } from '../features/ui/uiSlice';

const initial = () => rootReducer(undefined, { type: '@@init' });

describe('crud slices', () => {
  it('resets the page when filters change but keeps explicit pages', () => {
    let state = initial();
    state = rootReducer(state, reservationsActions.setQuery({ page: 3 }));
    expect(state.reservations.query.page).toBe(3);
    state = rootReducer(state, reservationsActions.setQuery({ status: 'confirmed' }));
    expect(state.reservations.query).toMatchObject({ page: 1, status: 'confirmed' });
    expect(state.reservations.status).toBe('loading');
  });

  it('tracks list loading and results', () => {
    let state = rootReducer(initial(), reservationsActions.fetchList());
    expect(state.reservations.status).toBe('loading');
    state = rootReducer(
      state,
      reservationsActions.fetchListSuccess({ items: [{ id: 'r1' }], pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 } }),
    );
    expect(state.reservations.items).toHaveLength(1);
    expect(state.reservations.pagination.total).toBe(1);
  });

  it('maps server field errors on mutation failure', () => {
    let state = rootReducer(initial(), reservationsActions.create({}));
    expect(state.reservations.mutation).toMatchObject({ status: 'pending', action: 'create' });
    state = rootReducer(
      state,
      reservationsActions.mutationFailure({
        action: 'create',
        error: { message: 'Room is booked', errors: [{ field: 'roomId', message: 'Room is booked' }] },
      }),
    );
    expect(state.reservations.mutation).toMatchObject({ status: 'failed', error: 'Room is booked', fieldErrors: { roomId: 'Room is booked' } });
    state = rootReducer(state, reservationsActions.resetMutation());
    expect(state.reservations.mutation.status).toBe('idle');
  });

  it('tracks custom action targets', () => {
    const state = rootReducer(initial(), reservationsActions.runAction({ id: 'r9', action: 'checkIn' }));
    expect(state.reservations.mutation).toMatchObject({ status: 'pending', action: 'checkIn', targetId: 'r9' });
  });

  it('stores availability search results', () => {
    let state = rootReducer(initial(), roomsActions.searchAvailability({ checkIn: '2026-01-01', checkOut: '2026-01-02' }));
    expect(state.rooms.availability.status).toBe('loading');
    state = rootReducer(state, roomsActions.availabilityLoaded([{ id: 'room_1' }]));
    expect(state.rooms.availability.items).toEqual([{ id: 'room_1' }]);
  });
});

describe('auth and root reducer', () => {
  it('logs in and clears business state on logout', () => {
    let state = rootReducer(initial(), authActions.loginSuccess({ user: { id: 'u1', role: 'owner' }, token: 't', expiresAt: '2099-01-01' }));
    expect(state.auth.user.id).toBe('u1');
    state = rootReducer(state, reservationsActions.fetchListSuccess({ items: [{ id: 'r1' }] }));
    state = rootReducer(state, showToast({ type: 'info', message: 'kept' }));
    state = rootReducer(state, authActions.logout());
    expect(state.auth.user).toBeNull();
    expect(state.auth.signedOut).toBe(true);
    expect(state.reservations.items).toEqual([]);
    expect(state.ui.toasts).toHaveLength(1);
  });

  it('records session expiry', () => {
    const state = rootReducer(initial(), authActions.sessionExpired());
    expect(state.auth.error).toMatch(/expired/);
  });

  it('caps the toast queue', () => {
    let state = initial();
    for (let i = 0; i < 8; i += 1) state = rootReducer(state, showToast({ message: `t${i}` }));
    expect(state.ui.toasts).toHaveLength(5);
    expect(state.ui.toasts[4].message).toBe('t7');
  });
});

describe('dashboard filters', () => {
  it('only treats complete custom ranges as ready', () => {
    expect(isFilterComplete({ range: '7d' })).toBe(true);
    expect(isFilterComplete({ range: 'custom', from: '2026-01-01', to: '' })).toBe(false);
    expect(isFilterComplete({ range: 'custom', from: '2026-01-05', to: '2026-01-01' })).toBe(false);
    const state = rootReducer(initial(), dashboardActions.setFilters({ range: 'today' }));
    expect(state.dashboard.filters.range).toBe('today');
  });
});
