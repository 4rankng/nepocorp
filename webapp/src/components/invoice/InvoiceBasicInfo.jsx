import React from 'react';
import PropTypes from 'prop-types';
import Dropdown from '@components/ui/Dropdown';
import { getInvoiceCategoryLabel } from '@constants/invoiceCategories';

const InvoiceBasicInfo = ({
  invoiceData,
  isEditing,
  editedData,
  onFieldChange,
  invoiceCategories,
  isLoadingCategories,
  customers = [],
  isLoadingCustomers = false,
  errors = {},
}) => {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Thông tin cơ bản</h2>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Ngày phiếu thu
          </label>
          <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
            {invoiceData.created_at ? new Date(invoiceData.created_at).toLocaleDateString('vi-VN') : '-'}
          </div>
        </div>

        <div className="col-span-8">
          {isEditing ? (
            <>
              <div className="[&_.form-label]:text-xs [&_.dropdown__trigger]:text-sm [&_.dropdown__option]:text-sm">
                <Dropdown
                  label="Khách hàng"
                  required={true}
                  value={editedData.customer_id}
                  onChange={value => onFieldChange('customer_id', value)}
                  options={customers.map(customer => ({
                    value: customer.id,
                    label: customer.name,
                  }))}
                  placeholder="Chọn khách hàng"
                  loading={isLoadingCustomers}
                  className={`text-sm ${errors.customer_id ? 'border-red-500' : ''}`}
                  error={errors.customer_id || null}
                />
              </div>
            </>
          ) : (
            <>
              <label className="block text-xs font-medium text-gray-600 mb-1">Khách hàng</label>
              <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                {invoiceData.customer?.name || '-'}
              </div>
            </>
          )}
        </div>

        <div className="col-span-2">
          {isEditing ? (
            <>
              <div className="[&_.form-label]:text-xs [&_.dropdown__trigger]:text-sm [&_.dropdown__option]:text-sm">
                <Dropdown
                  label="Loại phiếu thu"
                  required={true}
                  value={editedData.invoice_category_id}
                  onChange={value => onFieldChange('invoice_category_id', value)}
                  options={invoiceCategories.map(cat => ({
                    value: cat.id,
                    label: getInvoiceCategoryLabel(cat.name),
                  }))}
                  placeholder="Chọn loại phiếu thu"
                  loading={isLoadingCategories}
                  className={`text-sm ${errors.invoice_category_id ? 'border-red-500' : ''}`}
                  error={errors.invoice_category_id || null}
                />
              </div>
            </>
          ) : (
            <>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loại phiếu thu</label>
              <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                {invoiceData.invoice_category?.name
                  ? getInvoiceCategoryLabel(invoiceData.invoice_category.name)
                  : '-'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

InvoiceBasicInfo.propTypes = {
  invoiceData: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
  editedData: PropTypes.object,
  onFieldChange: PropTypes.func.isRequired,
  invoiceCategories: PropTypes.array.isRequired,
  isLoadingCategories: PropTypes.bool.isRequired,
  customers: PropTypes.array,
  isLoadingCustomers: PropTypes.bool,
  errors: PropTypes.object,
};

export default React.memo(InvoiceBasicInfo);