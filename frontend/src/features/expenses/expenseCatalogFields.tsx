import { Check, Loader2, Plus, X } from 'lucide-react';
import type { ExpenseCategory, Supplier } from '@tingting/shared';

/**
 * Supplier / category pickers of the expense entry form, each with an inline
 * "Thêm mới" quick-create row. Presentational only: the page owns the form
 * value, the quick-create state and the create/select handlers, so both fields
 * stay a single source of truth for the entry form.
 */

interface SupplierFieldProps {
  supplierId: number | '';
  error?: string;
  suppliers: Supplier[];
  loading: boolean;
  showNew: boolean;
  newName: string;
  creating: boolean;
  onStartNew: () => void;
  onNewNameChange: (name: string) => void;
  onCancelNew: () => void;
  onCreate: () => void;
  onSelect: (id: number | '') => void;
}

export function ExpenseSupplierField({ supplierId, error, suppliers, loading, showNew, newName, creating, onStartNew, onNewNameChange, onCancelNew, onCreate, onSelect }: SupplierFieldProps) {
  return <>
              <div className="expense-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label htmlFor={showNew ? 'newSupplierName' : 'supplierId'} className="expense-label" style={{ marginBottom: 0 }}>Nhà cung cấp <span style={{ color: 'var(--danger)' }}>*</span></label>
                  {!showNew && (
                    <button type="button" onClick={onStartNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-control)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', fontWeight: 600, minHeight: 44, minWidth: 44, borderRadius: 6 }}>
                      <Plus size={14} /> Thêm mới
                    </button>
                  )}
                </div>
                {showNew ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      name="newSupplierName"
                      id="newSupplierName"
                      className={`expense-input${error ? ' expense-input--error' : ''}`}
                      style={{ flex: 1 }}
                      placeholder="Tên nhà cung cấp…"
                      value={newName}
                      onChange={e => onNewNameChange(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onCreate(); } if (e.key === 'Escape') { onCancelNew(); } }}
                      autoFocus
                    />
                    <button type="button" aria-label="Lưu nhà cung cấp mới" className="btn btn--primary" style={{ padding: '12px', borderRadius: '12px' }} disabled={creating || !newName.trim()} onClick={onCreate}>
                      {creating ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    </button>
                    <button type="button" aria-label="Hủy thêm nhà cung cấp" className="btn btn--ghost btn--sm" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} onClick={onCancelNew}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <select
                    name="supplierId"
                    id="supplierId"
                    className={`expense-input${error ? ' expense-input--error' : ''}`}
                    value={supplierId}
                    disabled={loading}
                    onChange={e => onSelect(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">
                      {loading ? 'Đang tải nhà cung cấp…' : 'Chọn nhà cung cấp…'}
                    </option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
                {error && <p style={{ fontSize: 'var(--fs-body)', color: 'var(--danger)', marginTop: 4 }}>{error}</p>}
              </div>
  </>;
}

interface CategoryFieldProps {
  categoryId: number | '';
  error?: string;
  categories: ExpenseCategory[];
  loading: boolean;
  showNew: boolean;
  newName: string;
  creating: boolean;
  onStartNew: () => void;
  onNewNameChange: (name: string) => void;
  onCancelNew: () => void;
  onCreate: () => void;
  onSelect: (id: number | '') => void;
}

export function ExpenseCategoryField({ categoryId, error, categories, loading, showNew, newName, creating, onStartNew, onNewNameChange, onCancelNew, onCreate, onSelect }: CategoryFieldProps) {
  return <>
              <div className="expense-group" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label htmlFor={showNew ? 'newCategoryName' : 'categoryId'} className="expense-label" style={{ marginBottom: 0 }}>Hạng mục <span style={{ color: 'var(--danger)' }}>*</span></label>
                  {!showNew && (
                    <button type="button" onClick={onStartNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-control)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', fontWeight: 600, minHeight: 44, minWidth: 44, borderRadius: 6 }}>
                      <Plus size={14} /> Thêm mới
                    </button>
                  )}
                </div>
                {showNew ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      name="newCategoryName"
                      id="newCategoryName"
                      className={`expense-input${error ? ' expense-input--error' : ''}`}
                      style={{ flex: 1 }}
                      placeholder="Tên hạng mục…"
                      value={newName}
                      onChange={e => onNewNameChange(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onCreate(); } if (e.key === 'Escape') { onCancelNew(); } }}
                      autoFocus
                    />
                    <button type="button" aria-label="Lưu hạng mục mới" className="btn btn--primary" style={{ padding: '12px', borderRadius: '12px' }} disabled={creating || !newName.trim()} onClick={onCreate}>
                      {creating ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    </button>
                    <button type="button" aria-label="Hủy thêm hạng mục" className="btn btn--ghost btn--sm" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} onClick={onCancelNew}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <select
                    name="categoryId"
                    id="categoryId"
                    className={`expense-input${error ? ' expense-input--error' : ''}`}
                    value={categoryId}
                    disabled={loading}
                    onChange={e => onSelect(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">
                      {loading ? 'Đang tải hạng mục…' : 'Chọn hạng mục…'}
                    </option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                {error && <p style={{ fontSize: 'var(--fs-body)', color: 'var(--danger)', marginTop: 4 }}>{error}</p>}
              </div>
  </>;
}
