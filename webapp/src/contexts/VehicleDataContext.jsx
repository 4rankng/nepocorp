import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { tractorApi } from '@services/api/tractorApi';
import { trailerApi } from '@services/api/trailerApi';
import { containerApi } from '@services/api/containerApi';

const VehicleDataContext = createContext();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const VehicleDataProvider = ({ children }) => {
  const [tractors, setTractors] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState({
    tractors: false,
    trailers: false,
    containers: false,
    initial: true
  });
  const [errors, setErrors] = useState({
    tractors: null,
    trailers: null,
    containers: null
  });

  const cacheTimestamps = useRef({
    tractors: 0,
    trailers: 0,
    containers: 0
  });

  const isDataStale = useCallback((type) => {
    return Date.now() - cacheTimestamps.current[type] > CACHE_TTL;
  }, []);

  const setError = useCallback((type, error) => {
    setErrors(prev => ({ ...prev, [type]: error }));
  }, []);

  const clearError = useCallback((type) => {
    setErrors(prev => ({ ...prev, [type]: null }));
  }, []);

  const fetchTractors = useCallback(async (force = false) => {
    if (!force && !isDataStale('tractors') && tractors.length > 0) {
      return tractors;
    }

    setLoading(prev => ({ ...prev, tractors: true }));
    clearError('tractors');

    try {
      const response = await tractorApi.getAllWithoutPagination();
      if (response.data.status === 'success') {
        setTractors(response.data.data);
        cacheTimestamps.current.tractors = Date.now();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Lỗi khi tải danh sách đầu kéo');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi tải danh sách đầu kéo';
      setError('tractors', errorMessage);
      console.error('Error fetching tractors:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, tractors: false }));
    }
  }, [tractors, isDataStale, clearError, setError]);

  const fetchTrailers = useCallback(async (force = false) => {
    if (!force && !isDataStale('trailers') && trailers.length > 0) {
      return trailers;
    }

    setLoading(prev => ({ ...prev, trailers: true }));
    clearError('trailers');

    try {
      const response = await trailerApi.getAllWithoutPagination();
      if (response.data.status === 'success') {
        setTrailers(response.data.data);
        cacheTimestamps.current.trailers = Date.now();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Lỗi khi tải danh sách rơ moóc');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi tải danh sách rơ moóc';
      setError('trailers', errorMessage);
      console.error('Error fetching trailers:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, trailers: false }));
    }
  }, [trailers, isDataStale, clearError, setError]);

  const fetchContainers = useCallback(async (force = false) => {
    if (!force && !isDataStale('containers') && containers.length > 0) {
      return containers;
    }

    setLoading(prev => ({ ...prev, containers: true }));
    clearError('containers');

    try {
      const response = await containerApi.getAllWithoutPagination();
      if (response.data.status === 'success') {
        setContainers(response.data.data);
        cacheTimestamps.current.containers = Date.now();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Lỗi khi tải danh sách container');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi tải danh sách container';
      setError('containers', errorMessage);
      console.error('Error fetching containers:', error);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, containers: false }));
    }
  }, [containers, isDataStale, clearError, setError]);

  const fetchAllVehicleData = useCallback(async (force = false) => {
    setLoading(prev => ({ ...prev, initial: true }));
    
    try {
      await Promise.all([
        fetchTractors(force),
        fetchTrailers(force),
        fetchContainers(force)
      ]);
    } catch (error) {
      console.error('Error fetching all vehicle data:', error);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, [fetchTractors, fetchTrailers, fetchContainers]);

  const invalidateCache = useCallback((types = ['tractors', 'trailers', 'containers']) => {
    types.forEach(type => {
      cacheTimestamps.current[type] = 0;
    });
  }, []);

  const refreshCache = useCallback(async (types = ['tractors', 'trailers', 'containers']) => {
    const promises = [];
    
    if (types.includes('tractors')) {
      promises.push(fetchTractors(true));
    }
    if (types.includes('trailers')) {
      promises.push(fetchTrailers(true));
    }
    if (types.includes('containers')) {
      promises.push(fetchContainers(true));
    }

    await Promise.all(promises);
  }, [fetchTractors, fetchTrailers, fetchContainers]);

  const getContainerNames = useCallback(() => {
    return containers.map(container => container.category).filter(Boolean);
  }, [containers]);

  const getTractorNames = useCallback(() => {
    return tractors.map(tractor => tractor.name || tractor.license_plate).filter(Boolean);
  }, [tractors]);

  const getTrailerNames = useCallback(() => {
    return trailers.map(trailer => trailer.name || trailer.license_plate).filter(Boolean);
  }, [trailers]);

  const checkContainerExists = useCallback((name) => {
    if (!name || !name.trim()) return false;
    const containerNames = getContainerNames();
    return containerNames.some(existing => 
      existing.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }, [getContainerNames]);

  const value = {
    // Data
    tractors,
    trailers,
    containers,
    
    // Loading states
    loading,
    
    // Errors
    errors,
    
    // Fetch methods
    fetchTractors,
    fetchTrailers,
    fetchContainers,
    fetchAllVehicleData,
    
    // Cache management
    invalidateCache,
    refreshCache,
    
    // Utility methods
    getContainerNames,
    getTractorNames,
    getTrailerNames,
    checkContainerExists,
    
    // Cache status
    isDataStale
  };

  return (
    <VehicleDataContext.Provider value={value}>
      {children}
    </VehicleDataContext.Provider>
  );
};

export const useVehicleData = () => {
  const context = useContext(VehicleDataContext);
  if (!context) {
    throw new Error('useVehicleData must be used within a VehicleDataProvider');
  }
  return context;
};

export default VehicleDataContext;