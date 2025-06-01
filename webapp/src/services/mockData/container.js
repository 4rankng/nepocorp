import logger from '@utils/logger';

// Mock database for Container
// Fields: id (number, primary key), ma_so (string, container code), phan_loai (string), createdAt (ISO String), updatedAt (ISO String)
let containerData = [
  {
    id: 1,
    ma_so: 'CONU1234567',
    phan_loai: '20ft DC',
    createdAt: '2023-01-15T09:30:00Z',
    updatedAt: '2024-05-10T14:20:00Z',
  },
  {
    id: 2,
    ma_so: 'NPOU6543210',
    phan_loai: '40ft HC',
    createdAt: '2023-02-20T10:00:00Z',
    updatedAt: '2024-05-11T11:00:00Z',
  },
  {
    id: 3,
    ma_so: 'TEST7890123',
    phan_loai: '45ft HC',
    createdAt: '2023-03-10T08:15:00Z',
    updatedAt: '2024-05-12T09:45:00Z',
  },
  {
    id: 4,
    ma_so: 'DRYU2233445',
    phan_loai: '20ft DC',
    createdAt: '2023-04-01T09:00:00Z',
    updatedAt: '2024-05-13T10:30:00Z',
  },
  {
    id: 5,
    ma_so: 'REEF1122334',
    phan_loai: '40ft REEF',
    createdAt: '2023-04-15T11:00:00Z',
    updatedAt: '2024-05-14T12:00:00Z',
  },
];
let nextContainerId = containerData.length > 0 ? Math.max(...containerData.map(c => c.id)) + 1 : 1;
export const getAllContainer = async () => {
  return [...containerData];
};
export const getContainerById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return containerData.find(c => c.id === numericId) || null;
};
export const getContainerByMaSo = async ma_so => {
  return containerData.find(c => c.ma_so === ma_so) || null;
};
export const createContainer = async data => {
  const { ma_so, phan_loai } = data;
  if (!ma_so || !phan_loai) {
    return null;
  }
  if (typeof ma_so !== 'string' || ma_so.trim() === '') {
    return null;
  }
  if (containerData.some(c => c.ma_so === ma_so)) {
    return null;
  }
  const newContainer = {
    id: nextContainerId++,
    ma_so,
    phan_loai,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  containerData.push(newContainer);
  return newContainer;
};
export const updateContainer = async (id, updates) => {
  // id here is the numeric primary key
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = containerData.findIndex(c => c.id === numericId);
  if (index === -1) return null;
  const existingContainer = containerData[index];
  const { ma_so: new_ma_so, phan_loai: new_phan_loai } = updates;
  try {
    // Check if ma_so is being changed and if the new one already exists (excluding current item)
    if (
      new_ma_so &&
      new_ma_so !== existingContainer.ma_so &&
      containerData.some(c => c.ma_so === new_ma_so && c.id !== numericId)
    ) {
      throw new Error('Duplicate ma_so: already exists in the database');
    }
    const updatedContainer = {
      ...existingContainer,
      ma_so: new_ma_so !== undefined ? new_ma_so : existingContainer.ma_so,
      phan_loai: new_phan_loai !== undefined ? new_phan_loai : existingContainer.phan_loai,
      updatedAt: new Date().toISOString(),
    };
    containerData[index] = updatedContainer;
    return updatedContainer;
  } catch (error) {
    logger.error('Error updating container', { error });
    throw error;
  }
};
export const deleteContainer = async id => {
  // id here is the numeric primary key
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = containerData.findIndex(c => c.id === numericId);
  if (index === -1) return false;
  containerData.splice(index, 1);
  return true;
};
export const _resetContainer = (newData = []) => {
  const validatedData = [];
  const maSoSet = new Set();
  let maxId = 0;
  for (const item of newData) {
    if (
      !item.ma_so ||
      typeof item.ma_so !== 'string' ||
      item.ma_so.trim() === '' ||
      !item.phan_loai
    ) {
      continue;
    }
    if (maSoSet.has(item.ma_so)) {
      continue;
    }
    maSoSet.add(item.ma_so);
    // Use provided id if valid and unique, otherwise generate ensuring it's highest
    let currentId = item.id && typeof item.id === 'number' ? item.id : maxId + 1;
    // Ensure generated ID is truly unique if item.id was not provided or was conflicting
    // This simple maxId + 1 might not be enough if item.id are sparse and unordered.
    // For robust ID generation in reset, one might need to track used IDs if they can be arbitrary.
    // However, for typical auto-increment style, this is okay.
    if (validatedData.some(d => d.id === currentId) && !(item.id && typeof item.id === 'number')) {
      currentId = maxId + 1;
    }
    if (currentId > maxId) maxId = currentId;
    validatedData.push({
      id: currentId,
      ma_so: item.ma_so,
      phan_loai: item.phan_loai,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    });
  }
  containerData = validatedData.sort((a, b) => a.id - b.id); // Sort by ID after regeneration
  nextContainerId = containerData.length > 0 ? Math.max(...containerData.map(c => c.id)) + 1 : 1;
  // Post-reset check for duplicate numeric IDs
  const currentNumericIds = containerData.map(c => c.id);
  const postResetDuplicateNumericIds = currentNumericIds.filter(
    (item, index) => currentNumericIds.indexOf(item) !== index
  );
  if (postResetDuplicateNumericIds.length > 0) {
    logger.warn('Duplicate container IDs found after reset', {
      duplicateIds: postResetDuplicateNumericIds,
    });
  }
  // Post-reset check for duplicate ma_so (should be caught by maSoSet earlier)
  const currentMaSos = containerData.map(c => c.ma_so);
  const postResetDuplicateMaSos = currentMaSos.filter(
    (item, index) => currentMaSos.indexOf(item) !== index
  );
  if (postResetDuplicateMaSos.length > 0) {
    logger.warn('Duplicate container ma_so found after reset', {
      duplicateMaSos: postResetDuplicateMaSos,
    });
  }
};
// Initial check for duplicate ma_so in the seed data
const initialMaSos = containerData.map(c => c.ma_so);
const duplicateMaSos = initialMaSos.filter((item, index) => initialMaSos.indexOf(item) !== index);
if (duplicateMaSos.length > 0) {
  logger.warn('Duplicate ma_so found in container seed data', { duplicateMaSos });
}
// Initial check for duplicate numeric IDs in the seed data
const initialNumericIds = containerData.map(c => c.id);
const duplicateNumericIds = initialNumericIds.filter(
  (item, index) => initialNumericIds.indexOf(item) !== index
);

export const getContainerCount = async () => containerData.length;
