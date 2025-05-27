// Mock database for Container
// Fields: id (string, container number), phan_loai (string), createdAt (ISO String), updatedAt (ISO String)

const containerData = [
  {
    id: 1,
    phan_loai: '20ft DC',
    createdAt: '2023-01-15T09:30:00Z',
    updatedAt: '2024-05-10T14:20:00Z',
  },
  {
    id: 2,
    phan_loai: '40ft HC',
    createdAt: '2023-02-20T10:00:00Z',
    updatedAt: '2024-05-11T11:00:00Z',
  },
  {
    id: 3,
    phan_loai: '45ft HC',
    createdAt: '2023-03-10T08:15:00Z',
    updatedAt: '2024-05-12T09:45:00Z',
  },
];

export default containerData;

export const getAllContainer = async () => {
  return [...containerData];
};

export const getContainerById = async id => {
  if (typeof id !== 'string') {
    // console.warn(`getContainerById: ID should be a string, received ${typeof id}. Attempting to cast.`);
  }
  return containerData.find(c => c.id === String(id)) || null;
};

export const createContainer = async data => {
  const { id, phan_loai } = data;
  if (!id || !phan_loai) {
    console.error('Missing required fields for new Container (id, phan_loai):', data);
    return null;
  }
  if (typeof id !== 'string' || id.trim() === '') {
    console.error('Container ID must be a non-empty string:', id);
    return null;
  }
  if (containerData.some(c => c.id === id)) {
    console.error('Container with this ID already exists:', id);
    return null;
  }

  const newContainer = {
    id,
    phan_loai,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  containerData.push(newContainer);
  return newContainer;
};

export const updateContainer = async (id, updates) => {
  if (typeof id !== 'string') {
    // console.warn(`updateContainer: ID should be a string, received ${typeof id}. Attempting to cast.`);
  }
  const sId = String(id);
  const index = containerData.findIndex(c => c.id === sId);
  if (index === -1) return null;

  const { id: newIdAttempt, createdAt: _, ...validUpdates } = updates;

  if (newIdAttempt && newIdAttempt !== sId) {
    console.error(
      'Cannot change container ID during update. Original ID:',
      sId,
      'Attempted new ID:',
      newIdAttempt
    );
    return null;
  }

  const updatedContainer = { ...containerData[index] };

  if (validUpdates.phan_loai !== undefined) {
    updatedContainer.phan_loai = validUpdates.phan_loai;
  }

  updatedContainer.updatedAt = new Date().toISOString();
  containerData[index] = updatedContainer;
  return containerData[index];
};

export const deleteContainer = async id => {
  if (typeof id !== 'string') {
    // console.warn(`deleteContainer: ID should be a string, received ${typeof id}. Attempting to cast.`);
  }
  const sId = String(id);
  const index = containerData.findIndex(c => c.id === sId);
  if (index === -1) return false;
  containerData.splice(index, 1);
  return true;
};

export const _resetContainer = (data = []) => {
  containerData.length = 0;
  data.forEach(item => {
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '' || !item.phan_loai) {
      console.warn('Skipping invalid item during _resetContainer:', item);
      return;
    }
    containerData.push({
      id: item.id,
      phan_loai: item.phan_loai,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    });
  });

  // Post-reset check for duplicates
  const currentIds = containerData.map(c => c.id);
  const postResetDuplicateIds = currentIds.filter(
    (item, index) => currentIds.indexOf(item) !== index
  );
  if (postResetDuplicateIds.length > 0) {
    console.error('CRITICAL: Duplicate IDs found after _resetContainer:', postResetDuplicateIds);
    // Potentially throw an error or clear data to prevent inconsistent state
  }
};

// Initial check for duplicate IDs in the seed data
const initialIds = containerData.map(c => c.id);
const duplicateIds = initialIds.filter((item, index) => initialIds.indexOf(item) !== index);
if (duplicateIds.length > 0) {
  console.error('CRITICAL: Duplicate IDs found in initial containerData:', duplicateIds);
}

export const getContainerCount = async () => containerData.length;
