// Mock database for DinhMuc (Fuel Standards)
// Fields: id (number), bienSoXe, phan_loai ('km_hang' | 'km_vo'), tuKm, denKm, l_km, ghiChu, createdAt, updatedAt

// Helper function to ensure unique numeric IDs
const ensureUniqueIds = (data) => {
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

let dinhMucData = ensureUniqueIds([
  // 51C-001.01 - Hino Series 500
  {
    bienSoXe: '51C-001.01',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 100000,
    l_km: 0.35,
    ghiChu: 'Hino Series 500 - Mới (có hàng)',
    createdAt: '2023-01-01T08:00:00Z',
    updatedAt: '2024-05-01T08:00:00Z',
  },
  {
    bienSoXe: '51C-001.01',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 100000,
    l_km: 0.30,
    ghiChu: 'Hino Series 500 - Mới (không hàng)',
    createdAt: '2023-01-01T08:00:00Z',
    updatedAt: '2024-05-01T08:00:00Z',
  },
  // 29H-111.22 - Hyundai Xcient
  {
    bienSoXe: '29H-111.22',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 150000,
    l_km: 0.38,
    ghiChu: 'Hyundai Xcient - Mới (có hàng)',
    createdAt: '2023-02-10T09:00:00Z',
    updatedAt: '2024-04-15T09:00:00Z',
  },
  {
    bienSoXe: '29H-111.22',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 150000,
    l_km: 0.32,
    ghiChu: 'Hyundai Xcient - Mới (không hàng)',
    createdAt: '2023-02-10T09:05:00Z',
    updatedAt: '2024-04-15T09:05:00Z',
  },
  // 60A-222.33 - Fuso Tractor FV
  {
    bienSoXe: '60A-222.33',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 120000,
    l_km: 0.36,
    ghiChu: 'Fuso Tractor FV - Mới (có hàng)',
    createdAt: '2023-03-15T10:00:00Z',
    updatedAt: '2024-05-10T10:00:00Z',
  },
  {
    bienSoXe: '60A-222.33',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 120000,
    l_km: 0.31,
    ghiChu: 'Fuso Tractor FV - Mới (không hàng)',
    createdAt: '2023-03-15T10:05:00Z',
    updatedAt: '2024-05-10T10:05:00Z',
  },
  // 51C-333.44 - Isuzu Giga
  {
    bienSoXe: '51C-333.44',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 100000,
    l_km: 0.37,
    ghiChu: 'Isuzu Giga - Mới (có hàng)',
    createdAt: '2023-04-01T11:00:00Z',
    updatedAt: '2024-05-12T11:00:00Z',
  },
  {
    bienSoXe: '51C-333.44',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 100000,
    l_km: 0.33,
    ghiChu: 'Isuzu Giga - Mới (không hàng)',
    createdAt: '2023-04-01T11:05:00Z',
    updatedAt: '2024-05-12T11:05:00Z',
  },
  // 29H-444.55 - Daewoo Novus
  {
    bienSoXe: '29H-444.55',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 130000,
    l_km: 0.39,
    ghiChu: 'Daewoo Novus - Mới (có hàng)',
    createdAt: '2023-05-20T14:00:00Z',
    updatedAt: '2024-05-20T14:00:00Z',
  },
  {
    bienSoXe: '29H-444.55',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 130000,
    l_km: 0.34,
    ghiChu: 'Daewoo Novus - Mới (không hàng)',
    createdAt: '2023-05-20T14:05:00Z',
    updatedAt: '2024-05-20T14:05:00Z',
  },
  // 60A-555.66 - Chenglong H7
  {
    bienSoXe: '60A-555.66',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 110000,
    l_km: 0.36,
    ghiChu: 'Chenglong H7 - Mới (có hàng)',
    createdAt: '2023-06-10T08:00:00Z',
    updatedAt: '2024-05-01T08:30:00Z',
  },
  {
    bienSoXe: '60A-555.66',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 110000,
    l_km: 0.31,
    ghiChu: 'Chenglong H7 - Mới (không hàng)',
    createdAt: '2023-06-10T08:05:00Z',
    updatedAt: '2024-05-01T08:35:00Z',
  },
  // 51C-666.77 - Howo A7
  {
    bienSoXe: '51C-666.77',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 120000,
    l_km: 0.37,
    ghiChu: 'Howo A7 - Mới (có hàng)',
    createdAt: '2023-07-15T09:00:00Z',
    updatedAt: '2024-04-15T09:30:00Z',
  },
  {
    bienSoXe: '51C-666.77',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 120000,
    l_km: 0.32,
    ghiChu: 'Howo A7 - Mới (không hàng)',
    createdAt: '2023-07-15T09:05:00Z',
    updatedAt: '2024-04-15T09:35:00Z',
  },
  // 29H-777.88 - Shacman X3000
  {
    bienSoXe: '29H-777.88',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 140000,
    l_km: 0.38,
    ghiChu: 'Shacman X3000 - Mới (có hàng)',
    createdAt: '2023-08-01T10:00:00Z',
    updatedAt: '2024-05-10T10:30:00Z',
  },
  {
    bienSoXe: '29H-777.88',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 140000,
    l_km: 0.33,
    ghiChu: 'Shacman X3000 - Mới (không hàng)',
    createdAt: '2023-08-01T10:05:00Z',
    updatedAt: '2024-05-10T10:35:00Z',
  },
  // 60A-888.99 - Dongfeng Hoàng Huy
  {
    bienSoXe: '60A-888.99',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 130000,
    l_km: 0.37,
    ghiChu: 'Dongfeng Hoàng Huy - Mới (có hàng)',
    createdAt: '2023-09-01T11:00:00Z',
    updatedAt: '2024-05-12T11:30:00Z',
  },
  {
    bienSoXe: '60A-888.99',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 130000,
    l_km: 0.32,
    ghiChu: 'Dongfeng Hoàng Huy - Mới (không hàng)',
    createdAt: '2023-09-01T11:05:00Z',
    updatedAt: '2024-05-12T11:35:00Z',
  },
  // 51C-999.00 - JAC A5
  {
    bienSoXe: '51C-999.00',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 110000,
    l_km: 0.36,
    ghiChu: 'JAC A5 - Mới (có hàng)',
    createdAt: '2023-10-01T08:00:00Z',
    updatedAt: '2024-05-15T08:00:00Z',
  },
  {
    bienSoXe: '51C-999.00',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 110000,
    l_km: 0.31,
    ghiChu: 'JAC A5 - Mới (không hàng)',
    createdAt: '2023-10-01T08:05:00Z',
    updatedAt: '2024-05-15T08:05:00Z',
  },
  // 29H-001.12 - Volvo FH16
  {
    bienSoXe: '29H-001.12',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 150000,
    l_km: 0.40,
    ghiChu: 'Volvo FH16 - Mới (có hàng)',
    createdAt: '2023-11-01T09:00:00Z',
    updatedAt: '2024-05-16T09:00:00Z',
  },
  {
    bienSoXe: '29H-001.12',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 150000,
    l_km: 0.35,
    ghiChu: 'Volvo FH16 - Mới (không hàng)',
    createdAt: '2023-11-01T09:05:00Z',
    updatedAt: '2024-05-16T09:05:00Z',
  },
  // 60A-112.23 - Scania R-series
  {
    bienSoXe: '60A-112.23',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 140000,
    l_km: 0.39,
    ghiChu: 'Scania R-series - Mới (có hàng)',
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2024-05-17T10:00:00Z',
  },
  {
    bienSoXe: '60A-112.23',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 140000,
    l_km: 0.34,
    ghiChu: 'Scania R-series - Mới (không hàng)',
    createdAt: '2023-12-01T10:05:00Z',
    updatedAt: '2024-05-17T10:05:00Z',
  },
  // 51C-223.34 - MAN TGX
  {
    bienSoXe: '51C-223.34',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 130000,
    l_km: 0.38,
    ghiChu: 'MAN TGX - Mới (có hàng)',
    createdAt: '2024-01-01T11:00:00Z',
    updatedAt: '2024-05-18T11:00:00Z',
  },
  {
    bienSoXe: '51C-223.34',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 130000,
    l_km: 0.33,
    ghiChu: 'MAN TGX - Mới (không hàng)',
    createdAt: '2024-01-01T11:05:00Z',
    updatedAt: '2024-05-18T11:05:00Z',
  },
  // 29H-334.45 - Iveco Stralis
  {
    bienSoXe: '29H-334.45',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 120000,
    l_km: 0.37,
    ghiChu: 'Iveco Stralis - Mới (có hàng)',
    createdAt: '2024-02-01T12:00:00Z',
    updatedAt: '2024-05-19T12:00:00Z',
  },
  {
    bienSoXe: '29H-334.45',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 120000,
    l_km: 0.32,
    ghiChu: 'Iveco Stralis - Mới (không hàng)',
    createdAt: '2024-02-01T12:05:00Z',
    updatedAt: '2024-05-19T12:05:00Z',
  },
  // 60A-445.56 - Kenworth W900
  {
    bienSoXe: '60A-445.56',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 160000,
    l_km: 0.41,
    ghiChu: 'Kenworth W900 - Mới (có hàng)',
    createdAt: '2024-03-01T13:00:00Z',
    updatedAt: '2024-05-20T13:00:00Z',
  },
  {
    bienSoXe: '60A-445.56',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 160000,
    l_km: 0.36,
    ghiChu: 'Kenworth W900 - Mới (không hàng)',
    createdAt: '2024-03-01T13:05:00Z',
    updatedAt: '2024-05-20T13:05:00Z',
  },
  {
    bienSoXe: '51C-001.01',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 100000,
    l_km: 0.3,
    ghiChu: 'Tiêu chuẩn cho xe mới, không hàng',
    createdAt: '2023-01-01T08:05:00Z',
    updatedAt: '2024-05-01T08:05:00Z',
  },
  {
    bienSoXe: '29H-111.22',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 150000,
    l_km: 0.38,
    ghiChu: 'Xe chạy đường dài, có hàng',
    createdAt: '2023-02-10T09:00:00Z',
    updatedAt: '2024-04-15T09:00:00Z',
  },
  {
    bienSoXe: '29H-111.22',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 150000,
    l_km: 0.32,
    ghiChu: 'Xe chạy đường dài, không hàng',
    createdAt: '2023-02-10T09:05:00Z',
    updatedAt: '2024-04-15T09:05:00Z',
  },
  {
    bienSoXe: '60A-222.33',
    phan_loai: 'km_hang',
    tuKm: 50000,
    denKm: 200000,
    l_km: 0.36,
    ghiChu: 'Xe đời cũ hơn, có hàng',
    createdAt: '2023-03-15T10:00:00Z',
    updatedAt: '2024-05-10T10:00:00Z',
  },
  {
    bienSoXe: '60A-222.33',
    phan_loai: 'km_vo',
    tuKm: 50000,
    denKm: 200000,
    l_km: 0.31,
    ghiChu: 'Xe đời cũ hơn, không hàng',
    createdAt: '2023-03-15T10:05:00Z',
    updatedAt: '2024-05-10T10:05:00Z',
  },
  {
    bienSoXe: '51C-333.44',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 80000,
    l_km: 0.4,
    ghiChu: 'Xe chuyên chở nặng',
    createdAt: '2023-04-01T11:00:00Z',
    updatedAt: '2024-05-12T11:00:00Z',
  },
  {
    bienSoXe: '51C-333.44',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 80000,
    l_km: 0.33,
    ghiChu: 'Xe chuyên chở nặng, không hàng',
    createdAt: '2023-04-01T11:05:00Z',
    updatedAt: '2024-05-12T11:05:00Z',
  },
  {
    bienSoXe: '29H-444.55',
    phan_loai: 'km_hang',
    tuKm: 10000,
    denKm: 120000,
    l_km: 0.37,
    ghiChu: 'Xe tải trung, có hàng',
    createdAt: '2023-05-20T14:00:00Z',
    updatedAt: '2024-05-20T14:00:00Z',
  },
  {
    bienSoXe: '29H-444.55',
    phan_loai: 'km_vo',
    tuKm: 10000,
    denKm: 120000,
    l_km: 0.29,
    ghiChu: 'Xe tải trung, không hàng',
    createdAt: '2023-05-20T14:05:00Z',
    updatedAt: '2024-05-20T14:05:00Z',
  },
  {
    bienSoXe: '60A-555.66',
    phan_loai: 'km_hang',
    tuKm: 100001,
    denKm: 200000,
    l_km: 0.39,
    ghiChu: 'Sau bảo dưỡng 100k km, có hàng',
    createdAt: '2023-06-10T08:00:00Z',
    updatedAt: '2024-05-01T08:30:00Z',
  },
  {
    bienSoXe: '60A-555.66',
    phan_loai: 'km_vo',
    tuKm: 100001,
    denKm: 200000,
    l_km: 0.32,
    ghiChu: 'Sau bảo dưỡng 100k km, không hàng',
    createdAt: '2023-06-10T08:05:00Z',
    updatedAt: '2024-05-01T08:35:00Z',
  },
  {
    bienSoXe: '51C-666.77',
    phan_loai: 'km_hang',
    tuKm: 150001,
    denKm: 300000,
    l_km: 0.42,
    ghiChu: 'Sau bảo dưỡng 150k km, có hàng',
    createdAt: '2023-07-15T09:00:00Z',
    updatedAt: '2024-04-15T09:30:00Z',
  },
  {
    bienSoXe: '29H-777.88',
    phan_loai: 'km_hang',
    tuKm: 200001,
    denKm: 400000,
    l_km: 0.4,
    ghiChu: 'Sau bảo dưỡng 200k km, có hàng',
    createdAt: '2023-08-20T10:00:00Z',
    updatedAt: '2024-05-10T10:30:00Z',
  },
  {
    bienSoXe: '60A-888.99',
    phan_loai: 'km_vo',
    tuKm: 80001,
    denKm: 160000,
    l_km: 0.35,
    ghiChu: 'Sau bảo dưỡng 80k km, không hàng',
    createdAt: '2023-09-01T11:00:00Z',
    updatedAt: '2024-05-12T11:30:00Z',
  },
]);

let nextDinhMucIndex = Math.max(...dinhMucData.map(dm => dm.id)) + 1;

const PHAN_LOAI_TYPES = ['km_hang', 'km_vo'];

export const getAllDinhMuc = async () => {
  return [...dinhMucData];
};

export const getDinhMucById = async id => {
  const dinhMuc = dinhMucData.find(dm => dm.id === Number(id));
  return dinhMuc || null;
};

// Get dinh muc by bien so and type (phan_loai)
export const getDinhMucByBienSoAndType = async (bienSoXe, phanLoai) => {
  if (!PHAN_LOAI_TYPES.includes(phanLoai)) {
    console.error('Invalid phan_loai for DinhMuc query:', phanLoai);
    return [];
  }

  const filteredData = dinhMucData.filter(dm => 
    dm.bienSoXe === bienSoXe && dm.phan_loai === phanLoai
  );
  
  return filteredData;
};

export const createDinhMuc = async data => {
  const { bienSoXe, phan_loai, tuKm, denKm, l_km, ghiChu } = data;
  if (!bienSoXe || !phan_loai || tuKm === undefined || denKm === undefined || l_km === undefined) {
    console.error('Missing required fields for new DinhMuc:', data);
    return null;
  }
  if (!PHAN_LOAI_TYPES.includes(phan_loai)) {
    console.error('Invalid phan_loai for new DinhMuc:', phan_loai);
    return null;
  }

  const newDinhMuc = {
    id: nextDinhMucIndex++,
    bienSoXe,
    phan_loai,
    tuKm: Number(tuKm),
    denKm: Number(denKm),
    l_km: Number(l_km),
    ghiChu: ghiChu || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  dinhMucData.push(newDinhMuc);
  return newDinhMuc;
};

export const updateDinhMuc = async (id, updates) => {
  const index = dinhMucData.findIndex(dm => dm.id === Number(id));
  if (index === -1) return null;

  const { id: _, createdAt: __, ...validUpdates } = updates;

  if (validUpdates.phan_loai && !PHAN_LOAI_TYPES.includes(validUpdates.phan_loai)) {
    console.error('Invalid phan_loai for DinhMuc update:', validUpdates.phan_loai);
    return null;
  }

  const updatedDinhMuc = { ...dinhMucData[index] };

  if (validUpdates.bienSoXe !== undefined) updatedDinhMuc.bienSoXe = validUpdates.bienSoXe;
  if (validUpdates.phan_loai !== undefined) updatedDinhMuc.phan_loai = validUpdates.phan_loai;
  if (validUpdates.tuKm !== undefined) updatedDinhMuc.tuKm = Number(validUpdates.tuKm);
  if (validUpdates.denKm !== undefined) updatedDinhMuc.denKm = Number(validUpdates.denKm);
  if (validUpdates.l_km !== undefined) updatedDinhMuc.l_km = Number(validUpdates.l_km);
  if (validUpdates.ghiChu !== undefined) updatedDinhMuc.ghiChu = validUpdates.ghiChu;

  updatedDinhMuc.updatedAt = new Date().toISOString();
  dinhMucData[index] = updatedDinhMuc;
  return dinhMucData[index];
};

export const deleteDinhMuc = async id => {
  const index = dinhMucData.findIndex(dm => dm.id === Number(id));
  if (index === -1) return false;
  dinhMucData.splice(index, 1);
  return true;
};

export const _resetDinhMuc = (data = []) => {
  dinhMucData = ensureUniqueIds(data.map(({ id, ...rest }) => rest));
  nextDinhMucIndex = Math.max(...dinhMucData.map(dm => dm.id)) + 1;
};
