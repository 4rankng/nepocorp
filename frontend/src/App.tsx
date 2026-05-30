import type { ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Role } from '@nepocorp/shared';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TripListPage from './pages/TripListPage';
import TripCreatePage from './pages/TripCreatePage';
import TripDetailPage from './pages/TripDetailPage';
import TripEditPage from './pages/TripEditPage';
import FinancePage from './pages/FinancePage';
import DebtListPage from './pages/DebtListPage';
import DebtDetailPage from './pages/DebtDetailPage';
import PenaltyPage from './pages/PenaltyPage';
import ConfigPage from './pages/ConfigPage';
import CustomersPage from './pages/CustomersPage';
import AuditLogPage from './pages/AuditLogPage';
import DriverTripsPage from './pages/DriverTripsPage';
import DriverTripDetailPage from './pages/DriverTripDetailPage';
import DriverEarningsPage from './pages/DriverEarningsPage';
import DriverPenaltyPage from './pages/DriverPenaltyPage';
import DispatchPage from './pages/DispatchPage';
import ProfitPage from './pages/ProfitPage';
import UsersPage from './pages/UsersPage';
import FleetPage from './pages/FleetPage';
// Config section pages
import TrucksConfigPage from './pages/config/TrucksConfigPage';
import TrailersConfigPage from './pages/config/TrailersConfigPage';
import RoutesConfigPage from './pages/config/RoutesConfigPage';
import CargoTypesConfigPage from './pages/config/CargoTypesConfigPage';
import PricingTablesConfigPage from './pages/config/PricingTablesConfigPage';
import RoadAllowancesConfigPage from './pages/config/RoadAllowancesConfigPage';
import PenaltyReasonsConfigPage from './pages/config/PenaltyReasonsConfigPage';
import DriversConfigPage from './pages/config/DriversConfigPage';
import FuelConfigPage from './pages/config/FuelConfigPage';
import CapTableConfigPage from './pages/config/CapTableConfigPage';
import CustomersConfigPage from './pages/config/CustomersConfigPage';
import ManagementFeesConfigPage from './pages/config/ManagementFeesConfigPage';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <LoginPage />;

  // Role-based home + guards. Per the product spec, drivers see a separate
  // mobile-first surface (their schedule / earnings / penalties) and MUST
  // NOT see the company-wide financial dashboard, fleet management, debt
  // ledger, etc. Previously every role landed on /dashboard which leaked
  // financial KPIs to drivers.
  const isDriver = user?.role === Role.DRIVER;
  const driverHome = '/my-trips';
  const adminHome = '/dashboard';
  // Block helper — if driver, redirect to driver home; otherwise render
  // the admin-only page. Used to prevent drivers from URL-jumping to /finance,
  // /debt, /users, etc. (sidebar already hides them, but the routes were open).
  const adminOnly = (el: ReactElement) => (isDriver ? <Navigate to={driverHome} replace /> : el);
  // Inverse — driver-only pages. Admins who land on these get sent home so
  // they don't see "Kỷ luật của tôi" / "Thu nhập của tôi" framed as theirs.
  const driverOnly = (el: ReactElement) => (isDriver ? el : <Navigate to={adminHome} replace />);

  return (
    <Layout>
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
        {/* Sensible redirects for legacy / typed URLs — used to render a blank
            page when someone navigated to /trucks etc. directly. */}
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
        {/* Catch-all 404 — was rendering as an entirely blank page when the
            user landed on an unknown route. Drivers get bounced to their own
            home page (never the admin dashboard); admins get the dashboard. */}
        <Route
          path="*"
          element={<Navigate to={isDriver ? driverHome : adminHome} replace />}
        />
      </Routes>
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
