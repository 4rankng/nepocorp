// Mock database for DauKeo (Tractor Units)
// Static data, 15 records. Numeric auto-incrementing ID.
// Fields: id, bien_so, mo_ta, createdAt, updatedAt
let dauKeoData = [
  {
    id: 1,
    bien_so: '51C-001.01',
    lai_xe: 'NV004',
    mo_ta: 'Đầu kéo Hino Series 500',
    createdAt: '2023-01-10T08:00:00Z',
    updatedAt: '2024-05-01T10:00:00Z',
  },
  {
    id: 2,
    bien_so: '29H-111.22',
    lai_xe: 'NV005',
    mo_ta: 'Đầu kéo Hyundai Xcient',
    createdAt: '2023-01-15T09:00:00Z',
    updatedAt: '2024-05-05T11:00:00Z',
  },
  {
    id: 3,
    bien_so: '60A-222.33',
    lai_xe: 'NV006',
    mo_ta: 'Đầu kéo Fuso Tractor FV',
    createdAt: '2023-02-01T10:00:00Z',
    updatedAt: '2024-04-20T12:00:00Z',
  },
  {
    id: 4,
    bien_so: '51C-333.44',
    lai_xe: 'NV007',
    mo_ta: 'Đầu kéo Isuzu Giga',
    createdAt: '2023-02-20T11:00:00Z',
    updatedAt: '2024-05-10T13:00:00Z',
  },
  {
    id: 5,
    bien_so: '29H-444.55',
    lai_xe: 'NV008',
    mo_ta: 'Đầu kéo Daewoo Novus',
    createdAt: '2023-03-05T12:00:00Z',
    updatedAt: '2024-04-25T14:00:00Z',
  },
  {
    id: 6,
    bien_so: '60A-555.66',
    lai_xe: null,
    mo_ta: 'Đầu kéo Chenglong H7',
    createdAt: '2023-03-10T13:00:00Z',
    updatedAt: '2024-05-15T15:00:00Z',
  },
  {
    id: 7,
    bien_so: '51C-666.77',
    lai_xe: null,
    mo_ta: 'Đầu kéo Howo A7',
    createdAt: '2023-04-01T14:00:00Z',
    updatedAt: '2024-04-30T16:00:00Z',
  },
  {
    id: 8,
    bien_so: '29H-777.88',
    lai_xe: 'NV015',
    mo_ta: 'Đầu kéo Shacman X3000',
    createdAt: '2023-04-15T15:00:00Z',
    updatedAt: '2024-05-20T17:00:00Z',
  },
  {
    id: 9,
    bien_so: '60A-888.99',
    lai_xe: null,
    mo_ta: 'Đầu kéo Dongfeng Hoàng Huy',
    createdAt: '2023-05-02T16:00:00Z',
    updatedAt: '2024-05-02T16:00:00Z',
  },
  {
    id: 10,
    bien_so: '51C-999.00',
    lai_xe: 'NV004',
    mo_ta: 'Đầu kéo JAC A5',
    createdAt: '2023-05-20T17:00:00Z',
    updatedAt: '2024-05-20T17:00:00Z',
  }, // Assuming NV004 can drive multiple trucks or re-assigned
  {
    id: 11,
    bien_so: '29H-001.12',
    lai_xe: 'NV005',
    mo_ta: 'Đầu kéo Volvo FH16',
    createdAt: '2023-06-01T08:30:00Z',
    updatedAt: '2024-05-03T09:30:00Z',
  },
  {
    id: 12,
    bien_so: '60A-112.23',
    lai_xe: null,
    mo_ta: 'Đầu kéo Scania R-series',
    createdAt: '2023-06-10T09:30:00Z',
    updatedAt: '2024-04-28T10:30:00Z',
  },
  {
    id: 13,
    bien_so: '51C-223.34',
    lai_xe: 'NV006',
    mo_ta: 'Đầu kéo MAN TGX',
    createdAt: '2023-07-05T10:30:00Z',
    updatedAt: '2024-05-12T11:30:00Z',
  },
  {
    id: 14,
    bien_so: '29H-334.45',
    lai_xe: null,
    mo_ta: 'Đầu kéo Iveco Stralis',
    createdAt: '2023-07-15T11:30:00Z',
    updatedAt: '2024-04-22T12:30:00Z',
  },
  {
    id: 15,
    bien_so: '60A-445.56',
    lai_xe: 'NV007',
    mo_ta: 'Đầu kéo Kenworth W900',
    createdAt: '2023-08-01T12:30:00Z',
    updatedAt: '2024-05-18T13:30:00Z',
  },
];
let nextDauKeoId = 16;
export const getAllDauKeo = async () => {
  return [...dauKeoData];
};
export const getDauKeoById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return dauKeoData.find(dk => dk.id === numericId) || null;
};
export const createDauKeo = async data => {
  const newDauKeo = {
    ...data, // Expects bien_so, mo_ta, and optionally lai_xe
    id: nextDauKeoId++,
    lai_xe: data.lai_xe || null, // Add lai_xe, default to null if not provided
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!data.bien_so || !data.mo_ta) {

    return null;
  }
  dauKeoData.push(newDauKeo);
  return newDauKeo;
};
export const updateDauKeo = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = dauKeoData.findIndex(dk => dk.id === numericId);
  if (index === -1) return null;
  const { id: _, ...validUpdates } = updates;
  dauKeoData[index] = {
    ...dauKeoData[index],
    ...validUpdates,
    updatedAt: new Date().toISOString(),
  };
  return dauKeoData[index];
};
export const deleteDauKeo = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = dauKeoData.findIndex(dk => dk.id === numericId);
  if (index === -1) return false;
  dauKeoData.splice(index, 1);
  return true;
};
export const _resetDauKeo = (data = []) => {
  dauKeoData = data.map((item, index) => ({ ...item, id: index + 1 }));
  nextDauKeoId = dauKeoData.length > 0 ? Math.max(...dauKeoData.map(dk => dk.id)) + 1 : 1;
};
export const getDauKeoCount = async () => dauKeoData.length;
if (dauKeoData.length > 0) {
  nextDauKeoId = Math.max(...dauKeoData.map(dk => dk.id)) + 1;
} else {
  nextDauKeoId = 1;
}
