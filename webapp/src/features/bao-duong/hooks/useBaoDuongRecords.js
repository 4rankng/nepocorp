import { useState } from 'react';
export default function useBaoDuongRecords(api) {
  const [baoDuongRecords, setBaoDuongRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all records by using a large page size
      const recordsRes = await api.getAll(1, 1000);
      setBaoDuongRecords(recordsRes.data || []);
      // Extract unique license plates from records (use bien_so)
      const licensePlateOptions = Array.from(
        new Set((recordsRes.data || []).map(r => r.bien_so))
      ).map(plate => ({ id: plate, bien_so: plate }));
      setLicensePlates(licensePlateOptions);
      setError('');
    } catch (err) {
      setError('Không thể tải dữ liệu lốp xe');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  return {
    baoDuongRecords,
    setBaoDuongRecords,
    licensePlates,
    setLicensePlates,
    isLoading,
    error,
    fetchData,
  };
}
