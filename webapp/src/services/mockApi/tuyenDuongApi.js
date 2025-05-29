import * as tuyenDuongDataService from '@services/mockData/tuyenDuong';

export const getAllTuyenDuong = async () => {
  try {
    const data = await tuyenDuongDataService.getAllTuyenDuong();
    return { data, error: null };
  } catch (error) {
    console.error('Error in getAllTuyenDuong:', error);
    return { data: null, error: error.message };
  }
};

export const getTuyenDuongById = async id => {
  try {
    const data = await tuyenDuongDataService.getTuyenDuongById(id);
    if (!data) {
      return { data: null, error: 'Tuyen duong not found' };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error in getTuyenDuongById:', error);
    return { data: null, error: error.message };
  }
};

export const getTuyenDuongByMaSo = async ma_so => {
  try {
    const data = await tuyenDuongDataService.getTuyenDuongByMaSo(ma_so);
    if (!data) {
      return { data: null, error: 'Tuyen duong not found' };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error in getTuyenDuongByMaSo:', error);
    return { data: null, error: error.message };
  }
};

export const createTuyenDuong = async tuyenDuong => {
  try {
    const data = await tuyenDuongDataService.createTuyenDuong(tuyenDuong);
    return { data, error: null };
  } catch (error) {
    console.error('Error in createTuyenDuong:', error);
    return { data: null, error: error.message };
  }
};

export const updateTuyenDuong = async (id, updates) => {
  try {
    const data = await tuyenDuongDataService.updateTuyenDuong(id, updates);
    if (!data) {
      return { data: null, error: 'Tuyen duong not found' };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error in updateTuyenDuong:', error);
    return { data: null, error: error.message };
  }
};

export const deleteTuyenDuong = async id => {
  try {
    const success = await tuyenDuongDataService.deleteTuyenDuong(id);
    if (!success) {
      return { error: 'Tuyen duong not found' };
    }
    return { error: null };
  } catch (error) {
    console.error('Error in deleteTuyenDuong:', error);
    return { error: error.message };
  }
};

// For testing and resetting
export const _resetTuyenDuong = async (newData = []) => {
  try {
    const data = await tuyenDuongDataService._resetTuyenDuong(newData);
    return { data, error: null };
  } catch (error) {
    console.error('Error in _resetTuyenDuong:', error);
    return { data: null, error: error.message };
  }
};

export const getTuyenDuongCount = async () => {
  try {
    const count = await tuyenDuongDataService.getTuyenDuongCount();
    return { data: count, error: null };
  } catch (error) {
    console.error('Error in getTuyenDuongCount:', error);
    return { data: 0, error: error.message };
  }
};
