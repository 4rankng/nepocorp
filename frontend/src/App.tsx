import React, { lazy, Suspense, type ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Role } from '@nepocorp/shared';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/shared/Toast';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TripListPage = lazy(() => import('./pages/TripListPage'));
const TripCreatePage = lazy(() => import('./pages/TripCreatePage'));
const TripDetailPage = lazy(() => import('./pages/TripDetailPage'));
const TripEditPage = lazy(() => import('./pages/TripEditPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const DebtListPage = lazy(() => import('./pages/DebtListPage'));
const DebtDetailPage = lazy(() => import('./pages/DebtDetailPage'));
const PenaltyPage = lazy(() => import('./pages/PenaltyPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const DriverTripsPage = lazy(() => import('./pages/DriverTripsPage'));
const DriverTripDetailPage = lazy(() => import('./pages/DriverTripDetailPage'));
const DriverEarningsPage = lazy(() => import('./pages/DriverEarningsPage'));
const DriverPenaltyPage = lazy(() => import('./pages/DriverPenaltyPage'));
const DispatchPage = lazy(() => import('./pages/DispatchPage'));
const ProfitPage = lazy(() => import('./pages/ProfitPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const FleetPage = lazy(() => import('./pages/FleetPage'));
const TrucksConfigPage = lazy(() => import('./pages/config/TrucksConfigPage'));
const TrailersConfigPage = lazy(() => import('./pages/config/TrailersConfigPage'));
const RoutesConfigPage = lazy(() => import('./pages/config/RoutesConfigPage'));
const CargoTypesConfigPage = lazy(() => import('./pages/config/CargoTypesConfigPage'));
const PricingTablesConfigPage = lazy(() => import('./pages/config/PricingTablesConfigPage'));
const RoadAllowancesConfigPage = lazy(() => import('./pages/config/RoadAllowancesConfigPage'));
const PenaltyReasonsConfigPage = lazy(() => import('./pages/config/PenaltyReasonsConfigPage'));
const DriversConfigPage = lazy(() => import('./pages/config/DriversConfigPage'));
const FuelConfigPage = lazy(() => import('./pages/config/FuelConfigPage'));
const CapTableConfigPage = lazy(() => import('./pages/config/CapTableConfigPage'));
const CustomersConfigPage = lazy(() => import('./pages/config/CustomersConfigPage'));
const ManagementFeesConfigPage = lazy(() => import('./pages/config/ManagementFeesConfigPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--fg-3)' }}>
      <div className="spin" style={{ width: 24, height: 24, border: '3px solid var(--border-2)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14 }}>Đang tải...</span>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return (
    <Suspense fallback={<PageLoader />}>
      <LoginPage />
    </Suspense>
  );

  const isDriver = user?.role === Role.DRIVER;
  const driverHome = '/my-trips';
  const adminHome = '/dashboard';
  const adminOnly = (el: ReactElement) => (isDriver ? <Navigate to={driverHome} replace /> : el);
  const driverOnly = (el: ReactElement) => (isDriver ? el : <Navigate to={adminHome} replace />);

  // Wrap each page in its own ErrorBoundary so a crash in one route
  // doesn't block navigation to other routes.
  const page = (el: ReactElement) => (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {el}
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <ToastProvider>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/" element={<Navigate to={isDriver ? driverHome : adminHome} replace />} />
          <Route
            path="/dashboard"
            element={isDriver ? <Navigate to={driverHome} replace /> : page(<DashboardPage />)}
          />
          <Route path="/dispatch" element={adminOnly(page(<DispatchPage />))} />
          <Route path="/fleet" element={adminOnly(page(<FleetPage />))} />
          <Route path="/trips" element={adminOnly(page(<TripListPage />))} />
          <Route path="/trips/new" element={adminOnly(page(<TripCreatePage />))} />
          <Route path="/trips/:id" element={adminOnly(page(<TripDetailPage />))} />
          <Route path="/trips/:id/edit" element={adminOnly(page(<TripEditPage />))} />
          <Route path="/finance" element={adminOnly(page(<FinancePage />))} />
          <Route path="/profit" element={adminOnly(page(<ProfitPage />))} />
          <Route path="/debt" element={adminOnly(page(<DebtListPage />))} />
          <Route path="/debt/:id" element={adminOnly(page(<DebtDetailPage />))} />
          <Route path="/penalties" element={adminOnly(page(<PenaltyPage />))} />
          <Route path="/my-penalties" element={driverOnly(page(<DriverPenaltyPage />))} />
          <Route path="/customers" element={adminOnly(page(<CustomersPage />))} />
          <Route path="/routes" element={<Navigate to="/config/routes" replace />} />
          <Route path="/trucks" element={<Navigate to="/fleet" replace />} />
          <Route path="/drivers" element={<Navigate to="/fleet" replace />} />
          <Route path="/trailers" element={<Navigate to="/fleet" replace />} />
          <Route path="/config" element={adminOnly(page(<ConfigPage />))} />
          <Route path="/config/trucks" element={adminOnly(page(<TrucksConfigPage />))} />
          <Route path="/config/trailers" element={adminOnly(page(<TrailersConfigPage />))} />
          <Route path="/config/routes" element={adminOnly(page(<RoutesConfigPage />))} />
          <Route path="/config/cargo-types" element={adminOnly(page(<CargoTypesConfigPage />))} />
          <Route path="/config/pricing-tables" element={adminOnly(page(<PricingTablesConfigPage />))} />
          <Route path="/config/road-allowances" element={adminOnly(page(<RoadAllowancesConfigPage />))} />
          <Route path="/config/penalty-reasons" element={adminOnly(page(<PenaltyReasonsConfigPage />))} />
          <Route path="/config/drivers" element={adminOnly(page(<DriversConfigPage />))} />
          <Route path="/config/fuel" element={adminOnly(page(<FuelConfigPage />))} />
          <Route path="/config/cap-table" element={adminOnly(page(<CapTableConfigPage />))} />
          <Route path="/config/customers" element={adminOnly(page(<CustomersConfigPage />))} />
          <Route path="/config/management-fees" element={adminOnly(page(<ManagementFeesConfigPage />))} />
          <Route path="/users" element={adminOnly(page(<UsersPage />))} />
          <Route path="/audit-logs" element={adminOnly(page(<AuditLogPage />))} />
          <Route path="/my-trips" element={driverOnly(page(<DriverTripsPage />))} />
          <Route path="/my-trips/:id" element={driverOnly(page(<DriverTripDetailPage />))} />
          <Route path="/my-earnings" element={driverOnly(page(<DriverEarningsPage />))} />
          <Route
            path="*"
            element={<Navigate to={isDriver ? driverHome : adminHome} replace />}
          />
            </Routes>
          </Suspense>
      </Layout>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
