import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TripListPage from './pages/TripListPage';
import TripCreatePage from './pages/TripCreatePage';
import TripDetailPage from './pages/TripDetailPage';
import FinancePage from './pages/FinancePage';
import DebtListPage from './pages/DebtListPage';
import DebtDetailPage from './pages/DebtDetailPage';
import PenaltyPage from './pages/PenaltyPage';
import ConfigPage from './pages/ConfigPage';
import AuditLogPage from './pages/AuditLogPage';
import DriverTripsPage from './pages/DriverTripsPage';
import DriverEarningsPage from './pages/DriverEarningsPage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trips" element={<TripListPage />} />
        <Route path="/trips/new" element={<TripCreatePage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/debt" element={<DebtListPage />} />
        <Route path="/debt/:id" element={<DebtDetailPage />} />
        <Route path="/penalties" element={<PenaltyPage />} />
        <Route path="/my-penalties" element={<PenaltyPage />} />
        <Route path="/config/*" element={<ConfigPage />} />
        <Route path="/users" element={<div className="page-header"><div><h1>Người dùng</h1><p>Quản lý tài khoản người dùng</p></div></div>} />
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
