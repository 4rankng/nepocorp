import React, { lazy, Suspense, type ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Role } from '@nepocorp/shared';
import Layout from './components/Layout';

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

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to={isDriver ? driverHome : adminHome} replace />} />
          <Route
            path="/dashboard"
            element={isDriver ? <Navigate to={driverHome} replace /> : <DashboardPage />}
          />
          <Route path="/dispatch" element={adminOnly(<DispatchPage />)} />
          <Route path="/fleet" element={adminOnly(<FleetPage />)} />
          <Route path="/trips" element={adminOnly(<TripListPage />)} />
          <Route path="/trips/new" element={adminOnly(<TripCreatePage />)} />
          <Route path="/trips/:id" element={adminOnly(<TripDetailPage />)} />
          <Route path="/trips/:id/edit" element={adminOnly(<TripEditPage />)} />
          <Route path="/finance" element={adminOnly(<FinancePage />)} />
          <Route path="/profit" element={adminOnly(<ProfitPage />)} />
          <Route path="/debt" element={adminOnly(<DebtListPage />)} />
          <Route path="/debt/:id" element={adminOnly(<DebtDetailPage />)} />
          <Route path="/penalties" element={adminOnly(<PenaltyPage />)} />
          <Route path="/my-penalties" element={driverOnly(<DriverPenaltyPage />)} />
          <Route path="/customers" element={adminOnly(<CustomersPage />)} />
          <Route path="/routes" element={<Navigate to="/config/routes" replace />} />
          <Route path="/trucks" element={<Navigate to="/fleet" replace />} />
          <Route path="/drivers" element={<Navigate to="/fleet" replace />} />
          <Route path="/trailers" element={<Navigate to="/fleet" replace />} />
          <Route path="/config" element={adminOnly(<ConfigPage />)} />
          <Route path="/config/trucks" element={adminOnly(<TrucksConfigPage />)} />
          <Route path="/config/trailers" element={adminOnly(<TrailersConfigPage />)} />
          <Route path="/config/routes" element={adminOnly(<RoutesConfigPage />)} />
          <Route path="/config/cargo-types" element={adminOnly(<CargoTypesConfigPage />)} />
          <Route path="/config/pricing-tables" element={adminOnly(<PricingTablesConfigPage />)} />
          <Route path="/config/road-allowances" element={adminOnly(<RoadAllowancesConfigPage />)} />
          <Route path="/config/penalty-reasons" element={adminOnly(<PenaltyReasonsConfigPage />)} />
          <Route path="/config/drivers" element={adminOnly(<DriversConfigPage />)} />
          <Route path="/config/fuel" element={adminOnly(<FuelConfigPage />)} />
          <Route path="/config/cap-table" element={adminOnly(<CapTableConfigPage />)} />
          <Route path="/config/customers" element={adminOnly(<CustomersConfigPage />)} />
          <Route path="/config/management-fees" element={adminOnly(<ManagementFeesConfigPage />)} />
          <Route path="/users" element={adminOnly(<UsersPage />)} />
          <Route path="/audit-logs" element={adminOnly(<AuditLogPage />)} />
          <Route path="/my-trips" element={driverOnly(<DriverTripsPage />)} />
          <Route path="/my-trips/:id" element={driverOnly(<DriverTripDetailPage />)} />
          <Route path="/my-earnings" element={driverOnly(<DriverEarningsPage />)} />
          <Route
            path="*"
            element={<Navigate to={isDriver ? driverHome : adminHome} replace />}
          />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
