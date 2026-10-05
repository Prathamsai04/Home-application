import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { ShieldAlert } from 'lucide-react';
import { sessionReady } from '../../app/syncActions';
import { selectIsAuthenticated } from '../../features/auth/authSlice';
import { notificationsActions } from '../../features/notifications/notificationsSlice';
import { usePermission } from '../../hooks';
import { EmptyState, ErrorBoundary } from '../ui';
import { DemoBanner } from './DemoBanner';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Redirects anonymous users to the login page, preserving the target route. */
export function ProtectedRoute() {
  const authenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();
  if (!authenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Renders children only when the current role holds `permission`. */
export function RequirePermission({ permission, children }) {
  const allowed = usePermission();
  if (!allowed(permission)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access restricted"
        description="Your role does not have access to this area. Ask an owner if you need permission."
        className="py-24"
      />
    );
  }
  return children;
}

export function AppLayout() {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    dispatch(sessionReady());
    dispatch(notificationsActions.fetchList());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-64">
        <DemoBanner />
        <Topbar />
        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
