import { useState } from 'react';
export default function useLopXeRecords(api) {
  const [lopXeRecords, setLopXeRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const recordsRes = await api.getAll();
      setLopXeRecords(recordsRes.data || []);
      // Extract unique license plates from records
      const licensePlateOptions = Array.from(
        new Set((recordsRes.data || []).map(r => r.licensePlate))
      ).map(plate => ({ id: plate, licensePlate: plate }));
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
    lopXeRecords,
    setLopXeRecords,
    licensePlates,
    setLicensePlates,
    isLoading,
    error,
    fetchData,
  };
}
