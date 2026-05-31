# Pending Tasks: Nhà cung cấp, Phiếu chi phí & Công nợ phải trả

Dựa trên tài liệu nghiệp vụ `12-CHI_PHI_NCC_VA_CONG_NO_PHAI_TRA.md` và kế hoạch `03-cong-no.md`.

> [!CAUTION]
> **LƯU Ý CỰC KỲ QUAN TRỌNG CHO AGENT:**
> 1. **Tuổi nợ AP đảo chiều so với phải thu:** (Chi phí = Credit, Thanh toán = Debit). TUYỆT ĐỐI KHÔNG copy nguyên vẹn logic tính toán từ phần công nợ phải thu (`receivables.service.ts`) sang. Hàm tổng hợp AP phải tính tuổi nợ trên **open credits** và áp **debits** làm thanh toán theo phương pháp FIFO.
> 2. **Mô hình rơ-mooc (Pete xác nhận 31/5):** Đầu kéo và rơ-mooc **ghép theo cặp cố định**. Biển số rơ-mooc là một **trường thuộc bảng `trucks`** (`trailerPlateNumber`), không phải entity riêng. Bảng `expenses` **không có** `trailerId` FK — mọi phiếu chi phí chỉ gắn với `truckId` (đầu kéo). Khi nhập chi phí cho rơ-mooc, kế toán chọn đầu kéo ghép cặp. KHÔNG có rơ-mooc "chi phí chung công ty" — chỉ phiếu để trống xe mới là chi phí chung.
> 3. **Lưu ý kiểu dữ liệu:** Trạng thái thanh toán (`PAID`, `UNPAID`) và loại cấu hình (`hạng mục chi phí`) sử dụng `varchar` thay vì enum cứng. Chỉ thêm `'VENDOR_EXPENSE'` và `'VENDOR_PAYMENT'` vào `txnTypeEnum` đã có cho nghiệp vụ sổ cái.

## Tài liệu tham khảo (Context cho agent)

- **Kế hoạch chi tiết:** [`plans/03-cong-no.md`](./plans/03-cong-no.md) — 15 quyết định thiết kế (đánh số), 5 phase, mục Kiểm thử.
- **Tài liệu QA + API + luồng:** [`docs/flows/12-CHI_PHI_NCC_VA_CONG_NO_PHAI_TRA.md`](./docs/flows/12-CHI_PHI_NCC_VA_CONG_NO_PHAI_TRA.md) — danh sách endpoint, luồng nghiệp vụ, ~40 test case (mã `TC-CP-xxx`).
- **Glossary:** [`CONTEXT.md`](./CONTEXT.md) — Vendor / Expense / Expense Item / AP, công thức Lãi gộp/ròng.
- **ADR:** [`docs/adr/0001-chi-phi-ro-mooc-la-chi-phi-chung.md`](./docs/adr/0001-chi-phi-ro-mooc-la-chi-phi-chung.md) — **ĐÃ BỊ ĐẢO NGƯỢC** bởi quyết định Pete 31/5: rơ-mooc ghép cặp cố định với đầu kéo, biển số rơ-mooc là trường trên bảng `trucks`. [`docs/adr/0002-khong-phan-bo-chi-phi-dinh-ky.md`](./docs/adr/0002-khong-phan-bo-chi-phi-dinh-ky.md) (không amortize — vẫn còn hiệu lực).

**Thứ tự thực thi:** Phase 1 → 2 → 3 → 4 → 5 (Phase 1 phải xong trước; FE Phase 3/4/5 phụ thuộc backend Phase 2). **TDD bắt buộc** (CLAUDE.md): viết test trước cho logic sổ cái VENDOR, aging AP, và P&L.

## Phase 1 — CSDL, Shared Types & Migration

