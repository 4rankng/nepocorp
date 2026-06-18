import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { PageHeader } from '../components/UI';
import { api } from '../lib/api';
import { useSearch } from '../context/SearchContext';
import { CONFIG_ITEMS } from '../data/searchRegistry';
import { usePageAnimations } from '../hooks/animations';
import { qk } from '../api/keys';
import './ConfigPage.css';

const CHEVRON = <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const ICON_BASE = '/assets/icons/nepo';

const CONFIG_ICON_MAP: Record<string, string> = {
  fuel: 'config-fuel',
  'road-allowances': 'config-road-allowances',
  'trip-expense': 'config-trip-expense',
  'penalty-reasons': 'config-penalty-reasons',
  drivers: 'config-drivers',
  'cap-table': 'config-cap-table',
  customers: 'config-customers',
  routes: 'config-routes',
  trucks: 'config-trucks',
  trailers: 'config-trailers',
  'cargo-types': 'config-cargo-types',
  'pricing-tables': 'config-pricing-tables',
  'management-fees': 'config-management-fees',
  'salary-periods': 'config-salary-periods',
  'expense-categories': 'config-expense-categories',
  'container-types': 'config-container-types',
  'seal-types': 'config-seal-types',
  ports: 'config-ports',
  'forwarder-expense-types': 'config-forwarder-expense-types',
};

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
  const { rootRef } = usePageAnimations({ ready: true });

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
    sealTypes,
    ports,
    forwarderExpenseTypes,
  ] = useQueries({
    queries: [
      { queryKey: qk.configCounts.penaltyReasons,        queryFn: () => api.get<ListResponse>('/penalty-reasons?limit=1'),    staleTime: 60_000 },
      { queryKey: qk.configCounts.roadAllowances,        queryFn: () => api.get<ListResponse>('/road-allowances?limit=1'),    staleTime: 60_000 },
      { queryKey: qk.configCounts.drivers,               queryFn: () => api.get<ListResponse>('/drivers?limit=1'),            staleTime: 60_000 },
      { queryKey: qk.configCounts.capTable,              queryFn: () => api.get<ListResponse>('/cap-table?limit=1'),          staleTime: 60_000 },
      { queryKey: qk.configCounts.customers,             queryFn: () => api.get<ListResponse>('/customers?limit=1'),          staleTime: 60_000 },
      { queryKey: qk.configCounts.routes,                queryFn: () => api.get<ListResponse>('/routes?limit=1'),             staleTime: 60_000 },
      { queryKey: qk.configCounts.trucks,                queryFn: () => api.get<ListResponse>('/trucks?limit=1'),             staleTime: 60_000 },
      { queryKey: qk.configCounts.trailers,              queryFn: () => api.get<ListResponse>('/trailers?limit=1'),            staleTime: 60_000 },
      { queryKey: qk.configCounts.cargoTypes,            queryFn: () => api.get<ListResponse>('/cargo-types?limit=1'),        staleTime: 60_000 },
      { queryKey: qk.configCounts.pricingTables,         queryFn: () => api.get<ListResponse>('/pricing-tables?limit=1'),     staleTime: 60_000 },
      { queryKey: qk.configCounts.managementFees,        queryFn: () => api.get<ListResponse>('/management-fees?limit=1'),    staleTime: 60_000 },
      { queryKey: qk.configCounts.salaryDefault,         queryFn: () => api.get<{ defaultStartDay?: number; defaultEndDay?: number } | null>('/salary-periods/default'), staleTime: 60_000 },
      { queryKey: qk.configCounts.expenseCategories,     queryFn: () => api.get<ListResponse>('/expense-categories?limit=1'), staleTime: 60_000 },
      { queryKey: qk.configCounts.fuelConfig,            queryFn: () => api.get<{ id: number } | null>('/fuel-config'),       staleTime: 60_000 },
      { queryKey: qk.configCounts.containerTypes,        queryFn: () => api.get<ListResponse>('/container-types?limit=1'),   staleTime: 60_000 },
      { queryKey: qk.configCounts.sealTypes,             queryFn: () => api.get<ListResponse>('/seal-types?limit=1'),        staleTime: 60_000 },
      { queryKey: qk.configCounts.ports,                 queryFn: () => api.get<ListResponse>('/ports?limit=1'),              staleTime: 60_000 },
      { queryKey: qk.configCounts.forwarderExpenseTypes, queryFn: () => api.get<ListResponse>('/forwarder-expense-types?limit=1'), staleTime: 60_000 },
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
    'drivers':                  { status: countLabel(drivers.data?.total, 'lái xe') },
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
    'seal-types':               { status: countLabel(sealTypes.data?.total, 'loại') },
    'ports':                    { status: countLabel(ports.data?.total, 'cảng/bãi') },
    'forwarder-expense-types':  { status: countLabel(forwarderExpenseTypes.data?.total, 'loại') },
  };

  const cards = CONFIG_ITEMS.map(item => {
    const Icon = item.icon;
    const assetName = CONFIG_ICON_MAP[item.id];
    return {
      title: item.label,
      desc: item.description ?? '',
      icon: assetName ? (
        <img src={`${ICON_BASE}/${assetName}.svg`} alt="" aria-hidden="true" />
      ) : (
        <Icon size={20} />
      ),
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
    <div ref={rootRef}>
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
        <div className="settings-grid asset-route-grid">
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
