# Data Models Documentation

## Bảo Dưỡng (Maintenance)
bao_duong(id, bien_so, item_name, ngay_thay, ngay_het_han, so_thang_bao_hanh, so_luong, don_gia, currency, tong_tien, ghi_chu, created_at, updated_at)

## Cấu Hình (Configuration)
cau_hinh(id, key, value, created_at, updated_at)

## Container
container(id, ma_so, phan_loai, created_at, updated_at)

## Đầu Kéo (Tractor)
dau_keo(id, bien_so, lai_xe, mo_ta, created_at, updated_at)

## Định Mức (Fuel Standards)
dinh_muc(id, bien_so_xe, phan_loai, tu_km, den_km, l_km, ghi_chu, created_at, updated_at)

## Định Mức Bổ Sung (Supplementary Fuel Standards)
dinh_muc_bo_sung(id, bien_so, ma_tuyen, dinh_muc_l, created_at, updated_at)

## Đối Tác (Partner)
doi_tac(id, ma_doi_tac, ten_doi_tac, dia_chi, so_dien_thoai, email, ma_so_thue, nguoi_dai_dien, created_at, updated_at)

## Khách Hàng (Customer)
khach_hang(id, ma_khach_hang, ten_khach_hang, dia_chi, so_dien_thoai, email, ma_so_thue, nguoi_dai_dien, created_at, updated_at)

## Lịch Vận Chuyển (Transport Schedule)
lich_van_chuyen(id, ma_lich, ma_tuyen, bien_so, ngay_di, ngay_ve, trang_thai, ghi_chu, created_at, updated_at)

## Nhân Viên (Employee)
nhan_vien(id, ma_nhan_vien, ho_ten, ngay_sinh, gioi_tinh, dia_chi, so_dien_thoai, email, chuc_vu, created_at, updated_at)

## Rơ Moóc (Trailer)
ro_mooc(id, bien_so, mo_ta, created_at, updated_at)

## Tuyến Đường (Route)
tuyen_duong(id, ma_so, diem_di, diem_den, created_at, updated_at)

## Định Mức Đi Đường (Route Fuel Standards)
dinh_muc_di_duong(id, ma_tuyen, ma_loai_container, dinh_muc, created_at, updated_at)

## Định Mức Dầu (Fuel Standards)
dinh_muc_dau(id, ma_loai_xe, ma_loai_container, dinh_muc, created_at, updated_at)
