import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { PageHeader } from '../components/UI';
import { api } from '../lib/api';
import { useSearch } from '../context/SearchContext';
import { CONFIG_ITEMS } from '../data/searchRegistry';

const CHEVRON = <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

type ListResponse = { total: number };

function countLabel(n: number | undefined, unit: string): string {
  if (n === undefined) return '—';
  return `${n} ${unit}`;
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export default function ConfigPage() {
  const navigate = useNavigate();
  const { searchQuery } = useSearch();

  const [
    penaltyReasons,
    roadAllowances,
    drivers,
    capTable,
    customers,
    routes,
    trucks,
    trailers,
    cargoTypes,
    pricingTables,
    managementFees,
    salaryDefault,
    expenseCategories,
    fuelConfig,
    containerTypes,
    ports,
    forwarderExpenseTypes,
  ] = useQueries({
    queries: [
      { queryKey: ['cfg-count', 'penalty-reasons'],    queryFn: () => api.get<ListResponse>('/penalty-reasons?limit=1'),    staleTime: 60_000 },
      { queryKey: ['cfg-count', 'road-allowances'],    queryFn: () => api.get<ListResponse>('/road-allowances?limit=1'),    staleTime: 60_000 },
      { queryKey: ['cfg-count', 'drivers'],            queryFn: () => api.get<ListResponse>('/drivers?limit=1'),            staleTime: 60_000 },
      { queryKey: ['cfg-count', 'cap-table'],          queryFn: () => api.get<ListResponse>('/cap-table?limit=1'),          staleTime: 60_000 },
      { queryKey: ['cfg-count', 'customers'],          queryFn: () => api.get<ListResponse>('/customers?limit=1'),          staleTime: 60_000 },
      { queryKey: ['cfg-count', 'routes'],             queryFn: () => api.get<ListResponse>('/routes?limit=1'),             staleTime: 60_000 },
      { queryKey: ['cfg-count', 'trucks'],             queryFn: () => api.get<ListResponse>('/trucks?limit=1'),             staleTime: 60_000 },
      { queryKey: ['cfg-count', 'trailers'],            queryFn: () => api.get<ListResponse>('/trailers?limit=1'),            staleTime: 60_000 },
      { queryKey: ['cfg-count', 'cargo-types'],        queryFn: () => api.get<ListResponse>('/cargo-types?limit=1'),        staleTime: 60_000 },
      { queryKey: ['cfg-count', 'pricing-tables'],     queryFn: () => api.get<ListResponse>('/pricing-tables?limit=1'),     staleTime: 60_000 },
      { queryKey: ['cfg-count', 'management-fees'],    queryFn: () => api.get<ListResponse>('/management-fees?limit=1'),    staleTime: 60_000 },
      { queryKey: ['cfg-count', 'salary-default'],     queryFn: () => api.get<{ defaultStartDay?: number; defaultEndDay?: number } | null>('/salary-periods/default'), staleTime: 60_000 },
      { queryKey: ['cfg-count', 'expense-categories'], queryFn: () => api.get<ListResponse>('/expense-categories?limit=1'), staleTime: 60_000 },
      { queryKey: ['cfg-count', 'fuel-config'],        queryFn: () => api.get<{ id: number } | null>('/fuel-config'),       staleTime: 60_000 },
      { queryKey: ['cfg-count', 'container-types'],    queryFn: () => api.get<ListResponse>('/container-types?limit=1'),   staleTime: 60_000 },
      { queryKey: ['cfg-count', 'ports'],              queryFn: () => api.get<ListResponse>('/ports?limit=1'),              staleTime: 60_000 },
      { queryKey: ['cfg-count', 'forwarder-expense-types'], queryFn: () => api.get<ListResponse>('/forwarder-expense-types?limit=1'), staleTime: 60_000 },
    ],
  });

  function salaryStatus(): string {
    if (salaryDefault.isLoading) return '—';
    const d = salaryDefault.data;
    if (!d || d.defaultStartDay == null) return 'Chưa cấu hình';
    const s = d.defaultStartDay;
    const e = d.defaultEndDay;
    if (s != null && e != null && s <= e) {
      // Same-month mode
      const endLabel = e === 31 ? 'cuối tháng' : `ngày ${e}`;
      return `Ngày ${s} → ${endLabel}`;
    }
    return `Ngày ${s} tháng trước → Ngày ${e} tháng này`;
  }

  function fuelStatus(): string {
    if (fuelConfig.isLoading) return '—';
    return fuelConfig.data ? 'Đã cấu hình' : 'Chưa cấu hình';
  }

  const statusInfo: Record<string, { status: string; statusColor?: string }> = {
    'fuel':                     { status: fuelStatus() },
    'road-allowances':          { status: countLabel(roadAllowances.data?.total, 'tuyến') },
    'trip-expense':             { status: '5 mục', statusColor: '#10B981' },
    'penalty-reasons':          { status: countLabel(penaltyReasons.data?.total, 'quy tắc') },
    'drivers':                  { status: countLabel(drivers.data?.total, 'tài xế') },
    'cap-table':                { status: countLabel(capTable.data?.total, 'cổ đông') },
    'customers':                { status: countLabel(customers.data?.total, 'khách hàng') },
    'routes':                   { status: countLabel(routes.data?.total, 'tuyến chặng') },
    'trucks':                   { status: countLabel(trucks.data?.total, 'xe') },
    'trailers':                 { status: countLabel(trailers.data?.total, 'rơ-moóc') },
    'cargo-types':              { status: countLabel(cargoTypes.data?.total, 'loại hàng') },
    'pricing-tables':           { status: countLabel(pricingTables.data?.total, 'đơn giá') },
    'management-fees':          { status: countLabel(managementFees.data?.total, 'khoản phí') },
    'salary-periods':           { status: salaryStatus() },
    'expense-categories':       { status: countLabel(expenseCategories.data?.total, 'hạng mục') },
    'container-types':          { status: countLabel(containerTypes.data?.total, 'loại') },
    'ports':                    { status: countLabel(ports.data?.total, 'cảng/bãi') },
    'forwarder-expense-types':  { status: countLabel(forwarderExpenseTypes.data?.total, 'loại') },
  };

  const cards = CONFIG_ITEMS.map(item => {
    const Icon = item.icon;
    return {
      title: item.label,
      desc: item.description ?? '',
      icon: <Icon size={20} />,
      path: item.path,
      action: item.action ?? 'Sửa',
      ...(statusInfo[item.id] ?? { status: '—' }),
    };
  });

  const filteredCards = cards.filter(card => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const queryNormalized = removeVietnameseTones(query);
    const titleNormalized = removeVietnameseTones(card.title.toLowerCase());
    const descNormalized = removeVietnameseTones(card.desc.toLowerCase());

    return (
      titleNormalized.includes(queryNormalized) ||
      descNormalized.includes(queryNormalized)
    );
  });

  return (
    <div className="fade-up">
      <PageHeader
        title="Cấu hình hệ thống"
        description="Quản lý định mức, quy tắc tính toán, người dùng & tích hợp hệ thống"
      />

      {searchQuery.trim() && (
        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={14} />
          Tìm thấy <strong>{filteredCards.length}</strong> kết quả phù hợp cho từ khóa "{searchQuery}"
        </div>
      )}

      {filteredCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 32px', border: '1px dashed var(--line)', borderRadius: 12, background: 'var(--bg-2)', color: 'var(--fg-3)' }}>
          <Search size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>Không tìm thấy cấu hình</h3>
          <p style={{ fontSize: 13 }}>Hãy thử tìm kiếm với từ khóa khác.</p>
        </div>
      ) : (
        <div className="settings-grid">
          {filteredCards.map((card, idx) => (
            <button key={idx} className="setting-card" onClick={() => navigate(card.path)}>
              <div className="setting-card__icon">{card.icon}</div>
              <h3 className="setting-card__title">{card.title}</h3>
              <p className="setting-card__desc">{card.desc}</p>
              <div className="setting-card__foot">
                <span className="setting-card__status">
                  <span className="dot" style={card.statusColor ? { background: card.statusColor } : undefined}></span>
                  {card.status}
                </span>
                <span className="setting-card__action">{card.action} {CHEVRON}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
