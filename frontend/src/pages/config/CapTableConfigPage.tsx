import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader, Panel } from '../../components/UI';
import { InlineForm, FormActions } from '../../components/config';
import { useCRUD } from '../../hooks/useCRUD';
import type { CapTableHistory, PaginatedResponse } from '@nepocorp/shared';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function CapTableForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: CapTableHistory; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [partnerName, setPartnerName] = useState(item?.partnerName || '');
  const [percentage, setPercentage] = useState(item?.percentage || '');
  const [effectiveDate, setEffectiveDate] = useState(item ? item.effectiveDate.split('T')[0] : '');
  return (
    <InlineForm colSpan={5}>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tên cổ đông"><input className="input" value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="Nhập tên cổ đông..." /></Field>
      </div>
      <div style={{ flex: 1, minWidth: 100 }}>
        <Field label="Tỷ lệ cổ phần (%)"><input className="input" type="number" step="0.01" value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="0.00" /></Field>
      </div>
      <div style={{ flex: 1.5, minWidth: 150 }}>
        <Field label="Ngày hiệu lực"><input className="input" type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} /></Field>
      </div>
      <FormActions saving={saving} isedit={!!item} oncancel={oncancel} onsave={() => {
        if (!partnerName.trim() || !percentage || !effectiveDate) return;
        onsave({ partnerName: partnerName.trim(), percentage: Number(percentage), effectiveDate });
      }} />
    </InlineForm>
  );
}

export default function CapTableConfigPage() {
  const navigate = useNavigate();
  const [capTable, setCapTable] = useState<CapTableHistory[]>([]);

  const refresh = useCallback(async () => {
    const r = await api.get<PaginatedResponse<CapTableHistory>>('/cap-table');
    setCapTable(r.items || []);
  }, []);

  const crud = useCRUD('/cap-table', refresh);
  useEffect(() => { refresh(); }, [refresh]);

  // Order latest first, and flag the currently-active row per partner (the
  // most recent snapshot date that's been reached, taking the latest-created
  // row when multiple share the same effective_date — the same logic used
  // when computing distributions). Historical rows are dimmed so the user
  // can see at a glance which entries are "live".
  const { ordered, activeIds } = useMemo(() => {
    if (!capTable.length) return { ordered: [], activeIds: new Set<number>() };
    const today = new Date().toISOString().slice(0, 10);
    const reached = capTable.filter(c => c.effectiveDate <= today);
    const pool = reached.length > 0 ? reached : capTable;
    const latestDate = pool.reduce((a, c) => (c.effectiveDate > a ? c.effectiveDate : a), pool[0].effectiveDate);
    const byName = new Map<string, CapTableHistory>();
    for (const row of pool.filter(c => c.effectiveDate === latestDate)) {
      const prev = byName.get(row.partnerName);
      if (!prev || new Date(row.createdAt) > new Date(prev.createdAt)) byName.set(row.partnerName, row);
    }
    const activeIds = new Set(Array.from(byName.values(), (r) => r.id));
    const ordered = [...capTable].sort((a, b) => {
      // Active rows first, then by effective date desc, then by created_at desc
      const aA = activeIds.has(a.id) ? 1 : 0;
      const bA = activeIds.has(b.id) ? 1 : 0;
      if (aA !== bA) return bA - aA;
      if (a.effectiveDate !== b.effectiveDate) return a.effectiveDate < b.effectiveDate ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return { ordered, activeIds };
  }, [capTable]);

  return (
    <div className="fade-up">
      <PageHeader title="Tỷ lệ cổ phần (Cap Table)" description="Lịch sử tỷ lệ góp vốn cổ đông công ty" onBack={() => navigate('/config')} />
      <Panel flush>
        <div className="toolbar" style={{ borderBottom: 'none', padding: '16px 20px 8px' }}>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--fg-3)' }}>
            {activeIds.size > 0 && (
              <>Hiện tại: <strong style={{ color: 'var(--fg-1)' }}>{activeIds.size}</strong> cổ đông đang chia · {ordered.length - activeIds.size} bản ghi lịch sử</>
            )}
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}><Plus size={14} /> Thêm mới</button>
        </div>
        <div className="table-scroll">
          <table className="tt-table">
            <thead><tr><th style={{ width: 40 }}>#</th><th>Tên cổ đông</th><th className="num">Tỷ lệ (%)</th><th>Ngày hiệu lực</th><th style={{ width: 80 }}>Thao tác</th></tr></thead>
            <tbody>
              {crud.showAddForm && !crud.editingId && <CapTableForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />}
              {ordered.length === 0 && !crud.showAddForm && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--fg-3)' }}>Chưa có dữ liệu</td></tr>}
              {ordered.map((ct, i) => {
                if (crud.editingId === ct.id) return <CapTableForm key={`edit-${ct.id}`} saving={crud.saving} item={ct} onsave={d => crud.doUpdate(ct.id, d)} oncancel={crud.cancelForm} />;
                const isActive = activeIds.has(ct.id);
                return (
                  <tr key={ct.id} style={isActive ? undefined : { opacity: 0.55 }}>
                    <td className="num">{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--fg-1)' }}>
                      {ct.partnerName}
                      {isActive && (
                        <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>HIỆN TẠI</span>
                      )}
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: isActive ? 'var(--brand)' : 'var(--fg-2)' }}>{Number(ct.percentage).toFixed(2)}%</td>
                    <td>{ct.effectiveDate ? new Date(ct.effectiveDate).toLocaleDateString('vi-VN') : '—'}</td>
                    <td>
                      {/* Cap-table history rows are immutable on the server
                          (DELETE returns 405 because the table has no soft-
                          delete column); only show the edit affordance and
                          let users supersede via "Thêm mới". */}
                      <button className="btn btn--ghost btn--sm" title="Sửa" onClick={() => crud.setEditingId(ct.id)}><Pencil size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {crud.error && <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 12 }}>{crud.error}</div>}
    </div>
  );
}
