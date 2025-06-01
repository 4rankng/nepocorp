# Data Models Documentation

## Chi phí
bao_duong
- id
- bien_so // bao_duong.bien_so = dau_keo.bien_so OR bao_duong.bien_so = ro_mooc.bien_so
- item_name
- ngay_thay
- ngay_het_han // bao_duong.ngay_het_han = bao_duong.ngay_thay + bao_duong.so_thang_bao_hanh
- so_thang_bao_hanh
- so_luong
- don_gia
- currency
- tong_tien // bao_duong.tong_tien = bao_duong.so_luong * bao_duong.don_gia
- ghi_chu
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

chi_phi
- id
- dau_keo // chi_phi.dau_keo = dau_keo.bien_so, allow null
- ro_mooc // chi_phi.ro_mooc = ro_mooc.bien_so, allow null
- nhan_vien // chi_phi.nhan_vien = nhan_vien.ma_so, allow null
- mo ta // luong, bao hiem, thuong, phu cap, ...
- chi_tiet // json chứa các chi tiết của chi phí
- tong_cong
- currency // VND
- ghi_chu
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',


## Cấu hình
cau_hinh
- id
- key
- value
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

## Phương tiện
container
- id
- ma_so
- phan_loai
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

dau_keo
- id
- bien_so
- lai_xe // dau_keo.lai_xe = nhan_vien.ma_so
- mo_ta
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

ro_mooc
- id
- bien_so
- mo_ta
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

## Định Mức
dinh_muc_km
- id
- bien_so // dinh_muc_km.bien_so = dau_keo.bien_so
- phan_loai // dinh_muc_km.phan_loai = 'km_hang' OR dinh_muc_km.phan_loai = 'km_vo'
- tu_km
- den_km
- l_km
- ghi_chu
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

dinh_muc_bo_sung
- id
- bien_so // dinh_muc_bo_sung.bien_so = dau_keo.bien_so
- ma_tuyen // dinh_muc_bo_sung.ma_tuyen = tuyen_duong.ma_so
- dinh_muc_l
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

## Nhân sự
doi_tac
- id: 1,
- ma_dinh_danh: 'DT001',
- ten: 'Công ty TNHH Vận Tải Minh Phát',
- dia_chi: 'Số 1, Đường Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
- ma_so_thue: '0301234567',
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

khach_hang
- id: 1,
- ma_dinh_danh: 'MDD001',
- ten: 'Công ty TNHH An Phát',
- dia_chi: 'Số 10, Đường Nguyễn Trãi, Phường Thanh Xuân Trung, Quận Thanh Xuân, Hà Nội',
- ma_so_thue: '0100123456',
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

nhan_vien
- id: 1,
- ma_so: 'QL001',
- ho_ten: 'Trần Văn Quản',
- ten_dang_nhap: 'quan.tv',
- mat_khau: 'ah234hk2kfjJ', // hash
- chuc_vu: 'quan-ly', // quan-ly, ke-toan, lai-xe, giao-nhan
- email: 'quan.tv@example.com',
- created_at: '2023-01-05T08:00:00Z',
- updated_at: '2024-05-01T10:00:00Z',

## Lịch Vận Chuyển
lich_van_chuyen
- id: 1,
- ma_chuyen: 'MC001', // lich_van_chuyen.ma_chuyen = tuyen_duong.ma_so, allow null
- ngay_di: '2024-05-28',
- ngay_ha_hang: null, // Status is 'len_lich', not completed
- trang_thai: 'tam_thoi', // tam_thoi, len_lich, hoan_thanh, huy_bo
- ma_khach_hang: 'MDD001', // ma_khach_hang = khach_hang.ma_dinh_danh
- diem_di: 'Kho Nepocorp, Hà Nội',
- diem_den: 'Cảng Hải Phòng; Cảng Quảng Ninh',
- cuoc_van_chuyen: 1222333, // income
- cuoc_thue_van_chuyen: 1000333, // cost
- bien_so_dau_keo: '15C-11223', // bien_so_dau_keo = dau_keo.bien_so
- ma_so_cont: '20DC', // ma_so_cont = container.ma_so
- ma_nv_giao_nhan: 'NV003', // ma_nv_giao_nhan = nhan_vien.ma_so
- ma_nv_lai_xe: 'NV004', // ma_nv_lai_xe = nhan_vien.ma_so
- ghi_chu: 'Hàng dễ vỡ, xin nhẹ tay.',
- km_hang: 50.12,
- km_vo: 23.34,
- l_dau: 2.96,
- tien_dau: 5123001, // cost
- tien_di_duong: 1222333, // cost
- tien_chi_phi: 6345334, // tien_chi_phi = tien_dau + tien_di_duong + cuoc_thue_van_chuyen
- currency // VND
- created_at: '2023-01-05T08:00:00Z',
- updated_at: '2024-05-01T10:00:00Z',

tuyen_duong
- id
- ma_so
- diem_di
- diem_den
- created_at
- updated_at
