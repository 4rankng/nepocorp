import { useState, useEffect, useCallback, useMemo } from 'react';
import { dinhMucBoSungApi } from '@services/api/dinhMucBoSungApi';
import { tractorApi } from '@services/api/tractorApi';

// Use real API for tractor data
const dauKeoApi = tractorApi;
import logger from '@services/logger';

export const useDinhMucBoSung = () => {
  const [dinhMucBoSungData, setDinhMucBoSungData] = useState([]);
  const [dauKeoList, setDauKeoList] = useState([]);
  const [tuyenDuongList, setTuyenDuongList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlate, setSelectedPlate] = useState('');

  // Load data based on selected plate
  const loadData = useCallback(async (plate = '') => {
    setIsLoading(true);
    setError(null);
    try {
      // Load dauKeo data
      const dauKeoData = await dauKeoApi.getAll();

      // Load dinhMucBoSung with plate filter if provided
      let dinhMucData;
      if (plate) {
        dinhMucData = await dinhMucBoSungApi.getByBienSo(plate);
      } else {
        dinhMucData = await dinhMucBoSungApi.getAll();
      }

      // Normalize response shapes
      const extractedDinhMucData = Array.isArray(dinhMucData)
        ? dinhMucData
        : dinhMucData?.data || [];
      const extractedDauKeoList = dauKeoData.data || [];
      const extractedTuyenDuongList = tuyenData.data || [];

      setDinhMucBoSungData(extractedDinhMucData);
      setDauKeoList(extractedDauKeoList);
      setTuyenDuongList(extractedTuyenDuongList);

    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new record
  const createRecord = useCallback(async data => {
    setIsLoading(true);
    setError(null);
    try {
      const newRecord = await dinhMucBoSungApi.create(data);
      setDinhMucBoSungData(prev => [...prev, newRecord]);
      return newRecord;
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi tạo bản ghi');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update existing record
  const updateRecord = useCallback(async (id, data) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedRecord = await dinhMucBoSungApi.update(id, data);
      setDinhMucBoSungData(prev => prev.map(item => (item.id === id ? updatedRecord : item)));
      return updatedRecord;
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi cập nhật bản ghi');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete record
  const deleteRecord = useCallback(async id => {
    setIsLoading(true);
    setError(null);
    try {
      await dinhMucBoSungApi.delete(id);
      setDinhMucBoSungData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi xóa bản ghi');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle plate selection change
  const handlePlateChange = useCallback(
    async plate => {
      setSelectedPlate(plate);
      await loadData(plate);
    },
    [loadData]
  );

  // Load initial data
  useEffect(() => {
    loadData('');
  }, [loadData]);

  // Get unique license plates from dauKeoList
  const licensePlates = useMemo(() => {
    if (!dauKeoList || !Array.isArray(dauKeoList)) return [];

    // Extract unique license plates from dauKeoList
    const plates = new Set();
    dauKeoList.forEach(dauKeo => {
      if (dauKeo.bien_so) {
        plates.add(dauKeo.bien_so);
      }
    });

    return Array.from(plates).map(plate => ({
      id: plate,
      bien_so: plate,
    }));
  }, [dauKeoList]);

  return {
    dinhMucBoSungData,
    dauKeoList,
    tuyenDuongList,
    isLoading,
    error,
    selectedPlate,
    handlePlateChange,
    licensePlates,
    loadData: () => loadData(selectedPlate),
    createRecord,
    updateRecord,
    deleteRecord,
  };
};