- [ ] **1. Cập nhật schema database (`backend/src/db/schema.ts`)**:
  > **Lưu ý:** Bảng `suppliers`, `expenseCategories`, `expenses` (có `trailerId`), `expensePhotos` và `txnTypeEnum` mở rộng đã được thêm vào schema. Tuy nhiên cần sửa lại theo mô hình rơ-mooc mới:
  - [ ] **Xóa bảng `trailers`** khỏi schema — rơ-mooc không phải entity riêng. Xóa cả `trailerStatusEnum`.
  - [ ] **Cập nhật bảng `trucks`**: Thêm `trailerPlateNumber` (varchar(20), nullable) và `trailerType` (trailerTypeEnum: '20FT'|'40FT', nullable) — biển số và loại rơ-mooc ghép cặp cố định.
  - [ ] **Cập nhật bảng `trips`**: Xóa `trailerId` (FK -> trailers). Thêm `trailerType` (trailerTypeEnum, notNull) — snapshot loại rơ-mooc tại thời điểm tạo chuyến (tra từ truck ghép cặp). `trailerTypeEnum` vẫn giữ vì dùng trong `road_allowances` và `trips`.
  - [ ] **Cập nhật bảng `expenses`**: Xóa `trailerId` (FK -> trailers) — đã có trong schema nhưng cần bỏ đi. Chỉ giữ `truckId` (nullable). Để trống `truckId` = chi phí chung công ty.
  - [ ] Chạy `pnpm db:generate` sau khi sửa xong toàn bộ schema.

- [ ] **2. Cập nhật Shared Types & Schemas (`shared/src/`)**:
  - [ ] `types/index.ts`: Định nghĩa các interface Typescript: `Supplier`, `ExpenseCategory`, `Expense`, `ExpenseWithRefs` (kèm thông tin supplier, category, truck — **không có trailer**), `PayableSummary` (tổng nợ theo supplier), `SupplierStatement` (chi tiết giao dịch NCC), `RenewalReminder`.
  - [ ] `schemas/index.ts`: Tạo các Zod schema tương ứng: `supplierSchema`, `expenseCategorySchema`, `expenseSchema` (chỉ `truckId` optional — không có `trailerId`), `vendorPaymentSchema` (chứa `supplierId`, `receiptId`, `amount`, `date`).
  - [ ] `constants/index.ts`: Cập nhật enum `TxnType` (thêm `VENDOR_EXPENSE`, `VENDOR_PAYMENT`). Cập nhật `api-paths.ts` cho các route mới (`CONFIG.SUPPLIERS`, `EXPENSES`, `FINANCIAL.PAYMENTS_VENDOR`, vv).
  - [ ] `calculations/`: Viết hoặc điều chỉnh hàm `computeFifoAging`. Nếu dùng chung hàm cũ, phải truyền tham số rõ ràng để xử lý logic đảo chiều cho AP (Credit là chi phí/nợ, Debit là thanh toán).

- [ ] **3. Migration & Seed (`backend/`)**:
  - [ ] Chạy `pnpm db:generate` để tạo file migration.
  - [ ] Cập nhật script seed: Thêm các expense category mặc định: "Sửa chữa", "Phụ tùng", "Vật tư" (`isRenewable`: false). "Bảo hiểm", "Đăng kiểm", "Phí đường bộ" (`isRenewable`: true, `reminderLeadDays`: 30).

## Phase 2 — Backend Services & Routes

- [ ] **4. Core Ledger (`backend/src/services/ledger.service.ts`)**:
  - [ ] Trong `getEntityTypeKey`, ánh xạ `'VENDOR'` thành số `3` (Advisory lock key).
  - [ ] Trong `postEntry`, thêm nhánh tính toán cho `entity_type = 'VENDOR'`: công thức tính `balance = prev + credit - debit`.
  - [ ] Mở rộng interface `LedgerPostRequest` để cho phép `entityType: 'VENDOR'`.

