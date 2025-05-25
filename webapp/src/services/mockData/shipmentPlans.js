// Shipment plans management mock data and functions

// Mock data for schedules and costs (backward compatibility)
export const mockSchedules = [];
export const mockCosts = [];

// Utility function to recalculate shipment costs
const recalculateShipmentCosts = plan => {
  plan.dauDong = (plan.dauLit || 0) * (plan.donGiaDau || 0);
  plan.costFuel = plan.dauDong;
  let detailedOtherCostsSum = 0;
  if (plan.detailedOtherCosts && Array.isArray(plan.detailedOtherCosts)) {
    detailedOtherCostsSum = plan.detailedOtherCosts.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );
  }
  plan.chiPhiKhac = detailedOtherCostsSum;
  plan.tongChiPhiPhuongTien =
    (plan.dauDong || 0) + (plan.phiDiDuong || 0) + (plan.cuocThueVanChuyen || 0);
  plan.totalCost =
    (plan.costFuel || 0) +
    (plan.costTolls || 0) +
    (plan.costMaintenance || 0) +
    plan.chiPhiKhac +
    (plan.cuocThueVanChuyen || 0);
  plan.loiNhuanPhuongTien = (plan.cuocVanChuyen || 0) - plan.tongChiPhiPhuongTien;
  return plan;
};

let shipmentPlansData = [
  recalculateShipmentCosts({
    id: 'sp1',
    ngayThang: '01/01/2024',
    bienSoXeId: 'v1',
    bienSoXe: '51C-12345',
    doiTacId: 'p1',
    tenDoiTac: 'Đối tác Vận Tải An Phát',
    dienGiai: 'Chở hàng Tết đợt 1',
    tuyenDuong: { diemDi: 'Kho A', diemDen: ['Kho B', 'Kho C'] },
    trangThai: 'Hoàn thành',
    khachHangId: 'cust1',
    tenKhachHang: 'Công ty TNHH ABC Vận Tải',
    loaiContainerId: 'ct1',
    tenLoaiContainer: "20'DC",
    cuocVanChuyen: 5000000,
    thongTinContainer: [{ soContainer: 'CONT111', soSeal: 'SEAL111' }],
    ngayHaHang: '02/01/2024',
    soLuongContainer: 1,
    cuocThueVanChuyen: 0,
    dauLit: 100,
    donGiaDau: 20000,
    phiDiDuong: 500000,
    costTolls: 500000,
    costMaintenance: 200000,
    detailedOtherCosts: [
      { id: 'doc1_1', name: 'Bốc xếp', amount: 300000 },
      { id: 'doc1_2', name: 'Lưu kho', amount: 100000 },
    ],
    kmChuyenHang: 120,
    kmChuyenVoRong: 30,
    dinhMucDiDuong: 500000,
  }),
  recalculateShipmentCosts({
    id: 'sp2',
    ngayThang: '15/01/2024',
    bienSoXeId: 'v2',
    bienSoXe: '29H-54321',
    doiTacId: '',
    tenDoiTac: '-',
    dienGiai: 'Giao hàng cho siêu thị XYZ',
    tuyenDuong: { diemDi: 'Cảng X', diemDen: ['Siêu thị Y'] },
    trangThai: 'Hoàn thành',
    khachHangId: 'cust2',
    tenKhachHang: 'Doanh nghiệp tư nhân XYZ Logistics',
    loaiContainerId: 'ct2',
    tenLoaiContainer: "40'DC",
    cuocVanChuyen: 7500000,
    thongTinContainer: [{ soContainer: 'CONT222', soSeal: 'SEAL222' }],
    ngayHaHang: '15/01/2024',
    soLuongContainer: 1,
    cuocThueVanChuyen: 0,
    dauLit: 150,
    donGiaDau: 20000,
    phiDiDuong: 700000,
    costTolls: 700000,
    costMaintenance: 300000,
    detailedOtherCosts: [{ id: 'doc2_1', name: 'Phí cảng', amount: 400000 }],
    kmChuyenHang: 150,
    kmChuyenVoRong: 40,
    dinhMucDiDuong: 700000,
  }),
  recalculateShipmentCosts({
    id: 'sp3',
    ngayThang: '05/02/2024',
    bienSoXeId: 'v1',
    bienSoXe: '51C-12345',
    doiTacId: '',
    tenDoiTac: '-',
    dienGiai: 'Vận chuyển hàng đông lạnh',
    tuyenDuong: { diemDi: 'Kho Lạnh A', diemDen: ['Kho Lạnh B'] },
    trangThai: 'Hoàn thành',
    khachHangId: 'cust1',
    tenKhachHang: 'Công ty TNHH ABC Vận Tải',
    loaiContainerId: 'ct4',
    tenLoaiContainer: "20'RF",
    cuocVanChuyen: 6000000,
    thongTinContainer: [{ soContainer: 'CONT333', soSeal: 'SEAL333' }],
    ngayHaHang: '05/02/2024',
    soLuongContainer: 1,
    cuocThueVanChuyen: 0,
    dauLit: 120,
    donGiaDau: 21000,
    phiDiDuong: 600000,
    costTolls: 600000,
    costMaintenance: 400000,
    detailedOtherCosts: [],
    kmChuyenHang: 100,
    kmChuyenVoRong: 20,
    dinhMucDiDuong: 600000,
  }),
];

