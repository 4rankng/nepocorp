import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  Alert,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import TransactionTypeSelector from './TransactionTypeSelector';
import CustomerPartnerSelector from './CustomerPartnerSelector';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import {
  validateTransaction,
  validateAmount,
  validateDate,
  validateReferenceNumber,
  validateNotes,
  sanitizeAmount,
  formatFormAmount,
} from '@/features/bang-cong-no/utils';
import { createEmptyTransaction, FORM_MODES } from '@/features/bang-cong-no/types';

const TransactionForm = ({
  initialData = null,
  mode = FORM_MODES.CREATE,
  customers = [],
  partners = [],
  onSubmit,
  onChange,
  autoValidate = true,
  sx = {},
}) => {
  const [formData, setFormData] = useState(createEmptyTransaction());
  const [errors, setErrors] = useState({});
  const [amountType, setAmountType] = useState('debit');
  const [amountValue, setAmountValue] = useState('');

  const isViewing = mode === FORM_MODES.VIEW;

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      const debit = parseFloat(initialData.debit) || 0;
      const credit = parseFloat(initialData.credit) || 0;

      setFormData({
        ...initialData,
        transaction_date:
          initialData.transaction_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      });

      setAmountType(debit > 0 ? 'debit' : 'credit');
      setAmountValue(formatFormAmount(Math.max(debit, credit)));
    } else {
      const emptyTransaction = createEmptyTransaction();
      setFormData(emptyTransaction);
      setAmountType('debit');
      setAmountValue('');
    }
    setErrors({});
  }, [initialData]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      const sanitizedAmount = sanitizeAmount(amountValue);
      const currentData = {
        ...formData,
        debit: amountType === 'debit' ? sanitizedAmount : 0,
        credit: amountType === 'credit' ? sanitizedAmount : 0,
      };
      onChange(currentData, errors);
    }
  }, [formData, amountType, amountValue, errors, onChange]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Auto-validation
    if (autoValidate) {
      validateField(field, value);
    }
  };

  const handleAmountChange = value => {
    setAmountValue(value);

    // Clear amount error when user starts typing
    if (errors.amount) {
      setErrors(prev => ({
        ...prev,
        amount: undefined,
      }));
    }

    // Auto-validation
    if (autoValidate && value) {
      const validation = validateAmount(value);
      if (!validation.isValid) {
        setErrors(prev => ({
          ...prev,
          amount: validation.error,
        }));
      }
    }
  };

  const handleEntityChange = (field, value) => {
    // Clear the other entity field when one is selected
    if (field === 'customer_id') {
      setFormData(prev => ({
        ...prev,
        customer_id: value,
        partner_id: null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        partner_id: value,
        customer_id: null,
      }));
    }

    // Clear entity error
    if (errors.entity) {
      setErrors(prev => ({
        ...prev,
        entity: undefined,
      }));
    }
  };

  const validateField = (field, value) => {
    let validation = { isValid: true };

    switch (field) {
      case 'transaction_date':
        validation = validateDate(value);
        break;
      case 'reference_number':
        if (value) {
          validation = validateReferenceNumber(value);
        }
        break;
      case 'notes':
        if (value) {
          validation = validateNotes(value);
        }
        break;
      default:
        return;
    }

    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        [field]: validation.error,
      }));
    }
  };

  const validateForm = () => {
    const sanitizedAmount = sanitizeAmount(amountValue);

    // Prepare transaction data for validation
    const transactionData = {
      ...formData,
      debit: amountType === 'debit' ? sanitizedAmount : 0,
      credit: amountType === 'credit' ? sanitizedAmount : 0,
    };

    const validation = validateTransaction(transactionData);

    // Additional field validations
    const amountValidation = validateAmount(amountValue);
    if (!amountValidation.isValid) {
      validation.errors.amount = amountValidation.error;
      validation.isValid = false;
    }

    const dateValidation = validateDate(formData.transaction_date);
    if (!dateValidation.isValid) {
      validation.errors.transaction_date = dateValidation.error;
      validation.isValid = false;
    }

    if (formData.reference_number) {
      const refValidation = validateReferenceNumber(formData.reference_number);
      if (!refValidation.isValid) {
        validation.errors.reference_number = refValidation.error;
        validation.isValid = false;
      }
    }

    if (formData.notes) {
      const notesValidation = validateNotes(formData.notes);
      if (!notesValidation.isValid) {
        validation.errors.notes = notesValidation.error;
        validation.isValid = false;
      }
    }

    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = event => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const sanitizedAmount = sanitizeAmount(amountValue);

    const transactionData = {
      ...formData,
      debit: amountType === 'debit' ? sanitizedAmount : 0,
      credit: amountType === 'credit' ? sanitizedAmount : 0,
    };

    onSubmit && onSubmit(transactionData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={sx}>
      {errors.entity && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors.entity}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Transaction Type */}
        <Grid item xs={12}>
          <TransactionTypeSelector
            value={formData.transaction_type}
            onChange={value => handleInputChange('transaction_type', value)}
            error={!!errors.transaction_type}
            helperText={errors.transaction_type}
            required
            disabled={isViewing}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Customer and Partner */}
        <Grid item xs={12}>
          <CustomerPartnerSelector
            customerId={formData.customer_id}
            partnerId={formData.partner_id}
            onCustomerChange={value => handleEntityChange('customer_id', value)}
            onPartnerChange={value => handleEntityChange('partner_id', value)}
            customers={customers}
            partners={partners}
            error={!!errors.entity}
            helperText={errors.entity}
            required
            disabled={isViewing}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider />
        </Grid>

        {/* Date and Amount */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Ngày giao dịch"
            type="date"
            value={formData.transaction_date}
            onChange={e => handleInputChange('transaction_date', e.target.value)}
            fullWidth
            required
            disabled={isViewing}
            error={!!errors.transaction_date}
            helperText={errors.transaction_date}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box>
            <FormControl component="fieldset" disabled={isViewing} sx={{ mb: 2 }}>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
                Loại số tiền *
              </FormLabel>
              <RadioGroup row value={amountType} onChange={e => setAmountType(e.target.value)}>
                <FormControlLabel
                  value="debit"
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="body2" sx={{ color: '#d32f2f' }}>
                      Nợ (Debit)
                    </Typography>
                  }
                />
                <FormControlLabel
                  value="credit"
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                      Có (Credit)
                    </Typography>
                  }
                />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Số tiền"
              type="number"
              value={amountValue}
              onChange={e => handleAmountChange(e.target.value)}
              fullWidth
              required
              disabled={isViewing}
              error={!!errors.amount}
              helperText={errors.amount}
              InputProps={{
                inputProps: { min: 0, step: 0.01 },
              }}
            />

            {amountValue && (
              <Box sx={{ mt: 1 }}>
                <CurrencyDisplay
                  amount={sanitizeAmount(amountValue)}
                  variant="caption"
                  color={amountType === 'debit' ? '#d32f2f' : '#2e7d32'}
                />
              </Box>
            )}
          </Box>
        </Grid>

        {/* Reference Number */}
        <Grid item xs={12}>
          <TextField
            label="Số tham chiếu / Diễn giải"
            value={formData.reference_number}
            onChange={e => handleInputChange('reference_number', e.target.value)}
            fullWidth
            disabled={isViewing}
            error={!!errors.reference_number}
            helperText={
              errors.reference_number || 'VD: Phiếu thu số INV-2025-001, Thanh toán TT-001'
            }
            placeholder="Nhập số tham chiếu hoặc diễn giải"
          />
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <TextField
            label="Ghi chú"
            value={formData.notes}
            onChange={e => handleInputChange('notes', e.target.value)}
            fullWidth
            multiline
            rows={3}
            disabled={isViewing}
            error={!!errors.notes}
            helperText={errors.notes}
            placeholder="Ghi chú bổ sung (không bắt buộc)"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default TransactionForm;
