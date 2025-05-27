import { useState } from 'react';

export default function useMaintenanceRecords(api) {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const recordsRes = await api.getAll();
      setMaintenanceRecords(recordsRes.data || []);
      // Extract unique license plates from records
      const licensePlateOptions = Array.from(
        new Set((recordsRes.data || []).map(r => r.licensePlate))
      ).map(plate => ({ id: plate, licensePlate: plate }));
      setLicensePlates(licensePlateOptions);
      setError('');
    } catch (err) {
      setError('Không thể tải dữ liệu bảo dưỡng');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    maintenanceRecords,
    setMaintenanceRecords,
    licensePlates,
    setLicensePlates,
    isLoading,
    error,
    fetchData,
  };
}
