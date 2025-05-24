// Cost rates management mock data and functions

let costRatesData = [
  { id: 'cr1', description: 'Nội thành TP.HCM', kmMin: 0, kmMax: 50, rate: 15000 },
  { id: 'cr2', description: 'Liên tỉnh gần', kmMin: 51, kmMax: 100, rate: 12000 },
  { id: 'cr3', description: 'Liên tỉnh xa', kmMin: 101, kmMax: 300, rate: 10000 },
  { id: 'cr4', description: 'Liên vùng', kmMin: 301, kmMax: 1000, rate: 8000 },
];

// Cost rate functions
export const getCostRates = () => new Promise(res => setTimeout(() => res([...costRatesData]), 50));

const validateCostRateData = (data, id = null) => {
  if (!data.description || data.description.trim() === '') return 'Mô tả không được để trống.';
  if (!data.kmMin && data.kmMin !== 0) return 'Km tối thiểu không được để trống.';
  if (!data.kmMax) return 'Km tối đa không được để trống.';
  if (!data.rate) return 'Đơn giá không được để trống.';

  if (parseFloat(data.kmMin) >= parseFloat(data.kmMax))
    return 'Km tối đa phải lớn hơn km tối thiểu.';

  // Check for overlapping ranges
  const min = parseFloat(data.kmMin);
  const max = parseFloat(data.kmMax);
  const overlapping = costRatesData.some(item => {
    if (item.id === id) return false; // Skip current item when editing
    return (
      (min >= item.kmMin && min < item.kmMax) ||
      (max > item.kmMin && max <= item.kmMax) ||
      (min <= item.kmMin && max >= item.kmMax)
    );
  });

  if (overlapping) {
    return 'Khoảng km này đã được định nghĩa.';
  }

  return null;
};

export const addCostRate = data =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateCostRateData(data);
      if (err) reject(new Error(err));
      else {
        const newRate = {
          id: String(Date.now()),
          description: data.description.trim(),
          kmMin: Number(data.kmMin),
          kmMax: Number(data.kmMax),
          rate: Number(data.rate),
        };
        costRatesData.push(newRate);
        resolve(newRate);
      }
    }, 50)
  );

export const updateCostRate = (id, data) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateCostRateData(data, id);
      if (err) reject(new Error(err));
      else {
        let updatedRate = null;
        costRatesData = costRatesData.map(item =>
          item.id === id
            ? (updatedRate = {
                id,
                description: data.description.trim(),
                kmMin: Number(data.kmMin),
                kmMax: Number(data.kmMax),
                rate: Number(data.rate),
              })
            : item
        );
        if (updatedRate) resolve(updatedRate);
        else reject(new Error('Không tìm thấy định mức chi phí'));
      }
    }, 50)
  );

export const deleteCostRate = id =>
  new Promise(resolve => {
    costRatesData = costRatesData.filter(r => r.id !== id);
    resolve({ id });
  });