- [ ] **5. Expense Service (`backend/src/services/expense.service.ts`)**:
  - [ ] `createExpense`: Tạo dòng expense. Nếu `paymentStatus === 'UNPAID'`, gọi `ledgerService.postEntry` để tạo dòng `VENDOR_EXPENSE` (amount vào cột credit) để tăng nợ. Chạy trong Transaction. Bọc Advisory lock `VENDOR:<supplierId>`.
  - [ ] `updateExpense` / `deleteExpense`: Áp dụng soft-delete. NẾU phiếu cũ là `UNPAID` (đã ghi nợ), phải sinh ra một dòng sổ cái `ADJUSTMENT` để bù trừ phần nợ đã ghi (append-only, không update sổ cái). NẾU phiếu cũ là `PAID`, không cần bù trừ sổ cái.
  - [ ] `listExpenses`: Query kèm relations (supplier, category, truck). Hỗ trợ filter theo `truckId`, `supplierId`, `categoryId`, khoảng thời gian `expenseDate`. **Không có `trailerId` filter**.
  - [ ] `getExpensesByTruckMonth(truckId, month, year)`: Chi phí gắn đầu kéo cụ thể trong tháng — dùng cho P&L per-truck.
  - [ ] `getCompanyExpensesByMonth(month, year)`: Chi phí **không gắn xe** (`truckId IS NULL`) trong tháng — chi phí chung công ty. **Không còn bucket rơ-mooc riêng**.
  - [ ] `getRenewalReminders`: Lấy danh sách các khoản (theo xe) có `validTo` gần tới hạn (so với `reminderLeadDays`) hoặc đã quá hạn. Group theo xe + hạng mục để lấy `validTo` mới nhất.

- [ ] **6. Payables & Financial Services (`backend/src/services/`)**:
  - [ ] `payables.service.ts`: Viết hàm `getPayablesSummary()`. Lấy danh sách nợ cuối cùng từ ledger cho từng NCC, sau đó tính tuổi nợ bằng FIFO. NHỚ áp dụng logic: `credit` = phát sinh nợ, `debit` = đã thanh toán.
  - [ ] `financial.service.ts`: Thêm hàm `recordVendorPayment({ supplierId, receiptId, amount, date })` -> Gọi `ledgerService.postEntry` để tạo dòng `VENDOR_PAYMENT` (amount vào cột debit) để giảm nợ. Bọc Advisory lock.
  - [ ] `statement.service.ts`: Viết hàm `getSupplierStatement(supplierId)` trả về danh sách các giao dịch (EXPENSE, PAYMENT, ADJUSTMENT) sắp xếp theo thời gian, giống hệt cơ chế sao kê khách hàng.

- [ ] **7. P&L & Analytics (`backend/src/services/reporting.service.ts`)**:
  - [ ] Cập nhật `getPnlReport`:
    - Tính `Tổng chi phí xe` = (Chi phí chuyến của xe) + (Tổng `expenses` có `truckId = xe đó` trong tháng). Lãi gộp xe = Doanh thu - Tổng chi phí xe. Chi phí rơ-mooc ghép cặp với xe được nhập qua truckId của đầu kéo nên đã tự nằm trong bucket này.
    - Tính chi phí chung công ty: Tổng `expenses` có `truckId IS NULL` trong tháng. **Không có bucket rơ-mooc riêng**.
    - Công thức: Lãi ròng = Tổng Lãi gộp xe - Phí quản lý - Chi phí chung + Thu nhập khác.

