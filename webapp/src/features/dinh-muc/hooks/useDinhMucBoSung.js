import { useState, useEffect, useCallback } from 'react';
import { dinhMucBoSungApi } from '@services/api/dinhMucBoSungApi';
import { dauKeoApi } from '@services/mockApi/dauKeoApi';
import { tuyenDuongApi } from '@services/mockApi/tuyenDuongApi';
import logger from '@services/logger';

export const useDinhMucBoSung = () => {
  const [dinhMucBoSungData, setDinhMucBoSungData] = useState([]);
  const [dauKeoList, setDauKeoList] = useState([]);
  const [tuyenDuongList, setTuyenDuongList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dinhMucData, dauKeoData, tuyenData] = await Promise.all([
        dinhMucBoSungApi.getAll(),
        dauKeoApi.getAll(),
        tuyenDuongApi.getAll(),
      ]);
      
      logger.info('API responses:', { dinhMucData, dauKeoData, tuyenData });
      
      // Normalize response shapes: dinhMucBoSungApi returns array directly, others return { data }
      const extractedDinhMucData = Array.isArray(dinhMucData)
        ? dinhMucData
        : dinhMucData.data || [];
      const extractedDauKeoList = dauKeoData.data || [];
      const extractedTuyenDuongList = tuyenData.data || [];
      
      setDinhMucBoSungData(extractedDinhMucData);
      setDauKeoList(extractedDauKeoList);
      setTuyenDuongList(extractedTuyenDuongList);
      
      logger.info('Data extracted from APIs:', {
        dinhMucBoSungData: extractedDinhMucData,
        dauKeoList: extractedDauKeoList,
        tuyenDuongList: extractedTuyenDuongList
      });
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new record
  const createRecord = useCallback(async (data) => {
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
      setDinhMucBoSungData(prev => 
        prev.map(item => item.id === id ? updatedRecord : item)
      );
      return updatedRecord;
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi cập nhật bản ghi');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete record
  const deleteRecord = useCallback(async (id) => {
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

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    dinhMucBoSungData,
    dauKeoList,
    tuyenDuongList,
    isLoading,
    error,
    loadData,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};
