import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { configClient } from '../api/configClient';
import { PageHeader, useConfirm } from '../components/UI';
import { useCatalogs } from '../hooks/useCatalogs';
import { useBackShortcut } from '../hooks/useBackShortcut';
import { useDirtyGuard } from '../hooks/useDirtyGuard';
import { useToast } from '../components/shared/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePageAnimations } from '../hooks/animations';
import { FINANCIAL, CONFIG } from '@tingting/shared';
import { expenseSchema } from '@tingting/shared';
import type { ExpenseWithRefs, Supplier, ExpenseCategory } from '@tingting/shared';
import { qk } from '../api/keys';
import { resolveExpenseCatalogs } from '../features/expenses/expenseCatalogs';
import type { ExpenseCatalogs } from '../features/expenses/expenseCatalogs';
import { ExpenseSupplierField, ExpenseCategoryField } from '../features/expenses/expenseCatalogFields';
import { ExpenseDetailFields } from '../features/expenses/expenseDetailFields';
import { EXPENSE_PHOTO_MAX_BYTES, convertHeicToJpeg, initialForm, type FormState } from './expense-entry-utils';
import { ExpenseBasicFields, ExpenseLoading, ExpensePhotoAside } from './expense-entry-sections';
import './ExpenseEntryPage.css';

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
  const [photos, setPhotos] = useState<{ id: number; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  // True once an edit-mode expense has been hydrated into the form (see effect
  // below) — the "ready" baseline for the discard-dirty guard so the
  // server-populate pass isn't mistaken for a user edit.
  const [hydrated, setHydrated] = useState(!isEdit);

  const { data: catalogData } = useCatalogs();
  const trucks = catalogData?.trucks ?? [];
  const trailers = catalogData?.trailers ?? [];

  // Quick-create supplier
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  // Quick-create category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const { data: expenseCatalogs, isLoading: loadingExpenseCatalogs, error: expenseCatalogError, refetch: refetchExpenseCatalogs } = useQuery({
    queryKey: qk.tripForm.expenseFormCatalogs,
    queryFn: async (): Promise<ExpenseCatalogs> => {
      const [suppliers, categories] = await Promise.all([
        configClient.getAllSuppliers(),
        configClient.getAllExpenseCategories(),
      ]);
      return { suppliers, categories };
    },
    staleTime: 60 * 1000,
  });
  const { suppliers, categories } = resolveExpenseCatalogs(expenseCatalogs);

  const { data: existingExpense, isLoading: loadingExpense, error: expenseError, refetch: refetchExpense } = useQuery<ExpenseWithRefs>({
    queryKey: qk.tripForm.expense(id!),
    queryFn: () => api.get(`${FINANCIAL.EXPENSE(Number(id))}`),
    enabled: isEdit,
  });

  const { rootRef } = usePageAnimations({ ready: !loadingExpense });

  const { confirm, dialog } = useConfirm();
  const guard = useDirtyGuard([form], hydrated);
  const handleBack = () => navigate('/expenses');
  useBackShortcut(handleBack, {
    isDirty: guard.isDirty,
    confirmDiscard: () => confirm('Thoát mà không lưu? Các thay đổi chưa lưu sẽ bị mất.', { variant: 'warning', confirmLabel: 'Thoát' }),
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
      setHydrated(true);
    }
  }, [existingExpense]);

  // B1: load persisted receipt photos when editing (photos attach to the saved row).
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    api.get<{ items: Array<{ id: number; storageKey: string }> }>(`/expenses/${id}/photos`)
      .then(res => {
        if (cancelled) return;
        setPhotos(res.items.map(p => ({ id: p.id, url: `/api/photos/${encodeURIComponent(p.storageKey)}` })));
      })
      .catch(() => { /* leave photos empty on error */ });
    return () => { cancelled = true; };
  }, [isEdit, id]);

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
    if (!id) return; // edit-mode only — photos attach to a saved expense (B1)
    let file = files[0];

    // D1b: client-side size guard — matches the raised 15 MB backend limit so
    // the user gets a clear message instead of a opaque multer failure.
    if (file.size > EXPENSE_PHOTO_MAX_BYTES) {
      toast({ kind: 'error', message: 'Ảnh quá lớn (>15 MB). Vui lòng giảm dung lượng rồi tải lại.' });
      return;
    }

    // D1b: convert HEIC (iPhone) → JPEG on the client; the server has no HEIC codec.
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);
    if (isHeic) {
      try {
        file = await convertHeicToJpeg(file);
      } catch (err) {
        console.warn('HEIC→JPEG conversion failed:', err instanceof Error ? err.message : err);
        toast({ kind: 'error', message: 'Không hỗ trợ ảnh HEIC trên trình duyệt này. Vui lòng đổi sang JPG/PNG.' });
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const result = await api.upload(`/expenses/${id}/photos`, formData) as { id: number; url: string };
      setPhotos(prev => [...prev, result]);
    } catch {
      toast({ kind: 'error', message: 'Lỗi khi tải ảnh. Vui lòng thử lại.' });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (index: number) => {
    const photo = photos[index];
    if (!photo || !id) return;
    try {
      await api.delete(`/expenses/${id}/photos/${photo.id}`);
      // Filter by id, not the captured index: if two deletes are in flight the
      // second's stale index would otherwise drop the wrong thumbnail.
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch {
      toast({ kind: 'error', message: 'Không xóa được ảnh.' });
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setCreatingSupplier(true);
    try {
      const created = await api.post<Supplier>(CONFIG.SUPPLIERS, { name: newSupplierName.trim(), status: 'ACTIVE' });
      queryClient.setQueryData<ExpenseCatalogs>(
        qk.tripForm.expenseFormCatalogs,
        old => ({
          suppliers: old?.suppliers.some(s => s.id === created.id)
            ? old.suppliers
            : [...(old?.suppliers ?? []), created],
          categories: old?.categories ?? categories,
        }),
      );
      set('supplierId', created.id);
      await queryClient.invalidateQueries({ queryKey: qk.tripForm.expenseFormCatalogs });
      await queryClient.invalidateQueries({ queryKey: qk.catalogs.allSuppliers });
      await queryClient.invalidateQueries({ queryKey: qk.catalogs.all });
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
      queryClient.setQueryData<ExpenseCatalogs>(
        qk.tripForm.expenseFormCatalogs,
        old => ({
          suppliers: old?.suppliers ?? suppliers,
          categories: old?.categories.some(c => c.id === created.id)
            ? old.categories
            : [...(old?.categories ?? []), created],
        }),
      );
      set('categoryId', created.id);
      await queryClient.invalidateQueries({ queryKey: qk.tripForm.expenseFormCatalogs });
      await queryClient.invalidateQueries({ queryKey: qk.catalogs.allExpenseCategories });
      await queryClient.invalidateQueries({ queryKey: qk.catalogs.all });
      setShowNewCategory(false);
      setNewCategoryName('');
      toast({ kind: 'success', message: `Đã tạo hạng mục "${created.name}".` });
    } catch (e: unknown) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Lỗi tạo hạng mục' });
    } finally {
      setCreatingCategory(false);
    }
  };

  // Switching the target vehicle clears any previously picked plate so the
  // vehicle selector can never show a truck while TRAILER is selected (and
  // vice versa); company-wide expenses carry no vehicle at all.
  const handleExpenseTypeChange = (val: 'COMPANY' | 'TRUCK' | 'TRAILER') => {
    setExpenseType(val);
    if (val === 'COMPANY') {
      set('truckId', '');
    } else {
      set('vehicleComponent', val);
      set('truckId', '');
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
        expenseDate: 'Vui lòng chọn ngày phát sinh chi phí',
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
        // Document scroll is locked (base.css) — the pageError banner sits at
        // the top of the shell scroller, not the window.
        document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
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
      // qk.financial.expenses(filters) is a per-filter key; there is no broad
      // expensesAll prefix in the factory, so we match the raw prefix here.
      // eslint-disable-next-line @tingting/no-bare-query-key
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
    return <ExpenseLoading />;
  }

  if (expenseError || expenseCatalogError) {
    return (
      <div className="expense-page-wrap">
        <PageHeader title={isEdit ? 'Sửa chi phí' : 'Ghi nhận chi phí'} onBack={handleBack} iconName="expense" />
        <div className="empty-state" role="alert">
          <h3 className="empty-state-title">{expenseError ? 'Không thể tải chi phí' : 'Không thể tải danh mục chi phí'}</h3>
          <p className="empty-state-desc">Vui lòng tải lại dữ liệu trước khi tiếp tục nhập chi phí.</p>
          <button type="button" className="btn btn--secondary" onClick={() => { if (isEdit) void refetchExpense(); void refetchExpenseCatalogs(); }}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="expense-page-wrap">
      {dialog}

      <div className="expense-page-container">
        <PageHeader
          title={isEdit ? 'Sửa chi phí' : 'Ghi nhận chi phí'}
          iconName="expense"
          description={isEdit ? 'Cập nhật thông tin chi phí phát sinh' : 'Nhập thông tin chi phí phát sinh'}
          onBack={handleBack}
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
                  <h2 style={{ fontSize: 'var(--fs-section)', fontWeight: 700, color: 'var(--ink)' }}>Thông tin chung</h2>
                  <p style={{ fontSize: 'var(--fs-body)', color: 'var(--ink-3)', marginTop: 4 }}>{isEdit ? 'Cập nhật' : 'Nhập'} các thông tin cơ bản cho phiếu chi</p>
                </div>

                <div className="expense-panel__body expense-grid">
              <ExpenseBasicFields form={form} errors={errors} isEdit={isEdit} existingExpense={existingExpense} set={set} />

              <ExpenseSupplierField
                supplierId={form.supplierId}
                error={errors.supplierId}
                suppliers={suppliers}
                loading={loadingExpenseCatalogs}
                showNew={showNewSupplier}
                newName={newSupplierName}
                creating={creatingSupplier}
                onStartNew={() => setShowNewSupplier(true)}
                onNewNameChange={setNewSupplierName}
                onCancelNew={() => { setShowNewSupplier(false); setNewSupplierName(''); }}
                onCreate={handleCreateSupplier}
                onSelect={v => set('supplierId', v)}
              />

              <ExpenseCategoryField
                categoryId={form.categoryId}
                error={errors.categoryId}
                categories={categories}
                loading={loadingExpenseCatalogs}
                showNew={showNewCategory}
                newName={newCategoryName}
                creating={creatingCategory}
                onStartNew={() => setShowNewCategory(true)}
                onNewNameChange={setNewCategoryName}
                onCancelNew={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                onCreate={handleCreateCategory}
                onSelect={v => set('categoryId', v)}
              />

              <ExpenseDetailFields
                expenseType={expenseType}
                onExpenseTypeChange={handleExpenseTypeChange}
                truckId={form.truckId}
                onTruckIdChange={v => set('truckId', v)}
                trucks={trucks}
                trailers={trailers}
                amount={form.amount}
                onAmountChange={v => set('amount', v)}
                showValidityFields={showValidityFields}
                validFrom={form.validFrom}
                onValidFromChange={v => set('validFrom', v)}
                validTo={form.validTo}
                onValidToChange={v => set('validTo', v)}
                receiptId={form.receiptId}
                onReceiptIdChange={v => set('receiptId', v)}
                note={form.note}
                onNoteChange={v => set('note', v)}
                errors={errors}
              />
                </div>
              </div>
            </div>

            <ExpensePhotoAside photos={photos} uploading={uploading} isEdit={isEdit} submitting={submitting} handleBack={handleBack} removePhoto={removePhoto} handlePhotoUpload={handlePhotoUpload} />
          </div>
        </form>
      </div>
    </div>
  );
}
