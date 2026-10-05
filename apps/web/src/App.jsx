import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout, ProtectedRoute, RequirePermission } from './components/layout/AppLayout';
import { ErrorBoundary, PageLoader, ToastContainer } from './components/ui';
import LoginPage from './features/auth/LoginPage';
import NotFoundPage from './components/layout/NotFoundPage';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const PropertiesPage = lazy(() => import('./features/properties/PropertiesPage'));
const RoomsPage = lazy(() => import('./features/rooms/RoomsPage'));
const GuestsPage = lazy(() => import('./features/guests/GuestsPage'));
const ReservationsPage = lazy(() => import('./features/reservations/ReservationsPage'));
const ReservationDetailPage = lazy(() => import('./features/reservations/ReservationDetailPage'));
const PaymentsPage = lazy(() => import('./features/payments/PaymentsPage'));
const HousekeepingPage = lazy(() => import('./features/housekeeping/HousekeepingPage'));
const MaintenancePage = lazy(() => import('./features/maintenance/MaintenancePage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));

const guarded = (permission, element) => <RequirePermission permission={permission}>{element}</RequirePermission>;

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={guarded('dashboard:view', <DashboardPage />)} />
            <Route path="properties" element={guarded('properties:view', <PropertiesPage />)} />
            <Route path="rooms" element={guarded('rooms:view', <RoomsPage />)} />
            <Route path="guests" element={guarded('guests:view', <GuestsPage />)} />
            <Route path="reservations" element={guarded('reservations:view', <ReservationsPage />)} />
            <Route path="reservations/:id" element={guarded('reservations:view', <ReservationDetailPage />)} />
            <Route path="payments" element={guarded('payments:view', <PaymentsPage />)} />
            <Route path="housekeeping" element={guarded('housekeeping:view', <HousekeepingPage />)} />
            <Route path="maintenance" element={guarded('maintenance:view', <MaintenancePage />)} />
            <Route path="reports" element={guarded('reports:view', <ReportsPage />)} />
            <Route path="notifications" element={guarded('notifications:view', <NotificationsPage />)} />
            <Route path="users" element={guarded('users:view', <UsersPage />)} />
            <Route path="settings" element={guarded('settings:view', <SettingsPage />)} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
      <ToastContainer />
    </ErrorBoundary>
  );
}
