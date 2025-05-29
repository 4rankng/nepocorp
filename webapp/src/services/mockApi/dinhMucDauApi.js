import * as dinhMucDauDataService from '@services/mockData/dinhMucDau';

export const getAllDinhMucDau = async () => {
  try {
    const data = await dinhMucDauDataService.getAllDinhMucDau();
    return { data, error: null };
  } catch (error) {
    console.error('Error in getAllDinhMucDau:', error);
    return { data: null, error: error.message };
  }
};

export const getDinhMucDauById = async (id) => {
  try {
    const data = await dinhMucDauDataService.getDinhMucDauById(id);
    if (!data) {
      return { data: null, error: 'Dinh muc dau not found' };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error in getDinhMucDauById:', error);
    return { data: null, error: error.message };
  }
};

export const createDinhMucDau = async (dinhMucDau) => {
  try {
    const data = await dinhMucDauDataService.createDinhMucDau(dinhMucDau);
    return { data, error: null };
  } catch (error) {
    console.error('Error in createDinhMucDau:', error);
    return { data: null, error: error.message };
  }
};

export const updateDinhMucDau = async (id, updates) => {
  try {
    const data = await dinhMucDauDataService.updateDinhMucDau(id, updates);
    if (!data) {
      return { data: null, error: 'Dinh muc dau not found' };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error in updateDinhMucDau:', error);
    return { data: null, error: error.message };
  }
};

export const deleteDinhMucDau = async (id) => {
  try {
    const success = await dinhMucDauDataService.deleteDinhMucDau(id);
    if (!success) {
      return { error: 'Dinh muc dau not found' };
    }
    return { error: null };
  } catch (error) {
    console.error('Error in deleteDinhMucDau:', error);
    return { error: error.message };
  }
};

// For testing and resetting
export const _resetDinhMucDau = async (newData = []) => {
  try {
    const data = await dinhMucDauDataService._resetDinhMucDau(newData);
    return { data, error: null };
  } catch (error) {
    console.error('Error in _resetDinhMucDau:', error);
    return { data: null, error: error.message };
  }
};

export const getDinhMucDauCount = async () => {
  try {
    const count = await dinhMucDauDataService.getDinhMucDauCount();
    return { data: count, error: null };
  } catch (error) {
    console.error('Error in getDinhMucDauCount:', error);
    return { data: 0, error: error.message };
  }
};
