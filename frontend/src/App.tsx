import React, { Suspense, type ReactElement } from 'react';
import { lazyPage } from './lib/lazyPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SearchProvider } from './context/SearchContext';
import { MonthProvider } from './hooks/useMonth';
import { AgentDirectiveProvider } from './context/AgentDirectiveProvider';
import { ReducedMotionProvider } from './hooks/usePrefersReducedMotion';
import { Role } from '@tingting/shared';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/shared/Toast';

const LoginPage = lazyPage(() => import('./pages/LoginPage'));
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'));
const TripListPage = lazyPage(() => import('./pages/TripListPage'));
const TripCreatePage = lazyPage(() => import('./pages/TripCreatePage'));
const TripDetailPage = lazyPage(() => import('./pages/TripDetailPage'));
const TripEditPage = lazyPage(() => import('./pages/TripEditPage'));
const FinancePage = lazyPage(() => import('./pages/FinancePage'));
const DebtListPage = lazyPage(() => import('./pages/DebtListPage'));
const DebtDetailPage = lazyPage(() => import('./pages/DebtDetailPage'));
const PenaltyPage = lazyPage(() => import('./pages/PenaltyPage'));
const ConfigPage = lazyPage(() => import('./pages/ConfigPage'));
const CustomersPage = lazyPage(() => import('./pages/CustomersPage'));
const AuditLogPage = lazyPage(() => import('./pages/AuditLogPage'));
const DriverTripsPage = lazyPage(() => import('./pages/DriverTripsPage'));
const DriverTripDetailPage = lazyPage(() => import('./pages/DriverTripDetailPage'));
const DriverEarningsPage = lazyPage(() => import('./pages/DriverEarningsPage'));
const DriverPenaltyPage = lazyPage(() => import('./pages/DriverPenaltyPage'));
const ForwarderTripsPage = lazyPage(() => import('./pages/ForwarderTripsPage'));
const ForwarderTripDetailPage = lazyPage(() => import('./pages/ForwarderTripDetailPage'));
const ForwarderAdvancesPage = lazyPage(() => import('./pages/ForwarderAdvancesPage'));
const ForwarderSettlementsPage = lazyPage(() => import('./pages/ForwarderSettlementsPage'));
const ForwarderSettlementCreatePage = lazyPage(() => import('./pages/ForwarderSettlementCreatePage'));
const SettlementPrintPage = lazyPage(() => import('./pages/SettlementPrintPage'));
const AdminAdvancesPage = lazyPage(() => import('./pages/AdminAdvancesPage'));
const AdminAdvanceSettlementsPage = lazyPage(() => import('./pages/AdminAdvanceSettlementsPage'));

const DispatchPage = lazyPage(() => import('./pages/DispatchPage'));
const ProfitPage = lazyPage(() => import('./pages/ProfitPage'));
const UsersPage = lazyPage(() => import('./pages/UsersPage'));
const FleetPage = lazyPage(() => import('./pages/FleetPage'));
const TruckTiresPage = lazyPage(() => import('./pages/TruckTiresPage'));
const TrucksConfigPage = lazyPage(() => import('./pages/config/TrucksConfigPage'));
const TruckOwnersConfigPage = lazyPage(() => import('./pages/config/TruckOwnersConfigPage'));
const RoutesConfigPage = lazyPage(() => import('./pages/config/RoutesConfigPage'));
const CargoTypesConfigPage = lazyPage(() => import('./pages/config/CargoTypesConfigPage'));
const PricingTablesConfigPage = lazyPage(() => import('./pages/config/PricingTablesConfigPage'));
const RoadAllowancesConfigPage = lazyPage(() => import('./pages/config/RoadAllowancesConfigPage'));
const PenaltyReasonsConfigPage = lazyPage(() => import('./pages/config/PenaltyReasonsConfigPage'));
const FuelConfigPage = lazyPage(() => import('./pages/config/FuelConfigPage'));
const FuelSuppliersConfigPage = lazyPage(() => import('./pages/config/FuelSuppliersConfigPage'));
const FaqEntriesConfigPage = lazyPage(() => import('./pages/config/FaqEntriesConfigPage'));
const AppSettingsConfigPage = lazyPage(() => import('./pages/config/AppSettingsConfigPage'));
const CompanyInfoConfigPage = lazyPage(() => import('./pages/config/CompanyInfoConfigPage'));
const CapTableConfigPage = lazyPage(() => import('./pages/config/CapTableConfigPage'));
const CustomersConfigPage = lazyPage(() => import('./pages/config/CustomersConfigPage'));
const TrailersConfigPage = lazyPage(() => import('./pages/config/TrailersConfigPage'));
const SalaryPeriodConfigPage = lazyPage(() => import('./pages/config/SalaryPeriodConfigPage'));
const TripExpenseConfigPage = lazyPage(() => import('./pages/config/TripExpenseConfigPage'));
const SupplierListPage = lazyPage(() => import('./pages/SupplierListPage'));
const ExpenseListPage = lazyPage(() => import('./pages/ExpenseListPage'));
const ExpenseEntryPage = lazyPage(() => import('./pages/ExpenseEntryPage'));
const PayableListPage = lazyPage(() => import('./pages/PayableListPage'));
const PayableDetailPage = lazyPage(() => import('./pages/PayableDetailPage'));
const SalaryAttendancePage = lazyPage(() => import('./pages/SalaryAttendancePage'));

