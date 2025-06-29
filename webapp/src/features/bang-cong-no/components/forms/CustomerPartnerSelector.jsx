import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import Dropdown from '@/components/ui/Dropdown';

const CustomerPartnerSelector = ({
  customerId,
  partnerId,
  onCustomerChange,
  onPartnerChange,
  customers = [],
  partners = [],
  disabled = false,
  error = false,
  helperText = '',
  label = 'Khách hàng / Đối tác',
  required = false,
  allowBoth = false, // Whether to allow selecting both customer and partner
  sx = {}
}) => {
  const [activeTab, setActiveTab] = useState(
    customerId ? 0 : partnerId ? 1 : 0
  );

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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    if (!allowBoth) {
      // Clear the other selection when switching tabs
      if (newValue === 0) {
        onPartnerChange && onPartnerChange(null);
      } else {
        onCustomerChange && onCustomerChange(null);
      }
    }
  };

  const handleCustomerChange = (value) => {
    onCustomerChange && onCustomerChange(value);
    
    if (!allowBoth && value) {
      // Clear partner selection if customer is selected
      onPartnerChange && onPartnerChange(null);
    }
  };

  const handlePartnerChange = (value) => {
    onPartnerChange && onPartnerChange(value);
    
    if (!allowBoth && value) {
      // Clear customer selection if partner is selected
      onCustomerChange && onCustomerChange(null);
    }
  };

  const getSelectedEntity = () => {
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      return {
        type: 'customer',
        name: customer?.name || 'N/A',
        icon: PersonIcon,
        color: '#1976d2'
      };
    }
    
    if (partnerId) {
      const partner = partners.find(p => p.id === partnerId);
      return {
        type: 'partner',
        name: partner?.name || 'N/A',
        icon: BusinessIcon,
        color: '#9c27b0'
      };
    }
    
    return null;
  };

  const selectedEntity = getSelectedEntity();

  return (
    <Box sx={sx}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        {label} {required && '*'}
      </Typography>

      {/* Current Selection Display */}
      {selectedEntity && (
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<selectedEntity.icon fontSize="small" />}
            label={`${selectedEntity.type === 'customer' ? 'KH' : 'ĐT'}: ${selectedEntity.name}`}
            color="primary"
            variant="outlined"
            sx={{
              bgcolor: `${selectedEntity.color}10`,
              borderColor: selectedEntity.color,
              color: selectedEntity.color
            }}
            onDelete={() => {
              if (selectedEntity.type === 'customer') {
                onCustomerChange && onCustomerChange(null);
              } else {
                onPartnerChange && onPartnerChange(null);
              }
            }}
          />
        </Box>
      )}

      {/* Entity Type Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ 
          mb: 2,
          '& .MuiTab-root': {
            minHeight: 40,
            fontSize: '0.875rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'
          }
        }}
      >
        <Tab 
          icon={<PersonIcon fontSize="small" />} 
          label="Khách hàng" 
          iconPosition="start"
          disabled={disabled || (!allowBoth && !!partnerId)}
        />
        <Tab 
          icon={<BusinessIcon fontSize="small" />} 
          label="Đối tác" 
          iconPosition="start"
          disabled={disabled || (!allowBoth && !!customerId)}
        />
      </Tabs>

      {/* Customer Selection */}
      {activeTab === 0 && (
        <Dropdown
          value={customerId || ''}
          onChange={handleCustomerChange}
          options={customerOptions}
          placeholder="Chọn khách hàng"
          clearable
          searchable
          disabled={disabled}
          error={error && !customerId && !partnerId}
          noOptionsText="Không có khách hàng nào"
        />
      )}

      {/* Partner Selection */}
      {activeTab === 1 && (
        <Dropdown
          value={partnerId || ''}
          onChange={handlePartnerChange}
          options={partnerOptions}
          placeholder="Chọn đối tác"
          clearable
          searchable
          disabled={disabled}
          error={error && !customerId && !partnerId}
          noOptionsText="Không có đối tác nào"
        />
      )}

      {/* Both selections for allowBoth mode */}
      {allowBoth && (customerId || partnerId) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Cả hai được chọn:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {customerId && (
              <Chip
                icon={<PersonIcon fontSize="small" />}
                label={customers.find(c => c.id === customerId)?.name || 'N/A'}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => onCustomerChange && onCustomerChange(null)}
              />
            )}
            {partnerId && (
              <Chip
                icon={<BusinessIcon fontSize="small" />}
                label={partners.find(p => p.id === partnerId)?.name || 'N/A'}
                size="small"
                color="secondary"
                variant="outlined"
                onDelete={() => onPartnerChange && onPartnerChange(null)}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Error and Help Text */}
      {!allowBoth && error && !customerId && !partnerId && (
        <Alert severity="error" sx={{ mt: 1 }}>
          Vui lòng chọn khách hàng hoặc đối tác
        </Alert>
      )}
      
      {helperText && (
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default CustomerPartnerSelector;