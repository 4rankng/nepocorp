import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { PageHeader, FormGroup } from '../components/UI';
import { useCatalogs } from '../hooks/useCatalogs';
import { useToast } from '../components/shared/Toast';
import { useQuery } from '@tanstack/react-query';
import { FINANCIAL, CONFIG } from '@nepocorp/shared';
import { expenseSchema } from '@nepocorp/shared';
import type { ExpenseWithRefs, PaginatedResponse, Supplier, ExpenseCategory } from '@nepocorp/shared';

type FormState = {
  expenseDate: string;
  supplierId: number | '';
  categoryId: number | '';
  truckId: number | '';
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

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: catalogData } = useCatalogs();
  const trucks = catalogData?.trucks ?? [];

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  useQuery({
    queryKey: ['expense-form-catalogs'],
    queryFn: async () => {
      const [supRes, catRes] = await Promise.all([
        api.get<PaginatedResponse<Supplier>>(CONFIG.SUPPLIERS),
        api.get<PaginatedResponse<ExpenseCategory>>(CONFIG.EXPENSE_CATEGORIES),
      ]);
      setSuppliers(supRes.items);
      setCategories(catRes.items);
      setCatalogsLoaded(true);
      return { suppliers: supRes.items, categories: catRes.items };
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
        amount: existingExpense.amount || '',
        paymentStatus: (existingExpense.paymentStatus as 'PAID' | 'UNPAID') || 'UNPAID',
        validFrom: existingExpense.validFrom?.slice(0, 10) || '',
        validTo: existingExpense.validTo?.slice(0, 10) || '',
        receiptId: existingExpense.receiptId || '',
        note: existingExpense.note || '',
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setPageError('');

    const payload = {
      expenseDate: form.expenseDate,
      supplierId: Number(form.supplierId),
      categoryId: Number(form.categoryId),
      truckId: form.truckId ? Number(form.truckId) : null,
      amount: form.amount,
      paymentStatus: form.paymentStatus,
      validFrom: showValidityFields && form.validFrom ? form.validFrom : null,
      validTo: showValidityFields && form.validTo ? form.validTo : null,
      receiptId: form.receiptId || undefined,
      note: form.note || undefined,
    };

    const result = expenseSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    if (showValidityFields && !form.validFrom) {
      setErrors(prev => ({ ...prev, validFrom: 'Trường bắt buộc khi hạng mục có tính gia hạn' }));
      return;
    }
    if (showValidityFields && !form.validTo) {
      setErrors(prev => ({ ...prev, validTo: 'Trường bắt buộc khi hạng mục có tính gia hạn' }));
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`${FINANCIAL.EXPENSE(Number(id))}`, result.data);
        toast({ kind: 'success', message: 'Đã cập nhật phiếu chi phí.' });
      } else {
        await api.post(FINANCIAL.EXPENSES, result.data);
        toast({ kind: 'success', message: 'Đã tạo phiếu chi phí.' });
      }
      navigate('/expenses');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi lưu phiếu chi phí';
      setPageError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && loadingExpense) {
    return (
      <div className="fade-up" style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)' }}>
        <Loader2 size={24} className="spin" />
        <p style={{ marginTop: 12 }}>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 0.8s linear infinite; }`}</style>

      <PageHeader
        title={isEdit ? 'Sửa phiếu chi phí' : 'Tạo phiếu chi phí'}
        description={isEdit ? `Phiếu #${id}` : 'Nhập thông tin phiếu chi phí mới'}
        onBack={() => navigate('/expenses')}
      />

      <form onSubmit={handleSubmit}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, padding: '0 16px 32px' }}>
          {pageError && (
            <div className="panel" style={{ padding: 16, color: 'var(--danger)' }}>
              {pageError}
            </div>
          )}

          <div className="panel">
            <div className="panel__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormGroup label="Ngày chi *" error={errors.expenseDate}>
                <input
                  type="date"
                  className="input"
                  value={form.expenseDate}
                  onChange={e => set('expenseDate', e.target.value)}
                />
              </FormGroup>

              <FormGroup label="Trạng thái thanh toán *" error={errors.paymentStatus}>
                <select
                  className="input"
                  value={form.paymentStatus}
                  onChange={e => set('paymentStatus', e.target.value as 'PAID' | 'UNPAID')}
                >
                  <option value="UNPAID">Ghi nợ</option>
                  <option value="PAID">Trả ngay</option>
                </select>
              </FormGroup>

              <FormGroup label="Nhà cung cấp *" error={errors.supplierId}>
                <select
                  className="input"
                  value={form.supplierId}
                  onChange={e => set('supplierId', e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Chọn nhà cung cấp...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Hạng mục *" error={errors.categoryId}>
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={e => set('categoryId', e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Chọn hạng mục...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup
                label="Xe"
                helpText="Để trống nếu là chi phí công ty"
                error={errors.truckId}
              >
                <select
                  className="input"
                  value={form.truckId}
                  onChange={e => set('truckId', e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Chi phí công ty</option>
                  {trucks.map(t => (
                    t.trailerPlateNumber ? (
                      <optgroup key={t.id} label={t.licensePlate}>
                        <option value={t.id}>{t.licensePlate} (đầu kéo)</option>
                        <option value={t.id}>{t.trailerPlateNumber} (rơ-mooc)</option>
                      </optgroup>
                    ) : (
                      <option key={t.id} value={t.id}>{t.licensePlate}</option>
                    )
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Số tiền (VNĐ) *" error={errors.amount}>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input"
                  value={form.amount ? formatAmountDisplay(form.amount) : ''}
                  onChange={e => set('amount', parseAmountInput(e.target.value))}
                  placeholder="0"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormGroup>

              {showValidityFields && (
                <>
                  <FormGroup label="Hiệu lực từ *" error={errors.validFrom}>
                    <input
                      type="date"
                      className="input"
                      value={form.validFrom}
                      onChange={e => set('validFrom', e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup label="Hiệu lực đến *" error={errors.validTo}>
                    <input
                      type="date"
                      className="input"
                      value={form.validTo}
                      onChange={e => set('validTo', e.target.value)}
                    />
                  </FormGroup>
                </>
              )}

              <FormGroup label="Mã biên lai" error={errors.receiptId}>
                <input
                  type="text"
                  className="input"
                  value={form.receiptId}
                  onChange={e => set('receiptId', e.target.value)}
                  placeholder="Nhập mã biên lai..."
                />
              </FormGroup>

              <FormGroup label="Ghi chú" error={errors.note}>
                <input
                  type="text"
                  className="input"
                  value={form.note}
                  onChange={e => set('note', e.target.value)}
                  placeholder="Ghi chú thêm..."
                />
              </FormGroup>
            </div>
          </div>

          {/* Photo upload */}
          <div className="panel">
            <div className="panel__head">
              <h3 className="panel__title">Ảnh hóa đơn</h3>
            </div>
            <div className="panel__body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative', width: 72, height: 72, borderRadius: 8,
                      border: '1px solid var(--line)', overflow: 'hidden',
                    }}
                  >
                    <img src={url} alt={`Ảnh ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      style={{
                        position: 'absolute', top: 2, right: 2, width: 20, height: 20,
                        borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 10,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>

              <label
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 48, border: '1px dashed var(--fg-3)', borderRadius: 8,
                  background: 'var(--surface-2)', cursor: uploading ? 'wait' : 'pointer',
                  color: 'var(--fg-2)', fontSize: 12,
                }}
              >
                {uploading ? (
                  <><Loader2 size={14} className="spin" style={{ marginRight: 6 }} /> Đang tải...</>
                ) : (
                  <><Upload size={14} style={{ marginRight: 6 }} /> Thêm ảnh hóa đơn</>
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

          {/* Submit actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigate('/expenses')}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || uploading}
            >
              {submitting ? (
                <><Loader2 size={14} className="spin" /> Đang lưu...</>
              ) : isEdit ? (
                'Cập nhật'
              ) : (
                'Tạo phiếu chi'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
