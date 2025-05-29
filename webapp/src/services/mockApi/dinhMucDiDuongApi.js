import * as dinhMucDiDuongDataService from '@services/mockData/dinhMucDiDuong';

export const getAllDinhMucDiDuong = async () => {
  try {
    const data = await dinhMucDiDuongDataService.getAllDinhMucDiDuong();
    return { data, error: null };
  } catch (error) {
    console.error('Error in getAllDinhMucDiDuong:', error);
    return { data: null, error: error.message };
  }
};

export const getDinhMucDiDuongById = async (id) => {
  try {
    const data = await dinhMucDiDuongDataService.getDinhMucDiDuongById(id);
    if (!data) {
      return { data: null, error: 'Dinh muc di duong not found' };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error in getDinhMucDiDuongById:', error);
    return { data: null, error: error.message };
  }
};

export const getDinhMucByContainerAndTuyen = async (ma_cont, ma_tuyen) => {
  try {
    const data = await dinhMucDiDuongDataService.getDinhMucByContainerAndTuyen(ma_cont, ma_tuyen);
    return { data, error: null };
  } catch (error) {
    console.error('Error in getDinhMucByContainerAndTuyen:', error);
    return { data: null, error: error.message };
  }
};

export const createDinhMucDiDuong = async (dinhMuc) => {
  try {
    const data = await dinhMucDiDuongDataService.createDinhMucDiDuong(dinhMuc);
    return { data, error: null };
  } catch (error) {
    console.error('Error in createDinhMucDiDuong:', error);
    return { data: null, error: error.message };
  }
};

export const updateDinhMucDiDuong = async (id, updates) => {
  try {
    const data = await dinhMucDiDuongDataService.updateDinhMucDiDuong(id, updates);
    if (!data) {
      return { data: null, error: 'Dinh muc di duong not found' };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error in updateDinhMucDiDuong:', error);
    return { data: null, error: error.message };
  }
};

export const deleteDinhMucDiDuong = async (id) => {
  try {
    const success = await dinhMucDiDuongDataService.deleteDinhMucDiDuong(id);
    if (!success) {
      return { error: 'Dinh muc di duong not found' };
    }
    return { error: null };
  } catch (error) {
    console.error('Error in deleteDinhMucDiDuong:', error);
    return { error: error.message };
  }
};

// For testing and resetting
export const _resetDinhMucDiDuong = async (newData = []) => {
  try {
    const data = await dinhMucDiDuongDataService._resetDinhMucDiDuong(newData);
    return { data, error: null };
  } catch (error) {
    console.error('Error in _resetDinhMucDiDuong:', error);
    return { data: null, error: error.message };
  }
};

export const getDinhMucDiDuongCount = async () => {
  try {
    const count = await dinhMucDiDuongDataService.getDinhMucDiDuongCount();
    return { data: count, error: null };
  } catch (error) {
    console.error('Error in getDinhMucDiDuongCount:', error);
    return { data: 0, error: error.message };
  }
};
