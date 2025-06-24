import React, { useState } from 'react';
import {
  FormGroup,
  FormRow,
  FormCol,
  FormLabel,
  FormControl,
  ErrorText,
  HelperText,
  Button
} from '@components/ui';
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '@constants/payment';

const PaymentManagement = ({
  paymentStatus = PAYMENT_STATUS.DRAFT,
  paymentProof = '',
  onPaymentStatusChange,
  onPaymentProofChange,
  errors = {},
  disabled = false,
  showFileUpload = true, // Option to show/hide file upload functionality
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleStatusChange = (event) => {
    const newStatus = event.target.value;
    onPaymentStatusChange(newStatus);
  };

  const handleProofChange = (event) => {
    const newProof = event.target.value;
    onPaymentProofChange(newProof);
  };

  // File upload handler (placeholder for future implementation)
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // TODO: Implement file upload to cloud storage (Google Drive, AWS S3, etc.)
      // For now, this is a placeholder
      console.log('File upload not implemented yet:', file.name);
      
      // Simulated upload result
      setTimeout(() => {
        const mockUrl = `https://drive.google.com/file/d/mock_${Date.now()}/view`;
        onPaymentProofChange(mockUrl);
        setIsUploading(false);
      }, 2000);
    } catch (error) {
      console.error('File upload failed:', error);
      setIsUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case PAYMENT_STATUS.DRAFT:
        return '#6b7280'; // gray
      case PAYMENT_STATUS.PENDING:
        return '#f59e0b'; // amber
      case PAYMENT_STATUS.PAID:
        return '#10b981'; // green
      case PAYMENT_STATUS.CANCELLED:
        return '#ef4444'; // red
      default:
        return '#6b7280';
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span 
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500',
          color: 'white',
          backgroundColor: getStatusColor(status),
          marginLeft: '8px'
        }}
      >
        {PAYMENT_STATUS_LABELS[status]}
      </span>
    );
  };

  return (
    <div>
      <FormRow>
        <FormCol>
          <FormLabel required>Trạng thái thanh toán</FormLabel>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FormControl
              type="select"
              value={paymentStatus}
              onChange={handleStatusChange}
              error={!!errors.payment_status}
              disabled={disabled}
              required
              style={{ flex: 1 }}
            >
              {Object.entries(PAYMENT_STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </FormControl>
            {getStatusBadge(paymentStatus)}
          </div>
          {errors.payment_status && <ErrorText>{errors.payment_status}</ErrorText>}
        </FormCol>
      </FormRow>

      <FormGroup>
        <FormLabel>Chứng từ thanh toán</FormLabel>
        <FormControl
          placeholder="URL ảnh chứng từ thanh toán (ví dụ: Google Drive link)"
          value={paymentProof}
          onChange={handleProofChange}
          error={!!errors.payment_proof}
          disabled={disabled || isUploading}
        />
        {errors.payment_proof && <ErrorText>{errors.payment_proof}</ErrorText>}
        
        {showFileUpload && (
          <div style={{ marginTop: '8px' }}>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              disabled={disabled || isUploading}
              style={{ display: 'none' }}
              id="payment-proof-upload"
            />
            <label htmlFor="payment-proof-upload">
              <Button
                as="span"
                variant="outline"
                size="small"
                disabled={disabled || isUploading}
                style={{ cursor: 'pointer' }}
              >
                {isUploading ? 'Đang tải lên...' : 'Tải lên file'}
              </Button>
            </label>
            <HelperText>
              Hỗ trợ ảnh (JPG, PNG) và PDF. Tối đa 5MB.
              {paymentProof && (
                <span>
                  {' '}
                  <a 
                    href={paymentProof} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', textDecoration: 'underline' }}
                  >
                    Xem chứng từ hiện tại
                  </a>
                </span>
              )}
            </HelperText>
          </div>
        )}
      </FormGroup>

      {/* Payment workflow hints */}
      {paymentStatus === PAYMENT_STATUS.DRAFT && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          marginTop: '12px'
        }}>
          <HelperText>
            💡 <strong>Gợi ý:</strong> Sau khi nhập đầy đủ thông tin, chuyển trạng thái thành "Chờ thanh toán" để theo dõi tiến độ.
          </HelperText>
        </div>
      )}

      {paymentStatus === PAYMENT_STATUS.PENDING && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          marginTop: '12px'
        }}>
          <HelperText>
            ⏳ <strong>Chờ thanh toán:</strong> Hãy cung cấp chứng từ thanh toán sau khi hoàn tất giao dịch.
          </HelperText>
        </div>
      )}

      {paymentStatus === PAYMENT_STATUS.PAID && !paymentProof && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fecaca',
          borderRadius: '6px',
          marginTop: '12px'
        }}>
          <HelperText>
            ⚠️ <strong>Thiếu chứng từ:</strong> Vui lòng cung cấp chứng từ thanh toán để hoàn tất hồ sơ.
          </HelperText>
        </div>
      )}

      {paymentStatus === PAYMENT_STATUS.PAID && paymentProof && (
        <div style={{
          padding: '12px',
          backgroundColor: '#d1fae5',
          borderRadius: '6px',
          marginTop: '12px'
        }}>
          <HelperText>
            ✅ <strong>Hoàn tất:</strong> Thanh toán đã được xác nhận và có chứng từ.
          </HelperText>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;