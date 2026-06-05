import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, X, Image as ImageIcon, Plus, Check } from 'lucide-react';
import { api } from '../lib/api';
import { configClient } from '../api/configClient';
import { formatCurrency } from '../lib/format';
import { PageHeader, FormGroup } from '../components/UI';
import { useCatalogs } from '../hooks/useCatalogs';
import { useToast } from '../components/shared/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FINANCIAL, CONFIG } from '@nepocorp/shared';
import { expenseSchema } from '@nepocorp/shared';
import type { ExpenseWithRefs, PaginatedResponse, Supplier, ExpenseCategory } from '@nepocorp/shared';

type FormState = {
  expenseDate: string;
  supplierId: number | '';
  categoryId: number | '';
  truckId: number | '';
  vehicleComponent: 'TRUCK' | 'TRAILER';
  amount: string;
  paymentStatus: 'PAID' | 'UNPAID';
  validFrom: string;
  validTo: string;
  receiptId: string;
  note: string;
};

const initialForm: FormState = {
  expenseDate: new Date().toISOString().slice(0, 10),
  supplierId: '',
  categoryId: '',
  truckId: '',
  vehicleComponent: 'TRUCK' as const,
  amount: '',
  paymentStatus: 'UNPAID',
  validFrom: '',
  validTo: '',
  receiptId: '',
  note: '',
};