- [ ] **8. Router & Middleware (`backend/src/routes/`)**:
  - [ ] Dùng `createCrudRouter` trong `config.ts` để tạo các endpoints cho `/api/suppliers` và `/api/expense-categories`. Invalidate cache `catalogs:bootstrap` khi có thay đổi.
  - [ ] Tạo file `routes/expense.ts` cho các CRUD liên quan đến phiếu chi phí. Tích hợp module storage/upload cho tính năng tải ảnh hóa đơn.
  - [ ] Thêm route thanh toán `/api/payments/vendor` và sao kê `/api/ledger/suppliers/:id/statement`. Thêm route tổng hợp nợ `/api/reports/payables-summary` và `/api/reports/renewals`.
  - [ ] **Phân quyền dùng Casbin (KHÔNG dùng `requireRoles` thủ công):** suppliers + expense-categories nằm trong `configRoutes` → đã được bảo vệ bởi `casbinAuthz('config')` tại mount `app.use('/api', authMiddleware, casbinAuthz('config'), configRoutes)` (`index.ts:63`). expenses / payables / vendor-payment / statement / renewals đặt dưới `casbinAuthz('financial')` — thêm vào `financialRoutes`, hoặc mount router mới cạnh `index.ts:61`: `app.use('/api', authMiddleware, casbinAuthz('financial'), expenseRoutes)`. **KHÔNG cần sửa `policy.csv`**: ADMIN (`*`), MANAGER, ACCOUNTANT đã có `config`+`financial` read/write; DRIVER không có 2 resource này nên tự động bị chặn 403. (`requireRoles(...)` chỉ dùng khi cần siết chặt hơn cho một endpoint riêng, ví dụ distribute-profit = ADMIN/MANAGER.)

## Phase 3 — Frontend: Quản lý Danh mục & Phiếu chi phí

- [ ] **9. Data Hooks (`frontend/src/hooks/`)**:
  - [ ] Viết `useSuppliers`, `useExpenseCategories` tái sử dụng primitive `useCRUD`.
  - [ ] Viết `useExpenses(filters)` để fetch list phiếu chi phí.

- [ ] **10. Màn hình Cấu hình & Danh mục**:
  - [ ] `SupplierListPage` (`/suppliers`): CRUD cho bảng Nhà cung cấp. Sử dụng giao diện tương tự màn hình Khách hàng (`CustomerListPage`).
  - [ ] Trang Config (`/config`): Thêm module quản lý `Hạng mục chi phí`. Hiển thị toggle `is_renewable` và input `reminder_lead_days`.

- [ ] **11. Màn hình Phiếu chi phí (`/expenses`)**:
  - [ ] `ExpenseListPage`: Grid view dạng bảng cho desktop và card view responsive cho mobile.
  - [ ] `ExpenseEntryPage` (Form Tạo/Sửa):
    - Các trường bắt buộc: Ngày, Nhà cung cấp (dropdown), Hạng mục (dropdown), Số tiền (VND format).
    - Trường Xe: Dropdown chọn **Đầu kéo** (từ danh mục trucks), hoặc bỏ trống (chi phí chung). **Không có dropdown rơ-mooc riêng** — kế toán chọn đầu kéo ghép cặp khi chi phí liên quan đến rơ-mooc.
    - Trạng thái: Radio/Select chọn Trả ngay (PAID) / Ghi nợ (UNPAID).
    - Dynamic fields: Nếu hạng mục được chọn có `isRenewable === true`, hiển thị thêm 2 trường DatePicker cho `valid_from` và `valid_to`. Bắt buộc điền nếu hiện.
    - Upload ảnh hóa đơn tái sử dụng component Upload.

## Phase 4 — Frontend: Công nợ phải trả (AP)

- [ ] **12. Màn hình Công nợ (`/payables`)**:
  - [ ] Viết hooks `useVendorDebts` và `useSupplierStatement`.
  - [ ] `PayableListPage`: Tương tự `DebtListPage` nhưng dành cho NCC. Hiển thị danh sách NCC, tổng số dư nợ (balance), và các bucket tuổi nợ (0-30, 31-60, 61-90, 90+).
  - [ ] `PayableDetailPage` (`/payables/:id`): Tương tự `DebtDetailPage`. Hiển thị bảng sao kê chi tiết (Statement) của NCC gồm các giao dịch tăng/giảm nợ.
  - [ ] Nút "Ghi thanh toán" tại detail page: Mở modal nhập Số tiền, Ngày trả, Mã biên lai. Khi submit gọi endpoint `/payments/vendor`. (Lưu ý: Chỉ nhập tổng tiền, không chọn từng hóa đơn để thanh toán).

## Phase 5 — Dashboard & UI Integration

