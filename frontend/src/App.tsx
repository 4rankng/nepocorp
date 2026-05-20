import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
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
import DriverEarningsPage from './pages/DriverEarningsPage';
import DispatchPage from './pages/DispatchPage';
import ProfitPage from './pages/ProfitPage';
import UsersPage from './pages/UsersPage';
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

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dispatch" element={<DispatchPage />} />
        <Route path="/trips" element={<TripListPage />} />
        <Route path="/trips/new" element={<TripCreatePage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/trips/:id/edit" element={<TripEditPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/profit" element={<ProfitPage />} />
        <Route path="/debt" element={<DebtListPage />} />
        <Route path="/debt/:id" element={<DebtDetailPage />} />
        <Route path="/penalties" element={<PenaltyPage />} />
        <Route path="/my-penalties" element={<PenaltyPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/routes" element={<Navigate to="/config/routes" replace />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/config/trucks" element={<TrucksConfigPage />} />
        <Route path="/config/trailers" element={<TrailersConfigPage />} />
        <Route path="/config/routes" element={<RoutesConfigPage />} />
        <Route path="/config/cargo-types" element={<CargoTypesConfigPage />} />
        <Route path="/config/pricing-tables" element={<PricingTablesConfigPage />} />
        <Route path="/config/road-allowances" element={<RoadAllowancesConfigPage />} />
        <Route path="/config/penalty-reasons" element={<PenaltyReasonsConfigPage />} />
        <Route path="/config/drivers" element={<DriversConfigPage />} />
        <Route path="/config/fuel" element={<FuelConfigPage />} />
        <Route path="/config/cap-table" element={<CapTableConfigPage />} />
        <Route path="/config/customers" element={<CustomersConfigPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/audit-logs" element={<AuditLogPage />} />
        <Route path="/my-trips" element={<DriverTripsPage />} />
        <Route path="/my-earnings" element={<DriverEarningsPage />} />
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
