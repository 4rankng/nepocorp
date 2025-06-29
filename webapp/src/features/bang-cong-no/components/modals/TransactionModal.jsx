import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  TextField,
  Alert,
  Divider,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import Dropdown from '@/components/ui/Dropdown';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import {
  validateTransaction,
  validateAmount,
  validateDate,
  validateReferenceNumber,
  validateNotes,
  sanitizeAmount,
  formatFormAmount
} from '@/features/bang-cong-no/utils';
import {
  TRANSACTION_TYPE_OPTIONS,
  FORM_MODES,
  createEmptyTransaction
} from '@/features/bang-cong-no/types';

const TransactionModal = ({
  open = false,
  onClose,
  onSave,
  transaction = null,
  mode = FORM_MODES.CREATE,
  customers = [],
  partners = [],
  loading = false
}) => {
  const [formData, setFormData] = useState(createEmptyTransaction());
  const [errors, setErrors] = useState({});
  const [amountType, setAmountType] = useState('debit'); // 'debit' or 'credit'
  const [amountValue, setAmountValue] = useState('');

  const isEditing = mode === FORM_MODES.EDIT;
  const isViewing = mode === FORM_MODES.VIEW;
  const isCreating = mode === FORM_MODES.CREATE;

  // Initialize form data
  useEffect(() => {
    if (open) {
      if (transaction && (isEditing || isViewing)) {
        const debit = parseFloat(transaction.debit) || 0;
        const credit = parseFloat(transaction.credit) || 0;

        setFormData({
          ...transaction,
          transaction_date: transaction.transaction_date?.split('T')[0] || new Date().toISOString().split('T')[0]
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
    }
  }, [open, transaction, mode]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleAmountChange = (value) => {
    setAmountValue(value);

    // Clear amount error when user starts typing
    if (errors.amount) {
      setErrors(prev => ({
        ...prev,
        amount: undefined
      }));
    }
  };

  const handleEntityChange = (field, value) => {
    // Clear the other entity field when one is selected
    if (field === 'customer_id') {
      setFormData(prev => ({
        ...prev,
        customer_id: value,
        partner_id: null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        partner_id: value,
        customer_id: null
      }));
    }

    // Clear entity error
    if (errors.entity) {
      setErrors(prev => ({
        ...prev,
        entity: undefined
      }));
    }
  };

  const validateForm = () => {
    const sanitizedAmount = sanitizeAmount(amountValue);

    // Prepare transaction data for validation
    const transactionData = {
      ...formData,
      debit: amountType === 'debit' ? sanitizedAmount : 0,
      credit: amountType === 'credit' ? sanitizedAmount : 0
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

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const sanitizedAmount = sanitizeAmount(amountValue);

    const transactionData = {
      ...formData,
      debit: amountType === 'debit' ? sanitizedAmount : 0,
      credit: amountType === 'credit' ? sanitizedAmount : 0
    };

    try {
      await onSave(transactionData);
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case FORM_MODES.CREATE:
        return 'Thêm giao dịch mới';
      case FORM_MODES.EDIT:
        return 'Chỉnh sửa giao dịch';
      case FORM_MODES.VIEW:
        return 'Chi tiết giao dịch';
      default:
        return 'Giao dịch';
    }
  };

  const customerOptions = customers.map(customer => ({
    value: customer.id,
    label: customer.name,
    displayText: customer.name
  }));

  const partnerOptions = partners.map(partner => ({
    value: partner.id,
    label: partner.name,
    displayText: partner.name
  }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      {loading && <LinearProgress />}

      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {getTitle()}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {errors.entity && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.entity}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Transaction Type */}
          <Grid item xs={12}>
            <FormControl component="fieldset" disabled={isViewing}>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
                Loại giao dịch *
              </FormLabel>
              <RadioGroup
                row
                value={formData.transaction_type}
                onChange={(e) => handleInputChange('transaction_type', e.target.value)}
              >
                {TRANSACTION_TYPE_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2" sx={{ color: option.color }}>
                        {option.label}
                      </Typography>
                    }
                    sx={{ mr: 3 }}
                  />
                ))}
              </RadioGroup>
              {errors.transaction_type && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {errors.transaction_type}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Customer and Partner */}
          <Grid item xs={12} sm={6}>
            <Dropdown
              label="Khách hàng"
              value={formData.customer_id || ''}
              onChange={(value) => handleEntityChange('customer_id', value || null)}
              options={customerOptions}
              placeholder="Chọn khách hàng"
              clearable
              searchable
              disabled={isViewing || !!formData.partner_id}
              error={!!errors.entity}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Dropdown
              label="Đối tác"
              value={formData.partner_id || ''}
              onChange={(value) => handleEntityChange('partner_id', value || null)}
              options={partnerOptions}
              placeholder="Chọn đối tác"
              clearable
              searchable
              disabled={isViewing || !!formData.customer_id}
              error={!!errors.entity}
            />
          </Grid>

          {/* Date */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Ngày giao dịch"
              type="date"
              value={formData.transaction_date}
              onChange={(e) => handleInputChange('transaction_date', e.target.value)}
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

          {/* Amount Type and Value */}
          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset" disabled={isViewing} sx={{ mb: 2 }}>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
                Loại số tiền *
              </FormLabel>
              <RadioGroup
                row
                value={amountType}
                onChange={(e) => setAmountType(e.target.value)}
              >
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
              onChange={(e) => handleAmountChange(e.target.value)}
              fullWidth
              required
              disabled={isViewing}
              error={!!errors.amount}
              helperText={errors.amount}
              InputProps={{
                inputProps: { min: 0, step: 0.01 }
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
          </Grid>

          {/* Reference Number */}
          <Grid item xs={12}>
            <TextField
              label="Số tham chiếu / Diễn giải"
              value={formData.reference_number}
              onChange={(e) => handleInputChange('reference_number', e.target.value)}
              fullWidth
              disabled={isViewing}
              error={!!errors.reference_number}
              helperText={errors.reference_number || 'VD: Phiếu thu số INV-2025-001'}
              placeholder="Nhập số tham chiếu hoặc diễn giải"
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              label="Ghi chú"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
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
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          color="inherit"
          disabled={loading}
        >
          {isViewing ? 'Đóng' : 'Hủy'}
        </Button>

        {!isViewing && (
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {isCreating ? 'Tạo' : 'Cập nhật'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransactionModal;
