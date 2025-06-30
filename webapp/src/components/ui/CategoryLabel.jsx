import React from 'react';
import PropTypes from 'prop-types';
import { getExpenseCategoryLabel } from '@constants/expenseCategories';
import { getInvoiceCategoryLabel } from '@constants/invoiceCategories';

/**
 * Component to display category names with Vietnamese labels
 * Automatically detects whether it's an expense or invoice category
 */
const CategoryLabel = ({ categoryName, type = 'auto' }) => {
  if (!categoryName) return '-';

  let label = categoryName;

  if (type === 'expense') {
    label = getExpenseCategoryLabel(categoryName);
  } else if (type === 'invoice') {
    label = getInvoiceCategoryLabel(categoryName);
  } else if (type === 'auto') {
    // Try expense category first, then invoice category
    const expenseLabel = getExpenseCategoryLabel(categoryName);
    if (expenseLabel !== categoryName) {
      label = expenseLabel;
    } else {
      label = getInvoiceCategoryLabel(categoryName);
    }
  }

  return <span>{label}</span>;
};

CategoryLabel.propTypes = {
  categoryName: PropTypes.string,
  type: PropTypes.oneOf(['expense', 'invoice', 'auto']),
};

export default CategoryLabel;
