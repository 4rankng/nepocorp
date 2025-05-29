import React, { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { CustomerForm, CustomerList, useCustomerManagement } from '@features/khach-hang';
// Example 1: Using individual components with custom hook
const BasicCustomerUsage = () => {
  const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer } =
    useCustomerManagement();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const handleSaveCustomer = async formData => {
    let result;
    if (selectedCustomer) {
      result = await updateCustomer(selectedCustomer.id, formData);
    } else {
      result = await addCustomer(formData);
    }
    if (result.success) {
      setIsFormOpen(false);
      setSelectedCustomer(null);
    }
  };
  const handleEdit = customer => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };
  const handleDelete = async customer => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa khách hàng ${customer.name}?`)) {
      const result = await deleteCustomer(customer.id);
      if (result.success) {
      }
    }
  };
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Example: Basic Customer Management Usage
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => {
            setSelectedCustomer(null);
            setIsFormOpen(true);
          }}
        >
          Add New Customer
        </Button>
      </Stack>
      {/* Customer List */}
      <CustomerList
        customers={customers}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        error={error}
      />
      {/* Customer Form */}
      <CustomerForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCustomer(null);
        }}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
        isLoading={loading}
      />
    </Box>
  );
};
// Example 2: Using just the form component
export const CustomerFormExample = () => {
  const [isOpen, setIsOpen] = useState(false);
  const handleSave = formData => {
    // Here you would typically call your API
    setIsOpen(false);
  };
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Example: Standalone Customer Form
      </Typography>
      <Button variant="outlined" onClick={() => setIsOpen(true)}>
        Open Customer Form
      </Button>
      <CustomerForm open={isOpen} onClose={() => setIsOpen(false)} onSave={handleSave} />
    </Box>
  );
};
// Example 3: Using just the list component with custom data
export const CustomerListExample = () => {
  const mockCustomers = [
    { id: 1, name: 'Test Customer 1', address: 'Address 1', taxCode: '12345' },
    { id: 2, name: 'Test Customer 2', address: '', taxCode: '' },
  ];
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Example: Standalone Customer List
      </Typography>
      <CustomerList
        customers={mockCustomers}
        onEdit={customer => console.log('Edit:', customer)}
        onDelete={customer => console.log('Delete:', customer)}
      />
    </Box>
  );
};
export default BasicCustomerUsage;