export default function ExpenseEntryPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(initialForm);
  const [expenseType, setExpenseType] = useState<'COMPANY' | 'TRUCK' | 'TRAILER'>('COMPANY');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: catalogData } = useCatalogs();
  const trucks = catalogData?.trucks ?? [];
  const trailers = catalogData?.trailers ?? [];

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  // Quick-create supplier
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  // Quick-create category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useQuery({
    queryKey: ['expense-form-catalogs'],
    queryFn: async () => {
      const [suppliers, categories] = await Promise.all([
        configClient.getAllSuppliers(),
        configClient.getAllExpenseCategories(),
      ]);
      setSuppliers(suppliers);
      setCategories(categories);
      setCatalogsLoaded(true);
      return { suppliers, categories };
    },
    enabled: !catalogsLoaded,
    staleTime: 5 * 60 * 1000,
  });

  const { data: existingExpense, isLoading: loadingExpense } = useQuery<ExpenseWithRefs>({
    queryKey: ['expense', id],
    queryFn: () => api.get(`${FINANCIAL.EXPENSE(Number(id))}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingExpense) {
      setForm({
        expenseDate: existingExpense.expenseDate?.slice(0, 10) || '',
        supplierId: existingExpense.supplierId || '',
        categoryId: existingExpense.categoryId || '',
        truckId: existingExpense.truckId || '',
        vehicleComponent: existingExpense.vehicleComponent || 'TRUCK',
        amount: existingExpense.amount || '',
        paymentStatus: (existingExpense.paymentStatus as 'PAID' | 'UNPAID') || 'UNPAID',
        validFrom: existingExpense.validFrom?.slice(0, 10) || '',
        validTo: existingExpense.validTo?.slice(0, 10) || '',
        receiptId: existingExpense.receiptId || '',
        note: existingExpense.note || '',
      });
      setExpenseType(existingExpense.truckId ? (existingExpense.vehicleComponent as 'TRUCK' | 'TRAILER') : 'COMPANY');
    }
  }, [existingExpense]);

  const selectedCategory = useMemo(
    () => categories.find(c => c.id === form.categoryId),
    [categories, form.categoryId],
  );

  const showValidityFields = selectedCategory?.isRenewable === true;

  const set = (field: keyof FormState, value: FormState[keyof FormState]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhotoUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Lỗi tải ảnh lên');
      }
      const result = await response.json();
      setPhotoUrls(prev => [...prev, result.url]);
    } catch {
      toast({ kind: 'error', message: 'Lỗi khi tải ảnh. Vui lòng thử lại.' });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const formatAmountDisplay = (val: string) => {
    if (!val) return '';
    const num = parseFloat(val.replace(/,/g, ''));
    if (isNaN(num)) return val;
    return num.toLocaleString('vi-VN');
  };

  const parseAmountInput = (displayVal: string) => {
    return displayVal.replace(/[^\d]/g, '');
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setCreatingSupplier(true);
    try {
      const created = await api.post<Supplier>(CONFIG.SUPPLIERS, { name: newSupplierName.trim(), status: 'ACTIVE' });
      setSuppliers(prev => [...prev, created]);
      set('supplierId', created.id);
      setShowNewSupplier(false);
      setNewSupplierName('');
      toast({ kind: 'success', message: `Đã tạo nhà cung cấp "${created.name}".` });
    } catch (e: unknown) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Lỗi tạo nhà cung cấp' });
    } finally {
      setCreatingSupplier(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const created = await api.post<ExpenseCategory>(CONFIG.EXPENSE_CATEGORIES, { name: newCategoryName.trim(), isRenewable: false, reminderLeadDays: 30 });
      setCategories(prev => [...prev, created]);
      set('categoryId', created.id);
      setShowNewCategory(false);
      setNewCategoryName('');
      toast({ kind: 'success', message: `Đã tạo hạng mục "${created.name}".` });
    } catch (e: unknown) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Lỗi tạo hạng mục' });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setPageError('');

    const payload: Record<string, unknown> = {
      expenseDate: form.expenseDate,
      supplierId: Number(form.supplierId),
      categoryId: Number(form.categoryId),
      truckId: form.truckId ? Number(form.truckId) : null,
      // Schema rejects explicit `null` for vehicleComponent (enum + default).
      // For company-wide expenses (no truck), omit the field entirely so the
      // default kicks in. Was previously sending null and the page silently
      // failed validation without surfacing an error to the user.
      ...(form.truckId ? { vehicleComponent: form.vehicleComponent } : {}),
      amount: form.amount,
      paymentStatus: form.paymentStatus,
      validFrom: showValidityFields && form.validFrom ? form.validFrom : null,
      validTo: showValidityFields && form.validTo ? form.validTo : null,
      receiptId: form.receiptId || undefined,
      note: form.note || undefined,
    };

    const result = expenseSchema.safeParse(payload);

    if (expenseType !== 'COMPANY' && !form.truckId) {
      setErrors(prev => ({ ...prev, truckId: 'Vui lòng chọn biển số' }));
      setTimeout(() => document.getElementById('truckId')?.focus(), 0);
      return;
    }

    if (!result.success) {
      // Zod's default messages are in English ("Number must be greater than 0"),
      // which looked broken next to the Vietnamese form labels. Translate the
      // common ones and fall back to the field-specific friendly message.
      const FRIENDLY: Record<string, string> = {
        supplierId: 'Vui lòng chọn nhà cung cấp',
        categoryId: 'Vui lòng chọn hạng mục chi phí',
        amount: 'Số tiền phải là số dương',
        expenseDate: 'Vui lòng chọn ngày chi',
        paymentStatus: 'Vui lòng chọn trạng thái thanh toán',
      };
      // Some validation errors don't map to a visible field (e.g.
      // vehicleComponent when no truck is selected). Track which fields
      // are visible on screen so we can promote orphan errors to a page
      // banner instead of silently swallowing them.
      const VISIBLE_FIELDS = new Set([
        'expenseDate', 'supplierId', 'categoryId', 'amount',
        'paymentStatus', 'truckId', 'validFrom', 'validTo',
        'receiptId', 'note',
      ]);
      const fieldErrors: Record<string, string> = {};
      const orphanIssues: string[] = [];
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString();
        if (!field) { orphanIssues.push(issue.message); continue; }
        if (!VISIBLE_FIELDS.has(field)) {
          orphanIssues.push(`${field}: ${issue.message}`);
          continue;
        }
        if (!fieldErrors[field]) {
          fieldErrors[field] = FRIENDLY[field] ?? issue.message;
        }
      }
      setErrors(fieldErrors);
      if (orphanIssues.length > 0) {
        setPageError(orphanIssues.join(' · '));
      }
      const firstErrorField = result.error.issues[0]?.path[0]?.toString();
      if (firstErrorField) {
        setTimeout(() => document.getElementById(firstErrorField)?.focus(), 0);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (showValidityFields && !form.validFrom) {
      setErrors(prev => ({ ...prev, validFrom: 'Trường bắt buộc khi hạng mục có tính gia hạn' }));
      setTimeout(() => document.getElementById('validFrom')?.focus(), 0);
      return;
    }
    if (showValidityFields && !form.validTo) {
      setErrors(prev => ({ ...prev, validTo: 'Trường bắt buộc khi hạng mục có tính gia hạn' }));
      setTimeout(() => document.getElementById('validTo')?.focus(), 0);
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`${FINANCIAL.EXPENSE(Number(id))}`, result.data);
        toast({ kind: 'success', message: 'Đã cập nhật chi phí.' });
      } else {
        await api.post(FINANCIAL.EXPENSES, result.data);
        toast({ kind: 'success', message: 'Đã ghi nhận chi phí.' });
      }
      // Invalidate every cached expenses page so the list refetches with the new row.
      // ExpenseListPage uses queryKey ['expenses', params], so we match the prefix.
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      navigate('/expenses');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi lưu chi phí';
      setPageError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && loadingExpense) {
    return (
      <div className="fade-up" style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
        <Loader2 size={24} className="spin" />
        <p style={{ marginTop: 12 }}>Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="fade-up expense-page-wrap">

      <div className="expense-page-container">
        <PageHeader
          title={isEdit ? 'Sửa chi phí' : 'Ghi nhận chi phí'}
          description={isEdit ? 'Cập nhật thông tin chi phí phát sinh' : 'Nhập thông tin chi phí phát sinh'}
          onBack={() => navigate('/expenses')}
        />

        <form onSubmit={handleSubmit} className="expense-page-form">
          {pageError && (
            <div className="animate-shake expense-page-error">
              <strong>Lỗi:</strong> {pageError}
            </div>
          )}

          <div className="expense-page-layout">
            <div className="expense-layout__main">
              <div className="expense-panel">
                <div className="expense-panel__header">
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>Thông tin chung</h2>
                  <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>{isEdit ? 'Cập nhật' : 'Nhập'} các thông tin cơ bản cho phiếu chi</p>
                </div>

                <div className="expense-panel__body expense-grid">
              <div className="expense-group">
                <label className="expense-label">Ngày chi <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="date"
                  name="expenseDate"
                  id="expenseDate"
                  className="expense-input"
                  value={form.expenseDate}
                  onChange={e => set('expenseDate', e.target.value)}
                />
                {errors.expenseDate && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.expenseDate}</p>}
              </div>

              <div className="expense-group">
                <label className="expense-label">Trạng thái thanh toán <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  name="paymentStatus"
                  id="paymentStatus"
                  className="expense-input"
                  value={form.paymentStatus}
                  onChange={e => set('paymentStatus', e.target.value as 'PAID' | 'UNPAID')}
                >
                  <option value="UNPAID">Ghi nợ</option>
                  <option value="PAID">Trả ngay</option>
                </select>
                {errors.paymentStatus && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.paymentStatus}</p>}
              </div>

              <div className="expense-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="expense-label" style={{ marginBottom: 0 }}>Nhà cung cấp <span style={{ color: 'var(--danger)' }}>*</span></label>
                  {!showNewSupplier && (
                    <button type="button" onClick={() => setShowNewSupplier(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', fontWeight: 600, minHeight: 44, minWidth: 44, borderRadius: 6 }}>
                      <Plus size={14} /> Thêm mới
                    </button>
                  )}
                </div>
                {showNewSupplier ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      name="newSupplierName"
                      id="newSupplierName"
                      className="expense-input"
                      style={{ flex: 1 }}
                      placeholder="Tên nhà cung cấp…"
                      value={newSupplierName}
                      onChange={e => setNewSupplierName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSupplier(); } if (e.key === 'Escape') { setShowNewSupplier(false); setNewSupplierName(''); } }}
                      autoFocus
                    />
                    <button type="button" className="expense-btn-save" style={{ padding: '12px', borderRadius: '12px' }} disabled={creatingSupplier || !newSupplierName.trim()} onClick={handleCreateSupplier}>
                      {creatingSupplier ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} onClick={() => { setShowNewSupplier(false); setNewSupplierName(''); }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <select
                    name="supplierId"
                    id="supplierId"
                    className="expense-input"
                    value={form.supplierId}
                    onChange={e => set('supplierId', e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Chọn nhà cung cấp…</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
                {errors.supplierId && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.supplierId}</p>}
              </div>

              <div className="expense-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="expense-label" style={{ marginBottom: 0 }}>Hạng mục <span style={{ color: 'var(--danger)' }}>*</span></label>
                  {!showNewCategory && (
                    <button type="button" onClick={() => setShowNewCategory(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', fontWeight: 600, minHeight: 44, minWidth: 44, borderRadius: 6 }}>
                      <Plus size={14} /> Thêm mới
                    </button>
                  )}
                </div>
                {showNewCategory ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      name="newCategoryName"
                      id="newCategoryName"
                      className="expense-input"
                      style={{ flex: 1 }}
                      placeholder="Tên hạng mục…"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } if (e.key === 'Escape') { setShowNewCategory(false); setNewCategoryName(''); } }}
                      autoFocus
                    />
                    <button type="button" className="expense-btn-save" style={{ padding: '12px', borderRadius: '12px' }} disabled={creatingCategory || !newCategoryName.trim()} onClick={handleCreateCategory}>
                      {creatingCategory ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <select
                    name="categoryId"
                    id="categoryId"
                    className="expense-input"
                    value={form.categoryId}
                    onChange={e => set('categoryId', e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Chọn hạng mục…</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                {errors.categoryId && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.categoryId}</p>}
              </div>

              <div className="expense-group">
                <label className="expense-label">Loại chi phí</label>
                <select
                  className="expense-input"
                  value={expenseType}
                  onChange={e => {
                    const val = e.target.value as 'COMPANY' | 'TRUCK' | 'TRAILER';
                    setExpenseType(val);
                    if (val === 'COMPANY') {
                      set('truckId', '');
                    } else {
                      set('vehicleComponent', val);
                      set('truckId', ''); 
                    }
                  }}
                >
                  <option value="COMPANY">Chi phí công ty</option>
                  <option value="TRUCK">Xe (Đầu kéo)</option>
                  <option value="TRAILER">Rơ-moóc</option>
                </select>
              </div>

              {expenseType === 'TRUCK' && (
                <div className="expense-group">
                  <label className="expense-label">Biển số xe <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    name="truckId"
                    id="truckId"
                    className="expense-input"
                    value={form.truckId}
                    onChange={e => set('truckId', e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Chọn xe…</option>
                    {trucks.map(t => (
                      <option key={t.id} value={t.id}>{t.licensePlate}</option>
                    ))}
                  </select>
                  {errors.truckId && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.truckId}</p>}
                </div>
              )}

              {expenseType === 'TRAILER' && (
                <div className="expense-group">
                  <label className="expense-label">Biển số rơ-moóc <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    name="truckId"
                    id="truckId"
                    className="expense-input"
                    value={form.truckId}
                    onChange={e => set('truckId', e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Chọn rơ-moóc…</option>
                    {trailers
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.licensePlate}</option>
                      ))}
                  </select>
                  {errors.truckId && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.truckId}</p>}
                </div>
              )}

              <div className="expense-group">
                <label className="expense-label">Số tiền (đ) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="amount"
                    id="amount"
                    inputMode="numeric"
                    className="expense-input"
                    value={form.amount ? formatAmountDisplay(form.amount) : ''}
                    onChange={e => set('amount', parseAmountInput(e.target.value))}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--accent-2)' }}
                  />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none', fontWeight: 500 }}>
                    đ
                  </span>
                </div>
                {errors.amount && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.amount}</p>}
              </div>

              {showValidityFields && (
                <>
                  <div className="expense-group">
                    <label className="expense-label">Hiệu lực từ <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="date"
                      name="validFrom"
                      id="validFrom"
                      className="expense-input"
                      value={form.validFrom}
                      onChange={e => set('validFrom', e.target.value)}
                    />
                    {errors.validFrom && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.validFrom}</p>}
                  </div>
                  <div className="expense-group">
                    <label className="expense-label">Hiệu lực đến <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      type="date"
                      name="validTo"
                      id="validTo"
                      className="expense-input"
                      value={form.validTo}
                      onChange={e => set('validTo', e.target.value)}
                    />
                    {errors.validTo && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{errors.validTo}</p>}
                  </div>
                </>
              )}

              <div className="expense-group">
                <label className="expense-label">Mã biên lai</label>
                <input
                  type="text"
                  name="receiptId"
                  id="receiptId"
                  className="expense-input"
                  value={form.receiptId}
                  onChange={e => set('receiptId', e.target.value)}
                  placeholder="Nhập mã biên lai…"
                />
              </div>

              <div className="expense-group" style={{ gridColumn: '1 / -1' }}>
                <label className="expense-label">Ghi chú</label>
                <input
                  type="text"
                  name="note"
                  id="note"
                  className="expense-input"
                  value={form.note}
                  onChange={e => set('note', e.target.value)}
                  placeholder="Ghi chú thêm…"
                />
              </div>
                </div>
              </div>
            </div>

            <div className="expense-layout__aside">
              <div className="expense-panel expense-panel--photo">
                <div className="expense-panel__header">
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Ảnh hóa đơn</h3>
                  <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>Đính kèm biên lai / chứng từ nếu có</p>
                </div>
                <div className="expense-panel__body expense-photo-body">
                  {photoUrls.length > 0 && (
                    <div className="expense-photo-grid">
                      {photoUrls.map((url, idx) => (
                        <div key={idx} className="expense-photo-thumb">
                          <img src={url} alt={`Ảnh ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="expense-photo-remove"
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(227,36,52,0.9)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.transform = 'scale(1)'; }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="expense-upload-zone" style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.7 : 1 }}>
                    {uploading ? (
                      <><Loader2 size={28} className="spin" style={{ color: 'var(--accent)' }} /> <span style={{ fontSize: 14, marginTop: 8 }}>Đang tải ảnh lên…</span></>
                    ) : (
                      <>
                        <Upload size={28} style={{ color: 'var(--accent)', marginBottom: 6 }} />
                        <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>Nhấn để tải lên ảnh hóa đơn</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>JPG, PNG · tối đa 5MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => e.target.files && handlePhotoUpload(e.target.files)}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              <div className="expense-actions">
                <button
                  type="button"
                  className="btn btn--secondary expense-btn-cancel"
                  onClick={() => navigate('/expenses')}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="expense-btn-save expense-btn-submit"
                  disabled={submitting || uploading}
                >
                  {submitting ? (
                    <><Loader2 size={18} className="spin" /> Đang lưu…</>
                  ) : isEdit ? (
                    <><Check size={18} /> Cập nhật</>
                  ) : (
                    <><Plus size={18} /> Tạo phiếu chi</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
