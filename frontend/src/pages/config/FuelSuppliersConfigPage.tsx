import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { usePageAnimations } from '../../hooks/animations';
import { InlineForm } from '../../components/config/InlineForm';
import { FormActions } from '../../components/config/FormActions';
import { Field } from '../../components/config/Field';
import { CrudTable } from '../../components/config/CrudTable';
import { configClient } from '../../api/configClient';
import type { Supplier } from '@tingting/shared';
import './expense-categories.css';

function FuelSupplierForm({ saving, item, onsave, oncancel }: {
  saving: boolean;
  item?: Supplier;
  onsave: (data: Record<string, unknown>) => void;
  oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [contactPerson, setContactPerson] = useState(item?.contactPerson ?? '');
  const [phone, setPhone] = useState(item?.phone ?? '');
  const [status, setStatus] = useState(item?.status ?? 'ACTIVE');

  return (
    <InlineForm colSpan={4}>
      <div style={{ flex: 2, minWidth: 180 }}>
        <Field label="Tên cây dầu / nhà cung cấp" htmlFor="fuel-supplier-name">
          <input id="fuel-supplier-name" className="input" value={name} onChange={event => setName(event.target.value)} placeholder="VD: Petro, Long Hưng" autoFocus />
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 150 }}>
        <Field label="Người liên hệ" htmlFor="fuel-supplier-contact-person">
          <input id="fuel-supplier-contact-person" className="input" value={contactPerson} onChange={event => setContactPerson(event.target.value)} placeholder="Không bắt buộc" />
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 130 }}>
        <Field label="Điện thoại" htmlFor="fuel-supplier-phone">
          <input id="fuel-supplier-phone" className="input" value={phone} onChange={event => setPhone(event.target.value)} placeholder="Không bắt buộc" inputMode="tel" />
        </Field>
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <Field label="Trạng thái" htmlFor="fuel-supplier-status">
          <select id="fuel-supplier-status" className="input" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng</option>
          </select>
        </Field>
      </div>
      <FormActions
        saving={saving}
        isedit={Boolean(item)}
        oncancel={oncancel}
        onsave={() => {
          if (!name.trim()) return;
          onsave({
            name: name.trim(),
            contactPerson: contactPerson.trim() || null,
            phone: phone.trim() || null,
            status,
            isFuelSupplier: true,
          });
        }}
      />
    </InlineForm>
  );
}

export default function FuelSuppliersConfigPage() {
  const { rootRef: pageRef } = usePageAnimations({ ready: true, selectors: ['.cfg-row'] });

  return (
    <div ref={pageRef}>
      <CrudTable<Supplier>
        title="Nhà cung cấp dầu"
        description="Đặt trạng thái Ngừng để không xuất hiện trong phân bổ dầu của chuyến mới; lịch sử đã ghi nhận vẫn được giữ lại."
        endpoint="/suppliers"
        fetchItems={configClient.getAllSuppliers}
        pageSlug="fuel-suppliers"
        iconName="fuel"
        createActionPlacement="header"
        showDelete={false}
        filterItems={suppliers => suppliers.filter(supplier => supplier.isFuelSupplier)}
        sortFn={(left, right) => left.name.localeCompare(right.name, 'vi')}
        emptyIllustration="empty-config.svg"
        emptyTitle="Chưa có nhà cung cấp dầu"
        emptyHint="Thêm cây dầu để kế toán chọn khi phân bổ nhiên liệu cho chuyến xe."
        compactItemAriaLabel={supplier => `Chỉnh sửa nhà cung cấp dầu ${supplier.name}`}
        renderCompactItem={supplier => (
          <>
            <span className={`expense-category-row__strip${supplier.status === 'ACTIVE' ? '' : ' is-inactive'}`} aria-hidden="true" />
            <div className="expense-category-row__details">
              <strong className="expense-category-row__name">{supplier.name}</strong>
              <span className="expense-category-row__meta">
                {supplier.contactPerson || supplier.phone
                  ? [supplier.contactPerson, supplier.phone].filter(Boolean).join(' · ')
                  : 'Chưa có thông tin liên hệ'}
              </span>
            </div>
            <span className={`expense-category-row__state${supplier.status === 'ACTIVE' ? '' : ' is-inactive'}`}>
              <span className="expense-category-row__state-dot" aria-hidden="true" />
              <span>{supplier.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          </>
        )}
        renderForm={props => (
          <FuelSupplierForm
            saving={props.saving}
            item={props.item}
            onsave={props.onSave}
            oncancel={props.onCancel}
          />
        )}
      />
    </div>
  );
}
