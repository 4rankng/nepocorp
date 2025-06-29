import { useState, useEffect, useCallback } from 'react';

// Mock API calls - replace with actual API endpoints
const mockCustomersApi = {
  getAll: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      data: [
        { id: 1, name: 'Công ty ABC', code: 'ABC001', email: 'abc@company.com', phone: '0123456789' },
        { id: 2, name: 'Công ty XYZ', code: 'XYZ001', email: 'xyz@company.com', phone: '0987654321' },
        { id: 3, name: 'Công ty DEF', code: 'DEF001', email: 'def@company.com', phone: '0112233445' },
        { id: 4, name: 'Mộc Sương', code: 'MS001', email: 'mocsuong@company.com', phone: '0556677889' },
        { id: 5, name: 'Ligarden', code: 'LG001', email: 'ligarden@company.com', phone: '0445566778' }
      ]
    };
  }
};

const mockPartnersApi = {
  getAll: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      data: [
        { id: 1, name: 'Đối tác Alpha', code: 'ALPHA001', email: 'alpha@partner.com', phone: '0334455667' },
        { id: 2, name: 'Đối tác Beta', code: 'BETA001', email: 'beta@partner.com', phone: '0223344556' },
        { id: 3, name: 'Đối tác Gamma', code: 'GAMMA001', email: 'gamma@partner.com', phone: '0778899001' },
        { id: 4, name: 'Tân Lập MC', code: 'TL001', email: 'tanlapmc@partner.com', phone: '0667788990' },
        { id: 5, name: 'Vista', code: 'VISTA001', email: 'vista@partner.com', phone: '0889900112' }
      ]
    };
  }
};

export const useCustomersPartners = () => {
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockCustomersApi.getAll();
      setCustomers(response.data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Không thể tải danh sách khách hàng');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch partners
  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mockPartnersApi.getAll();
      setPartners(response.data || []);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError('Không thể tải danh sách đối tác');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch both customers and partners
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [customersResponse, partnersResponse] = await Promise.all([
        mockCustomersApi.getAll(),
        mockPartnersApi.getAll()
      ]);
      
      setCustomers(customersResponse.data || []);
      setPartners(partnersResponse.data || []);
    } catch (err) {
      console.error('Error fetching customers and partners:', err);
      setError('Không thể tải danh sách khách hàng và đối tác');
      setCustomers([]);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get customer by ID
  const getCustomerById = useCallback((id) => {
    return customers.find(customer => customer.id === id) || null;
  }, [customers]);

  // Get partner by ID
  const getPartnerById = useCallback((id) => {
    return partners.find(partner => partner.id === id) || null;
  }, [partners]);

  // Search customers
  const searchCustomers = useCallback((query) => {
    if (!query || query.trim() === '') return customers;
    
    const searchTerm = query.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.code.toLowerCase().includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm))
    );
  }, [customers]);

  // Search partners
  const searchPartners = useCallback((query) => {
    if (!query || query.trim() === '') return partners;
    
    const searchTerm = query.toLowerCase();
    return partners.filter(partner => 
      partner.name.toLowerCase().includes(searchTerm) ||
      partner.code.toLowerCase().includes(searchTerm) ||
      (partner.email && partner.email.toLowerCase().includes(searchTerm))
    );
  }, [partners]);

  // Get entity (customer or partner) by ID
  const getEntityById = useCallback((customerId, partnerId) => {
    if (customerId) {
      const customer = getCustomerById(customerId);
      return customer ? { type: 'customer', data: customer } : null;
    }
    
    if (partnerId) {
      const partner = getPartnerById(partnerId);
      return partner ? { type: 'partner', data: partner } : null;
    }
    
    return null;
  }, [getCustomerById, getPartnerById]);

  // Get entity display name
  const getEntityDisplayName = useCallback((customerId, partnerId) => {
    const entity = getEntityById(customerId, partnerId);
    return entity ? entity.data.name : '';
  }, [getEntityById]);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    // Data
    customers,
    partners,
    loading,
    error,

    // Actions
    fetchCustomers,
    fetchPartners,
    fetchAll,
    refresh: fetchAll,

    // Utilities
    getCustomerById,
    getPartnerById,
    getEntityById,
    getEntityDisplayName,
    searchCustomers,
    searchPartners,

    // Computed values
    hasCustomers: customers.length > 0,
    hasPartners: partners.length > 0,
    isEmpty: customers.length === 0 && partners.length === 0
  };
};