import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCRUD } from '../../hooks/useCRUD';
import { Modal, useConfirm, Btn, FormGroup } from '../../components/UI';
import type { PenaltyReason, PaginatedResponse } from '@nepocorp/shared';

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .pr-wrapper {
    --green-900: #003D1E;
    --green-800: #005A2D;
    --green-700: #00713A;
    --accent: #00B14F;
    --accent-soft: #E6F7EE;
    --accent-soft-2: #D2F0DF;
    --ink: #0F1B14;
    --ink-2: #3D4B43;
    --muted: #7A8A80;
    --line: #E8ECE9;
    --line-2: #EFF2F0;
    --bg: #F4F7F5;
    --card: #FFFFFF;
    --sev-low: #64748B;
    --sev-low-bg: #F1F5F9;
    --sev-mid: #D98A00;
    --sev-mid-bg: #FFF6E5;
    --sev-high: #D92D20;
    --sev-high-bg: #FEECEB;
    --shadow: 0 1px 2px rgba(16,27,20,.04), 0 6px 20px -8px rgba(16,27,20,.10);
    --shadow-hover: 0 2px 4px rgba(16,27,20,.05), 0 18px 40px -16px rgba(0,90,45,.22);
    
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    color: var(--ink);
    min-height: 100vh;
    background: var(--bg);
    margin: -24px; /* to offset parent padding if any */
    padding: 26px 32px 60px;
    animation: pr-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes pr-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes pr-stagger {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  
  .pr-wrapper * { box-sizing: border-box; }
  .pr-mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: "tnum"; }

  .pr-pagehead { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
  .pr-back { width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--card); display: grid; place-items: center; cursor: pointer; color: var(--ink-2); flex-shrink: 0; transition: .15s; }
  .pr-back:hover { border-color: var(--accent); color: var(--accent); }
  .pr-pagehead h1 { font-size: 27px; font-weight: 800; letter-spacing: -.5px; margin: 0; line-height: 1.2; }
  .pr-pagehead p { color: var(--muted); font-size: 14.5px; margin-top: 5px; max-width: 620px; line-height: 1.5; margin-bottom: 0; }
  .pr-btn-primary {
    margin-left: auto; flex-shrink: 0; display: flex; align-items: center; gap: 9px;
    background: var(--accent); color: #fff; border: 0; border-radius: 13px; padding: 0 22px; height: 48px;
    font: inherit; font-weight: 700; font-size: 14.5px; cursor: pointer; white-space: nowrap;
    box-shadow: 0 8px 20px -8px rgba(0,177,79,.6); transition: .15s;
  }
  .pr-btn-primary:hover { background: #00a047; transform: translateY(-1px); }

  .pr-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .pr-stat { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; box-shadow: var(--shadow); }
  .pr-stat .lab { font-size: 12.5px; color: var(--muted); font-weight: 600; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .pr-stat .ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; }
  .pr-stat .val { font-size: 25px; font-weight: 800; margin-top: 12px; letter-spacing: -.5px; white-space: nowrap; }
  .pr-stat .val small { font-size: 14px; font-weight: 700; color: var(--muted); font-family: 'Plus Jakarta Sans', sans-serif; }
  .pr-stat .sub { font-size: 12px; color: var(--muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Plus Jakarta Sans', sans-serif; }

  .pr-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .pr-search2 { flex: 1; min-width: 260px; height: 48px; border-radius: 13px; background: var(--card); border: 1px solid var(--line); display: flex; align-items: center; gap: 11px; padding: 0 16px; color: var(--muted); box-shadow: var(--shadow); }
  .pr-search2 input { border: 0; outline: 0; background: none; flex: 1; font: inherit; font-size: 14.5px; color: var(--ink); }
  .pr-filters { display: flex; gap: 8px; background: var(--card); border: 1px solid var(--line); border-radius: 13px; padding: 5px; box-shadow: var(--shadow); }
  .pr-chip { border: 0; background: none; font: inherit; font-weight: 600; font-size: 13.5px; color: var(--ink-2); padding: 8px 15px; border-radius: 9px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 7px; transition: .15s; }
  .pr-chip:hover { background: var(--bg); }
  .pr-chip.active { background: var(--accent-soft); color: var(--green-700); }
  .pr-chip .dot { width: 8px; height: 8px; border-radius: 50%; }
  .pr-sortbtn { height: 48px; border: 1px solid var(--line); background: var(--card); border-radius: 13px; padding: 0 16px; font: inherit; font-weight: 600; font-size: 13.5px; color: var(--ink-2); cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: var(--shadow); white-space: nowrap; }
  .pr-sortbtn:hover { border-color: var(--accent); color: var(--accent); }

  .pr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 18px; }
  .pr-card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 20px; box-shadow: var(--shadow); transition: all .3s cubic-bezier(0.16, 1, 0.3, 1); position: relative; display: flex; flex-direction: column; animation: pr-stagger 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .pr-card:hover { box-shadow: var(--shadow-hover); border-color: var(--accent-soft-2); transform: translateY(-4px) scale(1.01); }
  .pr-card-top { display: flex; align-items: flex-start; gap: 14px; }
  .pr-card-ic { width: 48px; height: 48px; border-radius: 13px; display: grid; place-items: center; flex-shrink: 0; }
  .pr-card-titlewrap { flex: 1; min-width: 0; }
  .pr-card-title { font-size: 16.5px; font-weight: 700; letter-spacing: -.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
  .pr-sev { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-top: 7px; white-space: nowrap; }
  .pr-sev .d { width: 6px; height: 6px; border-radius: 50%; }
  
  .pr-sev-low { background: var(--sev-low-bg); color: var(--sev-low); } .pr-sev-low .d { background: var(--sev-low); }
  .pr-sev-mid { background: var(--sev-mid-bg); color: var(--sev-mid); } .pr-sev-mid .d { background: var(--sev-mid); }
  .pr-sev-high { background: var(--sev-high-bg); color: var(--sev-high); } .pr-sev-high .d { background: var(--sev-high); }

  .pr-ic-low { background: var(--sev-low-bg); color: var(--sev-low); }
  .pr-ic-mid { background: var(--sev-mid-bg); color: var(--sev-mid); }
  .pr-ic-high { background: var(--sev-high-bg); color: var(--sev-high); }

  .pr-card-actions { position: absolute; top: 16px; right: 16px; display: flex; gap: 6px; opacity: 0; transform: translateY(-4px); transition: .16s; }
  .pr-card:hover .pr-card-actions { opacity: 1; transform: none; }
  .pr-act { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: #fff; display: grid; place-items: center; cursor: pointer; color: var(--ink-2); transition: .14s; }
  .pr-act:hover { background: var(--bg); color: var(--ink); }
  .pr-act.del:hover { background: var(--sev-high-bg); color: var(--sev-high); border-color: #FAD4D1; }

  .pr-card-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line-2); }
  .pr-fine .k { font-size: 11.5px; color: var(--muted); font-weight: 600; margin-bottom: 5px; }
  .pr-fine .v { font-size: 21px; font-weight: 700; letter-spacing: -.3px; }
  .pr-fine .v .cur { font-size: 14px; color: var(--muted); margin-left: 1px; font-family: 'Plus Jakarta Sans', sans-serif; }
  .pr-usage { text-align: right; }
  .pr-usage .k { font-size: 11.5px; color: var(--muted); font-weight: 600; margin-bottom: 5px; white-space: nowrap; }
  .pr-usage .v { font-size: 14px; font-weight: 700; white-space: nowrap; }
  .pr-usage .v b { font-family: 'JetBrains Mono', monospace; color: var(--green-700); font-size: 16px; }
  .pr-usage.zero .v b { color: var(--muted); }

  .pr-empty { text-align: center; padding: 70px 20px; color: var(--muted); animation: pr-stagger 0.4s ease backwards; }
  .pr-empty svg { margin-bottom: 14px; opacity: .4; }
  .pr-empty b { display: block; color: var(--ink-2); font-size: 16px; margin-bottom: 4px; }
  
  .pr-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 20px; color: var(--muted); gap: 16px; }
  .pr-spinner { width: 36px; height: 36px; border: 3px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: pr-spin 0.8s linear infinite; }
  @keyframes pr-spin { to { transform: rotate(360deg); } }

  .pr-form-input { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; font: inherit; transition: .2s; outline: none; background: #fff; }
  .pr-form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }

  @media(max-width: 1180px) { .pr-stats { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width: 560px) { .pr-grid { grid-template-columns: 1fr; } .pr-stats { grid-template-columns: 1fr; } }
`;

function sevOf(f: number) {
  if (f >= 300000) return 'high';
  if (f >= 100000) return 'mid';
  return 'low';
}

const sevLabel = { high: 'Nghiêm trọng', mid: 'Trung bình', low: 'Nhẹ' };

const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

function PenaltyReasonForm({
  saving,
  item,
  onSave,
  onCancel,
  existingReasons,
}: {
  saving: boolean;
  item?: PenaltyReason;
  onSave: (d: Record<string, unknown>) => void;
  onCancel: () => void;
  existingReasons: PenaltyReason[];
}) {
  const [reason, setReason] = useState(item?.reasonText || '');
  const [amount, setAmount] = useState(item?.defaultAmount?.toString() || '');
  
  const isDuplicate =
    reason.trim().length > 0 &&
    existingReasons.some(
      (r) =>
        r.id !== item?.id &&
        r.reasonText.trim().toLowerCase() === reason.trim().toLowerCase()
    );
    
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 4px' }}>
      <FormGroup 
        label="Tên lỗi vi phạm" 
        error={isDuplicate ? 'Lý do này đã tồn tại trong danh mục.' : undefined}
      >
        <input
          className="pr-form-input"
          style={{ borderColor: isDuplicate ? 'var(--danger)' : undefined }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ví dụ: Vượt đèn đỏ, Chạy quá tốc độ..."
          autoFocus
        />
      </FormGroup>
      
      <FormGroup label="Mức phạt mặc định (VNĐ)">
        <input
          className="pr-form-input pr-mono"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </FormGroup>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
        <Btn variant="ghost" onClick={onCancel} disabled={saving}>Hủy</Btn>
        <Btn 
          variant="primary"
          onClick={() => {
            if (!reason.trim() || isDuplicate) return;
            onSave({ reasonText: reason.trim(), defaultAmount: Number(amount) || 0 });
          }}
          disabled={saving || !reason.trim() || isDuplicate}
        >
          {saving ? 'Đang lưu...' : item ? 'Lưu thay đổi' : 'Thêm mới'}
        </Btn>
      </div>
    </div>
  );
}

export default function PenaltyReasonsConfigPage() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSev, setActiveSev] = useState('all');
  const [sortDesc, setSortDesc] = useState(true);

  // Inject styles safely on mount
  useEffect(() => {
    const styleId = 'pr-custom-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = pageStyles;
      document.head.appendChild(style);
    }
  }, []);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['/penalty-reasons'],
    queryFn: async () => {
      const r = await api.get<PaginatedResponse<PenaltyReason>>('/penalty-reasons');
      return r.items;
    },
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['/penalty-reasons/stats'],
    queryFn: async () => {
      return await api.get<{
        totalCount: number;
        totalAmount: number;
        countsByReason: Record<number, number>;
        period: { month: number; year: number };
      }>('/penalty-reasons/stats');
    },
  });

  const crud = useCRUD('/penalty-reasons', async () => {
    await refetch();
    await refetchStats();
  });

  const items = data || [];
  
  const filteredItems = useMemo(() => {
    let list = items.filter(d => {
      const s = sevOf(d.defaultAmount);
      const okSev = activeSev === 'all' || s === activeSev;
      const okQ = d.reasonText.toLowerCase().includes(searchTerm.trim().toLowerCase());
      return okSev && okQ;
    });
    
    list.sort((a, b) => sortDesc ? b.defaultAmount - a.defaultAmount : a.defaultAmount - b.defaultAmount);
    return list;
  }, [items, searchTerm, activeSev, sortDesc]);

  const editingItem = useMemo(() => {
    return items.find(x => x.id === crud.editingId);
  }, [items, crud.editingId]);

  const handleDelete = async (id: number) => {
    const ok = await confirm('Bạn có chắc chắn muốn xóa lỗi vi phạm này?', {
      variant: 'danger',
      confirmLabel: 'Xóa',
    });
    if (ok) {
      await crud.doDelete(id);
      crud.cancelForm();
    }
  };

  const fmt = (n: number) => n.toLocaleString("vi-VN");

  // Calculate Mock/Real stats based on items
  const totalTypes = items.length;
  const totalCount = statsData?.totalCount || 0; 
  const totalAmount = statsData?.totalAmount || 0;
  
  const topReasonId = statsData?.countsByReason 
    ? Object.entries(statsData.countsByReason).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  const topReasonText = topReasonId 
    ? items.find(x => x.id === Number(topReasonId))?.reasonText || '---'
    : '---';
  const topReasonCount = topReasonId 
    ? statsData?.countsByReason[Number(topReasonId)] || 0
    : 0;

  return (
    <div className="pr-wrapper fade-up">
      <div className="pr-pagehead">
        <div className="pr-back" onClick={() => navigate('/config')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </div>
        <div>
          <h1>Danh mục lỗi vi phạm</h1>
          <p>Quản lý các loại lỗi vi phạm của tài xế và quy định mức phạt mặc định để áp dụng nhanh chóng.</p>
        </div>
        <button className="pr-btn-primary" onClick={() => crud.setShowAddForm(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Thêm lỗi mới
        </button>
      </div>

      <div className="pr-stats">
        <div className="pr-stat">
          <div className="pr-lab"><span className="pr-ic pr-ic-low"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span> Tổng loại lỗi</div>
          <div className="pr-val pr-mono">{totalTypes}</div>
          <div className="pr-sub">Đang áp dụng trong hệ thống</div>
        </div>
        <div className="pr-stat">
          <div className="pr-lab"><span className="pr-ic pr-ic-mid"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg></span> Lượt phạt tháng này</div>
          <div className="pr-val pr-mono">{totalCount} <small>lượt</small></div>
          <div className="pr-sub">Chưa có dữ liệu</div>
        </div>
        <div className="pr-stat">
          <div className="pr-lab"><span className="pr-ic" style={{background:'var(--accent-soft)',color:'var(--green-700)'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> Tổng tiền phạt</div>
          <div className="pr-val pr-mono">{fmt(totalAmount)}<span className="pr-cur" style={{fontFamily:"'Plus Jakarta Sans'"}}> đ</span></div>
          <div className="pr-sub">Đã ghi nhận trong tháng hiện tại</div>
        </div>
        <div className="pr-stat">
          <div className="pr-lab"><span className="pr-ic pr-ic-high"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> Phổ biến nhất</div>
          <div className="pr-val" style={{fontSize: topReasonText.length > 15 ? '16px' : '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={topReasonText}>{topReasonText}</div>
          <div className="pr-sub pr-mono" style={{fontFamily: "'JetBrains Mono'"}}>{topReasonCount > 0 ? `${topReasonCount} lượt vi phạm` : 'Chưa có thống kê'}</div>
        </div>
      </div>

      <div className="pr-toolbar">
        <div className="pr-search2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            placeholder="Tìm kiếm lỗi vi phạm…" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="pr-filters">
          <button className={`pr-chip ${activeSev === 'all' ? 'active' : ''}`} onClick={() => setActiveSev('all')}>Tất cả</button>
          <button className={`pr-chip ${activeSev === 'high' ? 'active' : ''}`} onClick={() => setActiveSev('high')}><span className="pr-dot" style={{background:'var(--sev-high)'}}></span>Nghiêm trọng</button>
          <button className={`pr-chip ${activeSev === 'mid' ? 'active' : ''}`} onClick={() => setActiveSev('mid')}><span className="pr-dot" style={{background:'var(--sev-mid)'}}></span>Trung bình</button>
          <button className={`pr-chip ${activeSev === 'low' ? 'active' : ''}`} onClick={() => setActiveSev('low')}><span className="pr-dot" style={{background:'var(--sev-low)'}}></span>Nhẹ</button>
        </div>
        <button className="pr-sortbtn" onClick={() => setSortDesc(!sortDesc)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"/></svg>
          <span>{sortDesc ? 'Mức phạt cao → thấp' : 'Mức phạt thấp → cao'}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="pr-loading">
          <div className="pr-spinner"></div>
          <div>Đang tải dữ liệu...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="pr-empty" style={{ display: 'block' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <b>Không tìm thấy lỗi vi phạm</b>
          <span>Thử từ khóa khác hoặc thay đổi bộ lọc.</span>
        </div>
      ) : (
        <div className="pr-grid">
          {filteredItems.map((d, i) => {
            const s = sevOf(d.defaultAmount);
            const count = statsData?.countsByReason?.[d.id] || 0;
            const zero = count === 0 ? 'zero' : '';
            
            return (
              <div className="pr-card" key={d.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="pr-card-actions">
                  <div className="pr-act" title="Chỉnh sửa" onClick={() => crud.setEditingId(d.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </div>
                  <div className="pr-act del" title="Xóa" onClick={() => handleDelete(d.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </div>
                </div>
                
                <div className="pr-card-top">
                  <div className={`pr-card-ic pr-ic-${s}`}><ShieldIcon /></div>
                  <div className="pr-card-titlewrap">
                    <div className="pr-card-title" title={d.reasonText}>{d.reasonText}</div>
                    <span className={`pr-sev pr-sev-${s}`}><span className="pr-d"></span>{sevLabel[s]}</span>
                  </div>
                </div>
                
                <div className="pr-card-foot">
                  <div className="pr-fine">
                    <div className="pr-k">Mức phạt mặc định</div>
                    <div className="pr-v pr-mono">{fmt(d.defaultAmount)}<span className="pr-cur">đ</span></div>
                  </div>
                  <div className={`pr-usage ${zero}`}>
                    <div className="pr-k">Áp dụng tháng này</div>
                    <div className="pr-v"><b>{count}</b> lượt</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={crud.showAddForm && !crud.editingId}
        title="Thêm lỗi vi phạm mới"
        onClose={crud.cancelForm}
        maxWidth={460}
      >
        <PenaltyReasonForm
          saving={crud.saving}
          onSave={crud.doCreate}
          onCancel={crud.cancelForm}
          existingReasons={items}
        />
      </Modal>

      {editingItem && (
        <Modal
          isOpen={true}
          title="Chỉnh sửa lỗi vi phạm"
          onClose={crud.cancelForm}
          maxWidth={460}
        >
          <PenaltyReasonForm
            item={editingItem}
            saving={crud.saving}
            onSave={(d) => crud.doUpdate(editingItem.id, d)}
            onCancel={crud.cancelForm}
            existingReasons={items}
          />
        </Modal>
      )}

      {dialog}
    </div>
  );
}
