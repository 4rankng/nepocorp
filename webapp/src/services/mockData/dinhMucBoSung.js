// Mock database for DinhMucBoSung (Supplementary Fuel Standards)
// Fields: id (number), bien_so (string, nullable - links to dauKeo.bien_so), ma_tuyen (string, nullable - links to tuyenDuong.ma_so), dinh_muc_l (number), createdAt (ISO String), updatedAt (ISO String)

// Helper function to ensure unique numeric IDs
const ensureUniqueIds = data => {
  const usedIds = new Set();
  let nextId = 1;
  return data.map(item => {
    while (usedIds.has(nextId)) {
      nextId++;
    }
    usedIds.add(nextId);
    return { ...item, id: nextId++ };
  });
};

let dinhMucBoSungData = ensureUniqueIds([
  {
    bien_so: '51C-001.01',
    ma_tuyen: 'TD001',
    dinh_muc_l: 15.0,
    createdAt: '2023-01-01T08:00:00Z',
    updatedAt: '2023-01-01T08:00:00Z',
  },
  {
    bien_so: '29H-111.22',
    ma_tuyen: 'TD002',
    dinh_muc_l: 12.5,
    createdAt: '2023-01-02T08:00:00Z',
    updatedAt: '2023-01-02T08:00:00Z',
  },
  {
    bien_so: null, // Apply to all vehicles
    ma_tuyen: 'TD003',
    dinh_muc_l: 20.0,
    createdAt: '2023-01-03T08:00:00Z',
    updatedAt: '2023-01-03T08:00:00Z',
  },
  {
    bien_so: '60A-222.33',
    ma_tuyen: null, // Apply to all routes
    dinh_muc_l: 18.0,
    createdAt: '2023-01-04T08:00:00Z',
    updatedAt: '2023-01-04T08:00:00Z',
  },
  {
    bien_so: null, // Apply to all vehicles
    ma_tuyen: null, // Apply to all routes
    dinh_muc_l: 25.0,
    createdAt: '2023-01-05T08:00:00Z',
    updatedAt: '2023-01-05T08:00:00Z',
  },
  {
    bien_so: '51C-333.44',
    ma_tuyen: 'TD004',
    dinh_muc_l: 14.0,
    createdAt: '2023-01-06T08:00:00Z',
    updatedAt: '2023-01-06T08:00:00Z',
  },
  {
    bien_so: '29H-444.55',
    ma_tuyen: 'TD005',
    dinh_muc_l: 16.5,
    createdAt: '2023-01-07T08:00:00Z',
    updatedAt: '2023-01-07T08:00:00Z',
  },
]);

// CRUD Operations
const getDinhMucBoSung = () => {
  return [...dinhMucBoSungData];
};

const getDinhMucBoSungById = id => {
  return dinhMucBoSungData.find(item => item.id === id) || null;
};

const createDinhMucBoSung = data => {
  // Generate new ID
  const maxId = dinhMucBoSungData.reduce((max, item) => Math.max(max, item.id), 0);
  const newId = maxId + 1;

  const now = new Date().toISOString();
  const newItem = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  dinhMucBoSungData.push(newItem);
  return newItem;
};

const updateDinhMucBoSung = (id, updates) => {
  const index = dinhMucBoSungData.findIndex(item => item.id === id);
  if (index === -1) {
    throw new Error('DinhMucBoSung not found');
  }

  const updatedItem = {
    ...dinhMucBoSungData[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  dinhMucBoSungData[index] = updatedItem;
  return updatedItem;
};

const deleteDinhMucBoSung = id => {
  const index = dinhMucBoSungData.findIndex(item => item.id === id);
  if (index === -1) {
    throw new Error('DinhMucBoSung not found');
  }

  const deletedItem = dinhMucBoSungData[index];
  dinhMucBoSungData.splice(index, 1);
  return deletedItem;
};

export {
  getDinhMucBoSung,
  getDinhMucBoSungById,
  createDinhMucBoSung,
  updateDinhMucBoSung,
  deleteDinhMucBoSung,
};
