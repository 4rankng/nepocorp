import { useState, useEffect, useCallback } from 'react';
import * as dinhMucDiDuongApi from '@services/mockApi/dinhMucDiDuongApi'; // Assuming named export or default
import * as tuyenDuongApi from '@services/mockApi/tuyenDuongApi'; // Assuming named export or default
import { containerApi } from '@services/mockApi/containerApi'; // Already confirmed this structure

const useDinhMucDiDuong = () => {
  const [roadNorms, setRoadNorms] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Correctly awaiting the promises from API calls
      const [dinhMucRes, tuyenDuongRes, containerRes] = await Promise.all([
        dinhMucDiDuongApi.getAllDinhMucDiDuong(), // Ensure this is the correct function name
        tuyenDuongApi.getAllTuyenDuong(), // Ensure this is the correct function name
        containerApi.getAll(),
      ]);

      // Error handling for individual API calls
      if (dinhMucRes.error) throw new Error(`Failed to fetch road norms: ${dinhMucRes.error}`);
      if (tuyenDuongRes.error) throw new Error(`Failed to fetch routes: ${tuyenDuongRes.error}`);
      // containerApi.getAll() itself throws or returns data directly based on its structure
      // Assuming containerRes is the data array directly if no error, or an object with .error
      if (containerRes.error)
        throw new Error(`Failed to fetch container types: ${containerRes.error}`);

      const allDinhMuc = dinhMucRes.data || [];
      const allTuyenDuong = tuyenDuongRes.data || [];
      const allContainerTypes = containerRes.data || containerRes; // Adjust if containerRes has a .data property

      // Process container types for table headers
      const validContainerTypes = allContainerTypes.filter(
        ct => ct && ct.ma_loai_container != null
      );
      const uniqueContainerTypes = Array.from(
        new Map(
          validContainerTypes.map(ct => [
            String(ct.ma_loai_container), // Key for Map
            {
              ma_loai_container: String(ct.ma_loai_container), // Ensure string for React key later
              ten_loai_container: ct.ten_loai_container,
            },
          ])
        ).values()
      );
      setContainerTypes(uniqueContainerTypes);

      // Create a map for quick lookup of route names
      const tuyenDuongMap = new Map();
      allTuyenDuong.forEach(td => {
        tuyenDuongMap.set(td.ma_tuyen_duong, td.ten_tuyen_duong);
      });

      // Group norms by route and then by container type
      const validDinhMuc = allDinhMuc.filter(norm => norm && norm.ma_tuyen_duong != null);

      const groupedNorms = validDinhMuc.reduce((acc, norm) => {
        const routeIdKey = String(norm.ma_tuyen_duong); // Use string for object key and React key
        if (!acc[routeIdKey]) {
          acc[routeIdKey] = {
            routeId: routeIdKey, // Store as string
            // Use original norm.ma_tuyen_duong for map lookup if its type differs from string version
            routeName: tuyenDuongMap.get(norm.ma_tuyen_duong) || 'Không rõ tuyến',
            norms: {},
          };
        }
        // Ensure ma_loai_container used as a key in norms object is also a string
        if (norm.ma_loai_container != null) {
          acc[routeIdKey].norms[String(norm.ma_loai_container)] = norm.dinh_muc;
        }
        return acc;
      }, {});

      setRoadNorms(Object.values(groupedNorms));
    } catch (err) {
      console.error('Error fetching road norm data:', err);
      setError(err.message);
      setRoadNorms([]);
      setContainerTypes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { roadNorms, containerTypes, isLoading, error, refetch: fetchData };
};

export default useDinhMucDiDuong;
