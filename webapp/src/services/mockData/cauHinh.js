// Mock database for CauHinh (Configuration)
// Fields: id (number), key (string), value (string), createdAt, updatedAt

let cauHinhData = [
  {
    id: 1,
    key: "dinh_muc_bo_sung",
    value: "5",
    createdAt: "2023-12-05T11:00:00Z",
    updatedAt: "2024-05-15T09:00:00Z"  
  },
  {
    id: 2,
    key: "company_name",
    value: "Công ty TNHH Vận tải NepoCorp",
    createdAt: "2023-12-05T11:00:00Z",
    updatedAt: "2024-05-15T09:00:00Z"  
  },
  {
    id: 3,
    key: "max_fuel_consumption_alert",
    value: "0.45",
    createdAt: "2023-12-05T11:00:00Z",
    updatedAt: "2024-05-15T09:00:00Z"  
  }
];

let nextCauHinhId = 4;

// Get all configurations
export const getAllCauHinh = async () => {
  return cauHinhData;
};

// Get configuration by ID
export const getCauHinhById = async (id) => {
  const config = cauHinhData.find(ch => ch.id === parseInt(id));
  return config || null;
};

// Get configuration by key
export const getCauHinhByKey = async (key) => {
  const config = cauHinhData.find(ch => ch.key === key);
  return config || null;
};

// Create new configuration
export const createCauHinh = async (data) => {
  const { key, value } = data;
  
  if (!key || value === undefined) {
    throw new Error('Key and value are required');
  }

  // Check if key already exists
  const existing = cauHinhData.find(ch => ch.key === key);
  if (existing) {
    throw new Error(`Configuration with key "${key}" already exists`);
  }

  const newCauHinh = {
    id: nextCauHinhId++,
    key: key.toString(),
    value: value.toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  cauHinhData.push(newCauHinh);
  return newCauHinh;
};

// Update configuration
export const updateCauHinh = async (id, updates) => {
  const index = cauHinhData.findIndex(ch => ch.id === parseInt(id));
  if (index === -1) return null;

  const { id: _, createdAt: __, ...validUpdates } = updates;

  const updatedCauHinh = { ...cauHinhData[index] };

  if (validUpdates.key !== undefined) updatedCauHinh.key = validUpdates.key.toString();
  if (validUpdates.value !== undefined) updatedCauHinh.value = validUpdates.value.toString();

  updatedCauHinh.updatedAt = new Date().toISOString();
  cauHinhData[index] = updatedCauHinh;
  return cauHinhData[index];
};

// Update configuration by key
export const updateCauHinhByKey = async (key, value) => {
  const index = cauHinhData.findIndex(ch => ch.key === key);
  if (index === -1) {
    // Create new configuration if it doesn't exist
    return await createCauHinh({ key, value });
  }

  const updatedCauHinh = { ...cauHinhData[index] };
  updatedCauHinh.value = value.toString();
  updatedCauHinh.updatedAt = new Date().toISOString();
  cauHinhData[index] = updatedCauHinh;
  return cauHinhData[index];
};

// Delete configuration
export const deleteCauHinh = async (id) => {
  const index = cauHinhData.findIndex(ch => ch.id === parseInt(id));
  if (index === -1) return false;
  cauHinhData.splice(index, 1);
  return true;
};

// Reset configuration data (for testing)
export const _resetCauHinh = (data = []) => {
  cauHinhData = data.map((item, index) => ({
    ...item,
    id: item.id || (index + 1),
  }));
  nextCauHinhId = cauHinhData.length > 0 
    ? Math.max(...cauHinhData.map(ch => ch.id)) + 1 
    : 1;
};

// Initialize nextCauHinhId based on existing data
if (cauHinhData.length > 0) {
  const maxId = Math.max(...cauHinhData.map(ch => ch.id));
  nextCauHinhId = maxId + 1;
}

console.log('CauHinh Mock Data Service loaded and configured.');
