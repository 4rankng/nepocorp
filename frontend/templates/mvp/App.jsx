/* eslint-disable */
// App — main router for NEPO MVP. Sidebar + topbar shell + 16 screens.

const NAV = [
  { key: 'dashboard-d', label: 'Tổng quan (GĐ)',     icon: Icon.Home },
  { key: 'dashboard-a', label: 'Tổng quan (Kế toán)', icon: Icon.CheckSquare },
  { key: 'alerts',      label: 'Cảnh báo',           icon: Icon.Bell, count: 9 },
  { key: 'trips',       label: 'Sổ chuyến đi',       icon: Icon.Truck, count: 412 },
  { key: 'pnl',         label: 'Báo cáo P&L',        icon: Icon.Receipt },
  { key: 'trends',      label: 'Xu hướng 12 tháng',  icon: Icon.TrendingUp },
  { key: 'compare',     label: 'So sánh xe',         icon: Icon.BarChart },
  { key: 'top',         label: 'Top tuyến · KH',     icon: Icon.PieChart },
  { key: 'debt-overview', label: 'Tổng quan công nợ', icon: Icon.Wallet },
  { key: 'debt-list',   label: 'Danh sách công nợ',  icon: Icon.Users, count: '14' },
];

const TITLES = {
  'dashboard-d':   { title: 'Tổng quan',          crumb: 'Giám đốc · Tháng 4, 2026' },
  'dashboard-a':   { title: 'Tổng quan',          crumb: 'Kế toán · Tháng 4, 2026' },
  'alerts':        { title: 'Trung tâm cảnh báo', crumb: '24 giờ qua' },
  'trips':         { title: 'Sổ chuyến đi',       crumb: 'Tháng 4, 2026' },
  'trip-detail':   { title: 'Chi tiết chuyến',    crumb: 'Sổ chuyến đi' },
  'pnl':           { title: 'Báo cáo P&L',        crumb: 'Tháng 4, 2026' },
  'trends':        { title: 'Xu hướng 12 tháng',  crumb: 'T5/25 → T4/26' },
  'compare':       { title: 'So sánh xe',         crumb: 'Tháng 4, 2026' },
  'top':           { title: 'Top tuyến · KH',     crumb: 'Tháng 4, 2026' },
  'debt-overview': { title: 'Tổng quan công nợ',  crumb: 'Cập nhật 14:32' },
  'debt-list':     { title: 'Danh sách công nợ',  crumb: '44 khách hàng' },
  'debt-detail':   { title: 'Chi tiết công nợ',   crumb: 'Danh sách công nợ' },
};

function App() {
  const [page, setPage] = React.useState('dashboard-d');
  const [trip, setTrip] = React.useState(null);
  const [customer, setCustomer] = React.useState(null);
  const [showNewTrip, setShowNewTrip] = React.useState(false);

  // Map page → role label for sidebar/topbar
  const role = page === 'dashboard-a' ? 'Kế toán' : 'Giám đốc';
  const initial = page === 'dashboard-a' ? 'K' : 'G';

  const openTrip = (t) => {
    setTrip(t);
    setPage('trip-detail');
  };
  const backFromTrip = () => {
    setTrip(null);
    setPage('trips');
  };
  const openCustomer = (c) => {
    setCustomer(c);
    setPage('debt-detail');
  };
  const backFromCustomer = () => {
    setCustomer(null);
    setPage('debt-list');
  };

  // Active sidebar key (detail screens highlight their parent)
  const activeKey =
    page === 'trip-detail' ? 'trips' :
    page === 'debt-detail' ? 'debt-list' :
    page;

  let body;
  switch (page) {
    case 'dashboard-d':   body = <DashboardDirector onNav={setPage} />; break;
    case 'dashboard-a':   body = <DashboardAccountant onNav={setPage} />; break;
    case 'alerts':        body = <AlertCenter />; break;
    case 'trips':         body = <TripLog onOpenTrip={openTrip} onNew={() => setShowNewTrip(true)} />; break;
    case 'trip-detail':   body = <TripDetail trip={trip} onBack={backFromTrip} />; break;
    case 'pnl':           body = <PnLScreen />; break;
    case 'trends':        body = <TrendsScreen />; break;
    case 'compare':       body = <CompareScreen />; break;
    case 'top':           body = <TopRoutesScreen />; break;
    case 'debt-overview': body = <DebtOverview onOpenCustomer={openCustomer} onNav={setPage} />; break;
    case 'debt-list':     body = <DebtList onOpenCustomer={openCustomer} />; break;
    case 'debt-detail':   body = <CustomerDetail customer={customer} onBack={backFromCustomer} />; break;
    default:              body = null;
  }

  const meta = TITLES[page] || { title: '', crumb: null };

  return (
    <div className="app">
      <Sidebar
        items={NAV}
        activeKey={activeKey}
        onNavigate={(k) => { setTrip(null); setCustomer(null); setPage(k); }}
        role={role}
        initial={initial}
      />
      <div className="app-main">
        <TopBar title={meta.title} crumb={meta.crumb} role={role} />
        <main className="app-body fade-up">{body}</main>
      </div>
      {showNewTrip ? <NewTripSheet onClose={() => setShowNewTrip(false)} /> : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