const ExpenseCategoriesConfigPage = lazyPage(() => import('./pages/config/ExpenseCategoriesConfigPage'));
const ForwarderExpenseTypesConfigPage = lazyPage(() => import('./pages/config/ForwarderExpenseTypesConfigPage'));
const TirePositionsConfigPage = lazyPage(() => import('./pages/config/TirePositionsConfigPage'));
const DebitNoteTemplatesConfigPage = lazyPage(() => import('./pages/config/DebitNoteTemplatesConfigPage'));
const DebitNoteTemplateEditorPage = lazyPage(() => import('./pages/config/DebitNoteTemplateEditorPage'));
const ChatbotMonitoringPage = lazyPage(() => import('./pages/ChatbotMonitoringPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 10, color: 'var(--fg-3)' }}>
      <div className="spin" style={{ width: 24, height: 24, border: '3px solid var(--border-2)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14 }}>Đang tải…</span>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!isAuthenticated) return (
    <Suspense fallback={<PageLoader />}>
      <LoginPage />
    </Suspense>
  );

  const isDriver = user?.role === Role.DRIVER;
  const isForwarder = user?.role === Role.FORWARDER;
  const isAdmin = user?.role === Role.ADMIN;
  const driverHome = '/my-trips';
  const forwarderHome = '/my-forwarder-trips';
  const adminHome = '/dashboard';
  const isPortalUser = isDriver || isForwarder;
  const portalHome = isDriver ? driverHome : forwarderHome;
  const adminOnly = (el: ReactElement) => (isPortalUser ? <Navigate to={portalHome} replace /> : el);
  const driverOnly = (el: ReactElement) => (isDriver ? el : <Navigate to={isForwarder ? forwarderHome : adminHome} replace />);
  const forwarderOnly = (el: ReactElement) => (isForwarder ? el : <Navigate to={isDriver ? driverHome : adminHome} replace />);
  const managerOrAdminOnly = (el: ReactElement) => (isAdmin || user?.role === Role.MANAGER ? el : <Navigate to={isPortalUser ? portalHome : adminHome} replace />);
  // /users is the single home for everyone; accountants get scoped (driver-only) access.
  const officeStaffOnly = (el: ReactElement) => (isAdmin || user?.role === Role.MANAGER || user?.role === Role.ACCOUNTANT ? el : <Navigate to={isPortalUser ? portalHome : adminHome} replace />);
  // Strict ADMIN-only — chatbot monitoring exposes raw turns and must never
  // be reachable by MANAGER/ACCOUNTANT. Mirrors managerOrAdminOnly's shape:
  // admit only when the role matches, else bounce to the portal or staff home.
  const strictAdminOnly = (el: ReactElement) => (user?.role === Role.ADMIN ? el : <Navigate to={isPortalUser ? portalHome : adminHome} replace />);

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
    <Layout>
      <Routes>
          <Route path="/" element={<Navigate to={isPortalUser ? portalHome : adminHome} replace />} />
          <Route
            path="/dashboard"
            element={isPortalUser ? <Navigate to={portalHome} replace /> : page(<DashboardPage />)}
          />
          <Route path="/dispatch" element={adminOnly(page(<DispatchPage />))} />
          <Route path="/fleet" element={adminOnly(page(<FleetPage />))} />
<Route path="/fleet/:id/tires" element={officeStaffOnly(page(<TruckTiresPage />))} />
<Route path="/fleet/trailers/:id/tires" element={officeStaffOnly(page(<TruckTiresPage vehicle="trailer" />))} />
          <Route path="/trips" element={adminOnly(page(<TripListPage />))} />
          <Route path="/trips/new" element={adminOnly(page(<TripCreatePage />))} />
          <Route path="/trips/:id" element={adminOnly(page(<TripDetailPage />))} />
          <Route path="/trips/:id/edit" element={adminOnly(page(<TripEditPage />))} />
          <Route path="/finance" element={adminOnly(page(<FinancePage />))} />
          <Route path="/profit" element={adminOnly(page(<ProfitPage />))} />
          <Route path="/debt" element={adminOnly(page(<DebtListPage />))} />
          <Route path="/debt/:id" element={adminOnly(page(<DebtDetailPage />))} />
          <Route path="/debt/:id/billing/new" element={adminOnly(page(<DebtDetailPage />))} />
          <Route path="/penalties" element={adminOnly(page(<PenaltyPage />))} />
          <Route path="/advances" element={adminOnly(page(<AdminAdvancesPage />))} />
          <Route path="/admin/advance-settlements" element={officeStaffOnly(page(<AdminAdvanceSettlementsPage />))} />

          <Route path="/my-penalties" element={driverOnly(page(<DriverPenaltyPage />))} />
          <Route path="/customers" element={adminOnly(page(<CustomersPage />))} />
          <Route path="/customers/:id" element={adminOnly(page(<DebtDetailPage />))} />
          <Route path="/customers/:id/billing/new" element={adminOnly(page(<DebtDetailPage />))} />
          <Route path="/routes" element={<Navigate to="/config/routes" replace />} />
          <Route path="/trucks" element={<Navigate to="/fleet" replace />} />
          <Route path="/drivers" element={<Navigate to="/fleet" replace />} />
          <Route path="/trailers" element={<Navigate to="/config/trailers" replace />} />
          <Route path="/config" element={adminOnly(page(<ConfigPage />))} />
          <Route path="/config/trailers" element={adminOnly(page(<TrailersConfigPage />))} />
          <Route path="/config/trucks" element={adminOnly(page(<TrucksConfigPage />))} />
          <Route path="/config/trucks/:truckId/owners" element={adminOnly(page(<TruckOwnersConfigPage />))} />
          <Route path="/config/routes" element={adminOnly(page(<RoutesConfigPage />))} />
          <Route path="/config/cargo-types" element={adminOnly(page(<CargoTypesConfigPage />))} />
          <Route path="/config/pricing-tables" element={adminOnly(page(<PricingTablesConfigPage />))} />
          <Route path="/config/road-allowances" element={adminOnly(page(<RoadAllowancesConfigPage />))} />
          <Route path="/config/penalty-reasons" element={adminOnly(page(<PenaltyReasonsConfigPage />))} />
          <Route path="/config/fuel" element={adminOnly(page(<FuelConfigPage />))} />
          <Route path="/config/fuel-suppliers" element={adminOnly(page(<FuelSuppliersConfigPage />))} />
          <Route path="/config/llm-settings" element={strictAdminOnly(<Navigate to="/config/app-settings" replace />)} />
          <Route path="/config/faq-entries" element={strictAdminOnly(page(<FaqEntriesConfigPage />))} />
          <Route path="/config/app-settings" element={strictAdminOnly(page(<AppSettingsConfigPage />))} />
          <Route path="/config/company-info" element={adminOnly(page(<CompanyInfoConfigPage />))} />
          <Route path="/config/trip-expense" element={adminOnly(page(<TripExpenseConfigPage />))} />
          <Route path="/config/cap-table" element={adminOnly(page(<CapTableConfigPage />))} />
          <Route path="/config/customers" element={adminOnly(page(<CustomersConfigPage />))} />
          <Route path="/config/management-fees" element={<Navigate to="/config" replace />} />
          <Route path="/config/salary-periods" element={adminOnly(page(<SalaryPeriodConfigPage />))} />
          <Route path="/config/expense-categories" element={adminOnly(page(<ExpenseCategoriesConfigPage />))} />
          <Route path="/config/tire-positions" element={officeStaffOnly(page(<TirePositionsConfigPage />))} />
          <Route path="/config/container-types" element={<Navigate to="/config" replace />} />
          <Route path="/config/seal-types" element={<Navigate to="/config" replace />} />
          <Route path="/config/ports" element={<Navigate to="/config" replace />} />
          <Route path="/config/forwarder-expense-types" element={adminOnly(page(<ForwarderExpenseTypesConfigPage />))} />
          <Route path="/config/debit-note-templates" element={officeStaffOnly(page(<DebitNoteTemplatesConfigPage />))} />
          <Route path="/config/debit-note-templates/new" element={officeStaffOnly(page(<DebitNoteTemplateEditorPage />))} />
          <Route path="/config/debit-note-templates/:id" element={officeStaffOnly(page(<DebitNoteTemplateEditorPage />))} />
          <Route path="/suppliers" element={adminOnly(page(<SupplierListPage />))} />
          <Route path="/suppliers/:id" element={adminOnly(page(<PayableDetailPage />))} />
          <Route path="/expenses" element={adminOnly(page(<ExpenseListPage />))} />
          <Route path="/expenses/new" element={adminOnly(page(<ExpenseEntryPage />))} />
          <Route path="/expenses/:id/edit" element={adminOnly(page(<ExpenseEntryPage />))} />
          <Route path="/payables" element={adminOnly(page(<PayableListPage />))} />
          <Route path="/payables/:id" element={adminOnly(page(<PayableDetailPage />))} />
          <Route path="/salary" element={adminOnly(page(<SalaryAttendancePage />))} />
          <Route path="/users" element={officeStaffOnly(page(<UsersPage />))} />
          <Route path="/chatbot-monitoring" element={strictAdminOnly(page(<ChatbotMonitoringPage />))} />
          <Route path="/audit-logs" element={managerOrAdminOnly(page(<AuditLogPage />))} />
          <Route path="/audit-log" element={<Navigate to="/audit-logs" replace />} />
          <Route path="/admin/audit-logs" element={<Navigate to="/audit-logs" replace />} />
          <Route path="/admin/audit-log" element={<Navigate to="/audit-logs" replace />} />
          <Route path="/my-trips" element={driverOnly(page(<DriverTripsPage />))} />
          <Route path="/my-trips/:id" element={driverOnly(page(<DriverTripDetailPage />))} />
          <Route path="/my-earnings" element={driverOnly(page(<DriverEarningsPage />))} />
          <Route path="/my-forwarder-trips" element={forwarderOnly(page(<ForwarderTripsPage />))} />
          <Route path="/my-forwarder-trips/:id" element={forwarderOnly(page(<ForwarderTripDetailPage />))} />
          <Route path="/my-advances" element={forwarderOnly(page(<ForwarderAdvancesPage />))} />
          <Route path="/my-settlements" element={forwarderOnly(page(<ForwarderSettlementsPage />))} />
          <Route path="/my-settlements/new" element={forwarderOnly(page(<ForwarderSettlementCreatePage />))} />
          <Route path="/my-settlements/:id" element={forwarderOnly(page(<SettlementPrintPage />))} />
          <Route path="/settlements/:id" element={officeStaffOnly(page(<SettlementPrintPage />))} />
          <Route
            path="*"
            element={<Navigate to={isPortalUser ? portalHome : adminHome} replace />}
          />
        </Routes>
      </Layout>
  );
}

export default function App() {
  return (
    <ReducedMotionProvider>
      <AuthProvider>
        <ToastProvider>
          <AgentDirectiveProvider>
            <MonthProvider>
              <SearchProvider>
                {/* Last line of defence against a blank screen: the per-route
                    boundary only covers the routed page, so a render error in
                    the shell itself (Topbar, sidebar, pickers) used to unmount
                    the whole tree and leave a page with nothing to click — the
                    reported shape of kanban 101026211510. With this boundary the
                    failure renders the recoverable error UI (message + "Thử lại"
                    in the console's componentStack) instead. */}
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </SearchProvider>
            </MonthProvider>
          </AgentDirectiveProvider>
        </ToastProvider>
      </AuthProvider>
    </ReducedMotionProvider>
  );
}