// Shipment plan functions
export const getShipmentPlans = () =>
  new Promise(res => setTimeout(() => res([...shipmentPlansData]), 50));

export const addShipmentPlan = planData =>
  new Promise((resolve, reject) => {
    if (!planData.dienGiai?.trim()) {
      reject(new Error('Diễn giải không được để trống.'));
      return;
    }
    const newPlan = recalculateShipmentCosts({
      id: String(Date.now()),
      ...planData,
      dienGiai: planData.dienGiai.trim(),
      trangThai: 'Chờ xác nhận',
      ngayTao: new Date().toISOString(),
    });
    shipmentPlansData.push(newPlan);
    resolve(newPlan);
  });

export const updateShipmentPlan = (id, updatedPlanData) =>
  new Promise((resolve, reject) => {
    const index = shipmentPlansData.findIndex(p => p.id === id);
    if (index === -1) {
      reject(new Error('Không tìm thấy kế hoạch'));
      return;
    }
    shipmentPlansData[index] = recalculateShipmentCosts({
      ...shipmentPlansData[index],
      ...updatedPlanData,
      dienGiai: updatedPlanData.dienGiai?.trim() || shipmentPlansData[index].dienGiai,
    });
    resolve(shipmentPlansData[index]);
  });

export const deleteShipmentPlan = id =>
  new Promise(resolve => {
    shipmentPlansData = shipmentPlansData.filter(p => p.id !== id);
    resolve({ id });
  });

export const updateShipmentPlanField = async (planId, field, value) => {
  const plan = shipmentPlansData.find(p => p.id === planId);
  if (!plan) throw new Error('Không tìm thấy kế hoạch');
  plan[field] = value;
  recalculateShipmentCosts(plan);
  return plan;
};

export const addDetailedOtherCostItem = async (planId, itemName, itemAmount) => {
  const plan = shipmentPlansData.find(p => p.id === planId);
  if (!plan) throw new Error('Không tìm thấy kế hoạch');

  if (!plan.detailedOtherCosts) plan.detailedOtherCosts = [];
  const newItem = {
    id: String(Date.now()),
    name: itemName.trim(),
    amount: Number(itemAmount),
  };
  plan.detailedOtherCosts.push(newItem);
  recalculateShipmentCosts(plan);
  return newItem;
};

export const updateDetailedOtherCostItem = async (planId, itemId, updatedName, updatedAmount) => {
  const plan = shipmentPlansData.find(p => p.id === planId);
  if (!plan) throw new Error('Không tìm thấy kế hoạch');

  const item = plan.detailedOtherCosts?.find(i => i.id === itemId);
  if (!item) throw new Error('Không tìm thấy khoản chi phí');

  item.name = updatedName.trim();
  item.amount = Number(updatedAmount);
  recalculateShipmentCosts(plan);
  return item;
};

export const deleteDetailedOtherCostItem = async (planId, itemId) => {
  const plan = shipmentPlansData.find(p => p.id === planId);
  if (!plan) throw new Error('Không tìm thấy kế hoạch');

  const index = plan.detailedOtherCosts?.findIndex(i => i.id === itemId);
  if (index === -1) throw new Error('Không tìm thấy khoản chi phí');

  plan.detailedOtherCosts.splice(index, 1);
  recalculateShipmentCosts(plan);
  return { id: itemId };
};
