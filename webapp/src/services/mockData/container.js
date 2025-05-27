// Mock database for Container
// Fields: id (string, container number), phan_loai (string), createdAt (ISO String), updatedAt (ISO String)

let containerData = [
  { id: 'CSNU6879155', phan_loai: '20ft DC', createdAt: '2023-01-01T08:00:00Z', updatedAt: '2024-05-01T08:00:00Z' },
  { id: 'MSKU1234560', phan_loai: '40ft HC', createdAt: '2023-01-15T09:30:00Z', updatedAt: '2024-05-02T09:30:00Z' },
  { id: 'CMAU7890123', phan_loai: '20ft RF (Reefer)', createdAt: '2023-02-01T10:00:00Z', updatedAt: '2024-04-20T10:00:00Z' },
  { id: 'GESU2345671', phan_loai: '40ft OT (Open Top)', createdAt: '2023-02-15T11:30:00Z', updatedAt: '2024-05-10T11:30:00Z' },
  { id: 'APZU3456782', phan_loai: '20ft FR (Flat Rack)', createdAt: '2023-03-01T12:00:00Z', updatedAt: '2024-04-25T12:00:00Z' },
  { id: 'TCKU4567893', phan_loai: '45ft HC PW (Pallet Wide)', createdAt: '2023-03-15T13:30:00Z', updatedAt: '2024-05-15T13:30:00Z' },
  { id: 'SEGU5678904', phan_loai: '20ft ISO Tank', createdAt: '2023-04-01T14:00:00Z', updatedAt: '2024-05-05T14:00:00Z' },
  { id: 'UACU6789015', phan_loai: '40ft Double Door', createdAt: '2023-04-15T15:30:00Z', updatedAt: '2024-05-20T15:30:00Z' },
  { id: 'OOLU7890126', phan_loai: '20ft Hard Top', createdAt: '2023-05-01T16:00:00Z', updatedAt: '2024-05-01T16:00:00Z' },
  { id: 'SUDU8901237', phan_loai: '40ft Reefer HC', createdAt: '2023-05-15T17:30:00Z', updatedAt: '2024-05-15T17:30:00Z' },
  { id: 'HLXU9012348', phan_loai: '20ft Ventilated', createdAt: '2023-06-01T08:45:00Z', updatedAt: '2024-05-08T08:45:00Z' },
  { id: 'TRLU0123459', phan_loai: '40ft Flat Rack Collapsible', createdAt: '2023-06-15T09:15:00Z', updatedAt: '2024-04-28T09:15:00Z' },
  { id: 'FCIU1234500', phan_loai: '20ft Bulk', createdAt: '2023-07-01T10:45:00Z', updatedAt: '2024-05-12T10:45:00Z' },
  { id: 'BEAU2345011', phan_loai: '40ft Platform', createdAt: '2023-07-15T11:15:00Z', updatedAt: '2024-04-22T11:15:00Z' },
  { id: 'CAIU3450122', phan_loai: '10ft GP', createdAt: '2023-08-01T12:45:00Z', updatedAt: '2024-05-18T12:45:00Z' }
];

export const getAllContainer = async () => {
  return [...containerData];
};

export const getContainerById = async (id) => {
  if (typeof id !== 'string') {
    // console.warn(`getContainerById: ID should be a string, received ${typeof id}. Attempting to cast.`);
  }
  return containerData.find(c => c.id === String(id)) || null;
};

export const createContainer = async (data) => {
  const { id, phan_loai } = data;
  if (!id || !phan_loai) {
    console.error("Missing required fields for new Container (id, phan_loai):", data);
    return null;
  }
  if (typeof id !== 'string' || id.trim() === '') {
     console.error("Container ID must be a non-empty string:", id);
     return null;
  }
  if (containerData.some(c => c.id === id)) {
    console.error("Container with this ID already exists:", id);
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
      console.error("Cannot change container ID during update. Original ID:", sId, "Attempted new ID:", newIdAttempt);
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

export const deleteContainer = async (id) => {
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
  containerData = data.map(item => {
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '' || !item.phan_loai) {
        console.warn("Skipping invalid item during _resetContainer:", item);
        return null; 
    }
    return {
        id: item.id,
        phan_loai: item.phan_loai,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
    };
  }).filter(item => item !== null);
  
  // Post-reset check for duplicates
  const currentIds = containerData.map(c => c.id);
  const postResetDuplicateIds = currentIds.filter((item, index) => currentIds.indexOf(item) !== index);
  if (postResetDuplicateIds.length > 0) {
      console.error("CRITICAL: Duplicate IDs found after _resetContainer:", postResetDuplicateIds);
      // Potentially throw an error or clear data to prevent inconsistent state
  }
};

// Initial check for duplicate IDs in the seed data
const initialIds = containerData.map(c => c.id);
const duplicateIds = initialIds.filter((item, index) => initialIds.indexOf(item) !== index);
if (duplicateIds.length > 0) {
    console.error("CRITICAL: Duplicate IDs found in initial containerData:", duplicateIds);
}
