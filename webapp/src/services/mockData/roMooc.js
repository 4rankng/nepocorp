// Mock database for RoMooc (Trailers)
// Static data, 15 records. Numeric auto-incrementing ID.
// Fields: id, bien_so, mo_ta, createdAt, updatedAt

let roMoocData = [
  {
    id: 1,
    bien_so: '51R-001.11',
    mo_ta: 'Rơ moóc xương 2 trục 40 feet CIMC',
    createdAt: '2023-01-12T08:00:00Z',
    updatedAt: '2024-05-02T10:00:00Z',
  },
  {
    id: 2,
    bien_so: '51R-002.22',
    mo_ta: 'Rơ moóc sàn 3 trục 45 feet Doosung',
    createdAt: '2023-01-18T09:00:00Z',
    updatedAt: '2024-05-06T11:00:00Z',
  },
  {
    id: 3,
    bien_so: '51R-003.33',
    mo_ta: 'Rơ moóc lùn 3 trục Tân Thanh',
    createdAt: '2023-02-05T10:00:00Z',
    updatedAt: '2024-04-21T12:00:00Z',
  },
  {
    id: 4,
    bien_so: '51R-004.44',
    mo_ta: 'Rơ moóc cổ cò 2 trục 20 feet',
    createdAt: '2023-02-22T11:00:00Z',
    updatedAt: '2024-05-11T13:00:00Z',
  },
  {
    id: 5,
    bien_so: '51R-005.55',
    mo_ta: 'Rơ moóc ben tự đổ 3 trục',
    createdAt: '2023-03-08T12:00:00Z',
    updatedAt: '2024-04-26T14:00:00Z',
  },
  {
    id: 6,
    bien_so: '51R-006.66',
    mo_ta: 'Rơ moóc xương 3 trục 40/45 feet',
    createdAt: '2023-03-15T13:00:00Z',
    updatedAt: '2024-05-16T15:00:00Z',
  },
  {
    id: 7,
    bien_so: '51R-007.77',
    mo_ta: 'Rơ moóc bửng nhôm 2 trục',
    createdAt: '2023-04-03T14:00:00Z',
    updatedAt: '2024-05-01T16:00:00Z',
  },
  {
    id: 8,
    bien_so: '51R-008.88',
    mo_ta: 'Rơ moóc chở xi măng rời 3 trục',
    createdAt: '2023-04-18T15:00:00Z',
    updatedAt: '2024-05-21T17:00:00Z',
  },
  {
    id: 9,
    bien_so: '51R-009.99',
    mo_ta: 'Rơ moóc sàn (thay thế vỏ)',
    createdAt: '2023-05-04T16:00:00Z',
    updatedAt: '2024-05-04T16:00:00Z',
  },
  {
    id: 10,
    bien_so: '51R-010.10',
    mo_ta: 'Rơ moóc container 20 feet (2 trục)',
    createdAt: '2023-05-22T17:00:00Z',
    updatedAt: '2024-05-22T17:00:00Z',
  },
  {
    id: 11,
    bien_so: '51R-111.21',
    mo_ta: 'Rơ moóc xương 3 trục (loại nhẹ)',
    createdAt: '2023-06-03T08:30:00Z',
    updatedAt: '2024-05-04T09:30:00Z',
  },
  {
    id: 12,
    bien_so: '51R-112.23',
    mo_ta: 'Rơ moóc sàn đa năng 40 feet',
    createdAt: '2023-06-12T09:30:00Z',
    updatedAt: '2024-04-29T10:30:00Z',
  },
  {
    id: 13,
    bien_so: '51R-113.34',
    mo_ta: 'Rơ moóc lửng (chở hàng rời)',
    createdAt: '2023-07-07T10:30:00Z',
    updatedAt: '2024-05-13T11:30:00Z',
  },
  {
    id: 14,
    bien_so: '51R-114.45',
    mo_ta: 'Rơ moóc chuyên dụng chở thép cuộn',
    createdAt: '2023-07-18T11:30:00Z',
    updatedAt: '2024-04-23T12:30:00Z',
  },
  {
    id: 15,
    bien_so: '51R-115.56',
    mo_ta: 'Rơ moóc container 45 feet (3 trục)',
    createdAt: '2023-08-03T12:30:00Z',
    updatedAt: '2024-05-19T13:30:00Z',
  },
];

let nextRoMoocId = 16;

export const getAllRoMooc = async () => {
  return [...roMoocData];
};

export const getRoMoocById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return roMoocData.find(rm => rm.id === numericId) || null;
};

export const createRoMooc = async data => {
  const newRoMooc = {
    ...data, // Expects bien_so, mo_ta
    id: nextRoMoocId++,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!data.bien_so || !data.mo_ta) {
    console.error('Missing required fields for new RoMooc:', data);
    return null;
  }
  roMoocData.push(newRoMooc);
  return newRoMooc;
};

export const updateRoMooc = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = roMoocData.findIndex(rm => rm.id === numericId);
  if (index === -1) return null;

  const { id: _, ...validUpdates } = updates;
  roMoocData[index] = {
    ...roMoocData[index],
    ...validUpdates,
    updatedAt: new Date().toISOString(),
  };
  return roMoocData[index];
};

export const deleteRoMooc = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = roMoocData.findIndex(rm => rm.id === numericId);
  if (index === -1) return false;
  roMoocData.splice(index, 1);
  return true;
};

export const _resetRoMooc = (data = []) => {
  roMoocData = data.map((item, index) => ({ ...item, id: index + 1 }));
  nextRoMoocId = roMoocData.length > 0 ? Math.max(...roMoocData.map(rm => rm.id)) + 1 : 1;
};

if (roMoocData.length > 0) {
  nextRoMoocId = Math.max(...roMoocData.map(rm => rm.id)) + 1;
} else {
  nextRoMoocId = 1;
}