- [ ] **13. Dashboard Widgets & Nav**:
  - [ ] `App.tsx` & `Layout.tsx`: Đăng ký routes `/suppliers`, `/expenses`, `/payables`. Thêm vào Sidebar navigation cho nhóm Tài chính/Kế toán.
  - [ ] Màn hình Finance (`/finance`): Cập nhật hiển thị Lãi gộp theo công thức mới, thêm section Pie Chart cho cơ cấu chi phí vận hành (Sửa chữa, Phụ tùng, Bảo hiểm, Đăng kiểm, Phí đường bộ).
  - [ ] Màn hình Dashboard: Thêm widget "Nhắc gia hạn" hiển thị danh sách các xe có hạn bảo hiểm/đăng kiểm/phí đường bộ thuộc diện sắp hết hạn hoặc quá hạn (sử dụng data từ `/api/reports/renewals`).

## Kiểm thử & Phân quyền (QA Checklist)

- [ ] **Concurrency & Locking**: API `/payments/vendor` và tạo expense `UNPAID` phải được bọc trong Advisory Lock ID của Vendor để ngăn race condition (sai số dư) trên bảng ledger.
- [ ] **Immutability Sổ cái**: Sửa hoặc xóa một `expense` (UNPAID) phải tạo ra một dòng `ADJUSTMENT` trong ledger để bù trừ, chứ TUYỆT ĐỐI không được UPDATE trực tiếp dòng cũ.
- [ ] **Validation API**:
  - Bắn lỗi 400 nếu hạng mục `isRenewable` mà thiếu `validTo`.
  - Từ chối thao tác (403/Redirect) nếu role là DRIVER truy cập vào các routes/API của vendor và expenses.
- [ ] **Testing P&L**: Chạy báo cáo P&L và verify: (a) Lãi gộp xe X bị trừ đúng số tiền sửa chữa gắn với truckId=X trong tháng; (b) chi phí thay lốp rơ-mooc ghép với xe X được nhập qua truckId=X, trừ vào lãi gộp xe X chứ không vào chi phí chung; (c) phiếu không gắn xe trừ vào lãi ròng ở mục chi phí chung.

## Truy vết Test case (map sang `docs/flows/12-...md` §5)

| Phase | Test case |
|-------|-----------|
| 1 — CSDL/Migration | Migration `drizzle-kit generate` chạy sạch; seed hạng mục mặc định |
| 2 — Ledger/Expense/AP | TC-CP-004/005 (post sổ cái UNPAID/PAID), TC-CP-008 (thanh toán giảm nợ), **TC-CP-040 (aging đảo chiều)**, TC-CP-041/042/043 (ADJUSTMENT bù trừ), TC-CP-044 (immutable), TC-CP-050 (concurrency) |
| 3 — FE catalog/phiếu chi phí | TC-CP-001→007, TC-CP-020→024 (validation), TC-CP-070/071 (responsive) |
| 4 — FE công nợ phải trả | TC-CP-008, TC-CP-071 |
| 5 — P&L/Dashboard | TC-CP-060, TC-CP-061 (sửa: rơ-mooc → lãi gộp đầu kéo), TC-CP-062→066 (gồm nhắc gia hạn TC-CP-064/065/066) |
| Xuyên suốt — RBAC | TC-CP-030→033 (DRIVER bị chặn) |

## Định nghĩa Hoàn thành (Definition of Done — mỗi task)

- [ ] Có test Vitest cho logic backend (sổ cái VENDOR, aging AP, ADJUSTMENT bù trừ, P&L), chạy xanh.
- [ ] `npm run build` / typecheck sạch ở cả `shared`, `backend`, `frontend` (TypeScript strict, không `any`).
- [ ] Tuân thủ đúng các quyết định đánh số trong `plans/03-cong-no.md` và 2 ADR.
- [ ] Mọi lỗi nghiệp vụ ném `ApiError` (không dùng `Error` trần) — map đúng HTTP status.
- [ ] Nhãn UI tiếng Việt; tiền VND không có phần thập phân.
