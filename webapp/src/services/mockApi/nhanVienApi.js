// Mock API services for NhanVien (Employees)
import * as nhanVienDataService from '@services/mockData/nhanVien';
import { 
  withPagination, 
  withSingleItem, 
  withCreate, 
  withUpdate, 
  withDelete,
  createApiSingleResponse,
  createApiResponse,
  mockApiCall 
} from './apiWrapper.js';

export const fetchAllNhanVien = (page = 1, pageSize = 10) => {
  return mockApiCall(async () => {
    // Reset to original data before fetching to ensure consistency for this diagnostic step
    await nhanVienDataService._resetNhanVien();
    const allNhanVien = await nhanVienDataService.getAllNhanVien();
    const total = allNhanVien.length;
    const start = (page - 1) * pageSize;
    const end = page * pageSize;
    const items = allNhanVien.slice(start, end);
    
    return createApiResponse(items, {
      page,
      limit: pageSize,
      totalItems: total
    });
  });
};

export const fetchNhanVienById = id => {
  return mockApiCall(() => 
    withSingleItem(() => nhanVienDataService.getNhanVienById(id), 'Nhan vien not found')
  );
};

export const addNhanVien = data => {
  return mockApiCall(() => 
    withCreate(() => nhanVienDataService.createNhanVien(data), 'Nhan vien created successfully')
  );
};

export const editNhanVien = (id, data) => {
  return mockApiCall(() => 
    withUpdate(() => nhanVienDataService.updateNhanVien(id, data), 'Nhan vien not found', 'Nhan vien updated successfully')
  );
};

export const removeNhanVien = id => {
  return mockApiCall(() => 
    withDelete(() => nhanVienDataService.deleteNhanVien(id), 'Nhan vien not found', 'Nhan vien deleted successfully')
  );
};

export const _resetNhanVienMockData = data => {
  return mockApiCall(() => 
    createApiSingleResponse(nhanVienDataService._resetNhanVien(data), 'Nhan vien data reset successfully')
  );
};
