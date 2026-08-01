import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { usePageAnimations } from '../../hooks/animations';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';
import type { ExpenseCategory } from '@tingting/shared';
import './expense-categories.css';

function ExpenseCategoryForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: ExpenseCategory; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [isRenewable, setIsRenewable] = useState(item?.isRenewable ?? false);
  const [reminderLeadDays, setReminderLeadDays] = useState(item?.reminderLeadDays ?? 7);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');

  return (
    <InlineForm colSpan={5}>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tên hạng mục">
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Bảo hiểm, Đăng kiểm…" />
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 100, display: 'flex', alignItems: 'flex-end', paddingBottom: 18 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={isRenewable} onChange={e => setIsRenewable(e.target.checked)} />
          Định kỳ
        </label>
      </div>
      {isRenewable && (
        <div style={{ flex: 1, minWidth: 100 }}>
          <Field label="Nhắc trước (ngày)">
            <input className="input" type="number" min={0} value={reminderLeadDays} onChange={e => setReminderLeadDays(Number(e.target.value))} />
          </Field>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Trạng thái">
          <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng</option>
          </select>
        </Field>
      </div>
      <FormActions
        saving={saving}
        isedit={!!item}
        oncancel={oncancel}
        onsave={() => {
          if (!name.trim()) return;
          onsave({
            name: name.trim(),
            isRenewable,
            reminderLeadDays: isRenewable ? reminderLeadDays : null,
            status,
          });
        }}
      />
    </InlineForm>
  );
}

export default function ExpenseCategoriesConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.cfg-row'] });
  return (
    <div ref={pageRef}>
    <CrudTable<ExpenseCategory>
      title="Hạng mục chi phí"
      description="Phân loại chi phí và thiết lập lịch nhắc gia hạn"
      endpoint="/expense-categories"
      pageSlug="expense-categories"
      iconName="expense-category"
      createActionPlacement="header"
      emptyIllustration="empty-expenses.svg"
      emptyTitle="Chưa có hạng mục"
      emptyHint="Thêm hạng mục để phân loại chi phí khi ghi nhận."
      compactItemAriaLabel={(cat) => (
        `Chỉnh sửa ${cat.name}, ${cat.isRenewable ? `định kỳ, nhắc trước ${cat.reminderLeadDays} ngày` : 'một lần'}, ${cat.status === 'ACTIVE' ? 'hoạt động' : 'ngừng'}`
      )}
      renderCompactItem={(cat) => (
        <>
          <span className={`expense-category-row__strip${cat.status === 'ACTIVE' ? '' : ' is-inactive'}`} aria-hidden="true" />
          <div className="expense-category-row__details">
            <strong className="expense-category-row__name">{cat.name}</strong>
            <span className="expense-category-row__meta">
              {cat.isRenewable
                ? <>Định kỳ <span aria-hidden="true">·</span> Nhắc trước {cat.reminderLeadDays} ngày</>
                : <>Một lần <span aria-hidden="true">·</span> Không nhắc</>}
            </span>
          </div>
          <span className={`expense-category-row__state${cat.status === 'ACTIVE' ? '' : ' is-inactive'}`}>
            <span className="expense-category-row__state-dot" aria-hidden="true" />
            <span>{cat.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        </>
      )}
      renderForm={(p) => (
        <ExpenseCategoryForm
          saving={p.saving}
          item={p.item}
          onsave={p.onSave}
          oncancel={p.onCancel}
        />
      )}
    />
    </div>
  );
}
