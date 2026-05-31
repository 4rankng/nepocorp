# Kế hoạch: Nhà cung cấp, Phiếu chi phí & Công nợ phải trả (Vendor / Expense / Accounts Payable)

> Trạng thái: **Đã duyệt** (sau phiên grill-with-docs). Đây là thiết kế chính thức.

## Bối cảnh

Quy trình Excel cũ của NEPO tính cả các chi phí vận hành mà web MVP đã lược bỏ: **sửa chữa, vật tư–phụ tùng, bảo hiểm, đăng kiểm, phí đường bộ**. "Tổng chi phí" trên web hiện chỉ gồm chi phí trực tiếp theo chuyến (dầu + tiền đi đường + lương sản lượng), và module công nợ mới chỉ có **công nợ phải thu** (khách hàng). Tính năng này bổ sung:

1. **Nhà cung cấp** (Vendor) — danh mục mọi bên nhận tiền: gara, trạm lốp, cửa hàng phụ tùng/vật tư, công ty bảo hiểm, trung tâm đăng kiểm, đơn vị thu phí đường bộ.
2. **Phiếu chi phí** (Expense) — chi phí vận hành/bảo dưỡng, có thể gắn một xe, trả ngay hoặc ghi nợ.
3. **Công nợ phải trả** (Accounts Payable) — số tiền công ty đang nợ NCC, kèm thanh toán + tuổi nợ — tái sử dụng bộ máy AR trên `entity_type='VENDOR'`.
4. **P&L + Dashboard** — chi phí bảo dưỡng theo xe/tháng đưa vào lãi gộp; nhắc gia hạn cho chi phí định kỳ.

Sổ cái đã được thiết kế cho việc này: `ledger.entity_type` là `varchar` (cố tình "NO ENUMS", loose coupling — xem CONTEXT.md), nên `'VENDOR'` dùng được ngay.

---

## Các quyết định thiết kế (kết quả grill — chính thức)

1. **Hạng mục chi phí = danh mục cấu hình được** (bảng cấu hình #15). Người dùng tự tạo hạng mục — không hardcode. **Không enum; lưu chuỗi.**
2. **Mỗi hạng mục mang hành vi riêng** (lý do dùng danh mục thay vì enum):
   - `is_renewable` (boolean) — một lần vs định kỳ/gia hạn.
   - `reminder_lead_days` (int, mặc định **30**) — chỉ dùng khi định kỳ.
3. **Hạng mục định kỳ** → mỗi phiếu chi phí ghi `valid_from` / `valid_to`. Dashboard nhắc khi `hôm nay >= valid_to − reminder_lead_days`, hoặc đã quá hạn. **Mốc nhắc = `valid_to` mới nhất theo (xe × hạng mục).** Gia hạn = tạo phiếu mới với `valid_to` xa hơn (không có thao tác "gia hạn" riêng).
4. **Không phân bổ (amortization).** Ghi toàn bộ số tiền vào tháng thanh toán. (Nhắc gia hạn và phân bổ là hai việc độc lập; ta làm nhắc, không trải đều.)
5. **Nhà cung cấp bắt buộc** trên mọi phiếu (`supplier_id` notNull) và là khái niệm chung cho mọi bên nhận tiền. **Không có trường `classification`** (trùng với hạng mục chi phí). Bảng `suppliers` = tên, người liên hệ, SĐT, mã số thuế, ghi chú, trạng thái.
6. **Một phiếu = một hạng mục + một số tiền** (một dòng). Hóa đơn gara nhiều khoản → nhiều phiếu cùng NCC + cùng ngày (có thể cùng một ảnh hóa đơn).
7. **Gắn xe là tùy chọn và linh hoạt.** `truck_id` / `trailer_id` đều nullable; tối đa một cái có giá trị; **có thể không gắn xe** (chi phí chung). Không gò bó để phục vụ nhu cầu phát sinh.
8. **Trạng thái thanh toán (chuỗi, không enum):**
   - `PAID` (trả ngay) → chỉ ghi cho P&L, **không tạo dòng sổ cái** (hệ thống không có tài khoản tiền mặt).
   - `UNPAID` (ghi nợ) → tạo dòng sổ cái **VENDOR** (credit = số tiền), phát sinh công nợ phải trả.
9. **Không dùng enum cho trường mới — dùng chuỗi.** Chỗ enum duy nhất bị động đến là cột `txn_type` (đã là pgEnum); thêm `VENDOR_EXPENSE`, `VENDOR_PAYMENT`.
10. **Quy ước dấu VENDOR = giống DRIVER (công nợ phải trả):** `balance = prev + credit − debit`. Credit (chi phí) tăng số tiền nợ; debit (thanh toán) giảm.
11. **Tuổi nợ AP KHÔNG sao chép nguyên xi từ phải thu.** Trong `getReceivablesSummary` (`receivables.service.ts`) *hóa đơn* là **debit**, *thanh toán* là **credit**. Với công nợ phải trả thì **đảo vai** — chi phí là **credit**, thanh toán là **debit**. Hàm tổng hợp AP phải tính tuổi trên **open credits** và áp **debits** làm thanh toán. `computeFifoAging` chỉ tái dùng được nếu truyền cột đã hoán đổi.
12. **Tổng chi phí về bản chất bao gồm TẤT CẢ chi phí** — dầu + tiền đi đường + lương **cộng thêm** chi phí vận hành/bảo dưỡng (sửa chữa, phụ tùng, vật tư, bảo hiểm, đăng kiểm, phí đường bộ). Thực hiện ở **hai tầng** để khỏi đếm trùng:
    - **Thẻ từng chuyến** (PRODUCT-SPECS §4.6) giữ nguyên = dầu + tiền đi đường + lương sản lượng. `computeTripTotals` không đổi — bảo dưỡng không phải số liệu theo chuyến (theo xe, theo tháng).
    - **Tổng chi phí trong P&L (theo tháng)** = Σ chi phí chuyến + Σ chi phí vận hành/bảo dưỡng:
      - Theo xe đầu kéo: `Tổng chi phí xe = Σ chi phí chuyến của xe + Σ bảo dưỡng gắn xe trong tháng`; `Lãi gộp xe = Doanh thu các chuyến − Tổng chi phí xe`.
      - Chi phí gắn rơ-mooc + không gắn xe → dòng chi phí cấp công ty: `Lãi ròng = Σ Lãi gộp xe − Phí quản lý − (Chi phí rơ-mooc + chi phí chung) + Thu nhập khác`.
    - Không đếm trùng: nhiên liệu mua nợ nằm ngoài phạm vi, nên không hạng mục nào trùng với chi phí theo chuyến.
13. **Sửa/xóa** một phiếu đã ghi nợ (UNPAID) → tạo bút toán **ADJUSTMENT** bù trừ (sổ cái append-only); dòng phiếu được soft-delete.
14. **Phân quyền:** ACCOUNTANT + MANAGER (đã có quyền `config` + `financial`); ADMIN `*`; **DRIVER bị chặn**. Không cần đổi `policy.csv`.
15. **Khớp thanh toán AP = giảm tổng số dư + FIFO.** Kế toán nhập tổng tiền trả cho một NCC → post `VENDOR_PAYMENT` (debit) giảm số dư; tuổi nợ tính FIFO (trừ phiếu cũ nhất trước). **Không khớp từng phiếu** (khác với phải thu khớp theo chuyến). Màn hình `PayableDetailPage` chỉ có một ô số tiền, không có bộ chọn từng phiếu.

**Thuật ngữ ghi vào CONTEXT.md:** *Phí đường bộ* (phí bảo trì đường bộ đóng theo năm cho nhà nước, theo xe) **khác** với *Tiền đi đường* (tiền mặt đưa lái xe trả vé cầu đường mỗi chuyến). Không nhầm lẫn.

---

## Phase 1 — CSDL, Shared Types & Migration

**Schema** (`backend/src/db/schema.ts`, theo mẫu catalog soft-delete như `customers`):
- **`suppliers`** (cấu hình #14): `id, name (notNull), contactPerson, phone, taxCode, note, status (varchar), createdAt/updatedAt/deletedAt`.
- **`expenseCategories`** (cấu hình #15 — "Hạng mục chi phí"): `id, name (notNull), isRenewable (boolean default false), reminderLeadDays (int default 30), status, createdAt/updatedAt/deletedAt`.
- **`expenses`** (vận hành): `id, expenseDate (notNull), supplierId FK→suppliers (notNull), categoryId FK→expenseCategories (notNull), truckId FK→trucks (nullable), trailerId FK→trailers (nullable), amount numeric(15,0) notNull, paymentStatus varchar (notNull), validFrom (nullable), validTo (nullable), receiptId varchar(100), note text, createdBy FK→users, createdAt/updatedAt/deletedAt`. CHECK: không đồng thời có truckId và trailerId.
- **`expensePhotos`**: theo mẫu `tripPhotos` — `id, expenseId FK, storageKey, uploadedBy, uploadedAt`.
- Mở rộng **`txnTypeEnum`**: thêm `'VENDOR_EXPENSE'`, `'VENDOR_PAYMENT'`.

**Shared** (`shared/src/`):
- `types/index.ts`: `Supplier`, `ExpenseCategory`, `Expense`, `ExpenseWithRefs`, `PayableSummary`, `SupplierStatement`, `RenewalReminder`.
- `schemas/`: `supplierSchema`, `expenseCategorySchema`, `expenseSchema`, `vendorPaymentSchema` (Zod).
- `constants/`: thêm `VENDOR_EXPENSE`, `VENDOR_PAYMENT` vào TxnType.
- `constants/api-paths.ts`: `CONFIG.SUPPLIERS/EXPENSE_CATEGORIES`, `EXPENSES`, `FINANCIAL.SUPPLIER_STATEMENT/PAYMENTS_VENDOR`, `REPORTS.PAYABLES_SUMMARY`, `REPORTS.RENEWALS`.
- Tái dùng `computeFifoAging` (truyền debit/credit đã hoán đổi cho AP — quyết định 11).

**Migration:** `drizzle-kit generate` → `0001_*.sql`; áp qua Makefile. Seed vài hạng mục mặc định (Sửa chữa, Phụ tùng, Vật tư = một lần; Bảo hiểm, Đăng kiểm, Phí đường bộ = định kỳ, lead 30).

---

## Phase 2 — Backend Services & Routes

- **`ledger.service.ts`**: thêm nhánh `VENDOR` vào `postEntry` (`prev + credit − debit`); `VENDOR → 3` trong `getEntityTypeKey` (đã trả 3 cho non-customer/driver — xác nhận); mở rộng kiểu `LedgerPostRequest.entityType` và `lockEntities` để gồm `'VENDOR'`.
- **`expense.service.ts`** (mới): `createExpense` (tx: insert; nếu `UNPAID` post `VENDOR_EXPENSE` credit); `updateExpense`/`deleteExpense` (ADJUSTMENT bù trừ nếu đã post, soft-delete); `listExpenses(filters)`; `getExpensesByTruckMonth(m,y)`, `getCompanyExpensesByMonth(m,y)` (rơ-mooc + không gắn xe), `getRenewalReminders()`. Tất cả lỗi dùng `ApiError`.
- **`payables.service.ts`** (mới): `getPayablesSummary()` — tuổi nợ trên `entity_type='VENDOR'` với **debit/credit hoán đổi** so với phải thu.
- **`financial.service.ts`**: `recordVendorPayment({supplierId, receiptId, amount, date})` — post `VENDOR_PAYMENT` debit.
- **`statement.service.ts`**: `getSupplierStatement(supplierId)` (theo mẫu sao kê khách hàng).
- **`reporting.service.ts`**: mở rộng `getPnlReport` theo quyết định 12; thêm nhắc gia hạn vào dashboard stats (hoặc endpoint riêng).
- **Routes:** mount `suppliers` + `expense-categories` qua **CRUD factory** trong `config.ts` (invalidate cache `catalogs:bootstrap`); file mới `routes/expense.ts` (custom, có side-effect sổ cái) + upload ảnh hóa đơn tái dùng `upload.ts`/`storage.service.ts`; payables/vendor-payment/supplier-statement trên `financial`/`reporting`. Mount dưới `casbinAuthz('config')` / `casbinAuthz('financial')` trong `index.ts`.

---

## Phase 3 — Frontend: Danh mục NCC + Nhập chi phí (ưu tiên)

- Hooks (`useQueries.ts`): `useSuppliers`, `useExpenseCategories`, `useExpenses(filters)` + mutations (tái dùng `useCRUD`).
- **SupplierListPage** (`/suppliers`) — CRUD danh mục qua primitives `components/config/` (theo mẫu customers).
- **Hạng mục chi phí** — thêm khối danh mục trên trang Config (#15), có toggle `is_renewable` + ô `reminder_lead_days`.
- **ExpenseListPage / ExpenseEntryPage** (`/expenses`) — danh sách responsive (theo mẫu DebtListPage) + form nhập: ngày, NCC, hạng mục, xe (đầu kéo *hoặc* rơ-mooc, tùy chọn), số tiền, trạng thái (Trả ngay/Ghi nợ), `valid_from/to` (chỉ hiện khi hạng mục định kỳ), ghi chú, upload ảnh hóa đơn.
- `App.tsx` routes; `Layout.tsx` nav: "Chi phí vận hành" (`/expenses`, financials), "Nhà cung cấp" (`/suppliers`, admin) + `getPageTitle`.

## Phase 4 — Công nợ phải trả (AP UI)

- Hooks: `useVendorDebts` (→ `PAYABLES_SUMMARY`), `useSupplierStatement(id)`.
- **PayableListPage** (`/payables`) — clone DebtListPage cho NCC ("Công nợ phải trả").
- **PayableDetailPage** (`/payables/:id`) — clone DebtDetailPage; sao kê NCC + ghi thanh toán (`PAYMENTS_VENDOR`).
- Routes + nav "Công nợ phải trả" (financials, cạnh Công nợ phải thu).

## Phase 5 — P&L + Nhắc gia hạn trên Dashboard

- `reporting.service.ts getPnlReport`: theo quyết định 12 — `maintenanceCost` theo xe, dòng cấp công ty cho rơ-mooc/không gắn xe, `categoryBreakdown` cho biểu đồ cơ cấu chi phí.
- **FinancePage**: bảo dưỡng vào cơ cấu chi phí + lát cắt mới (sửa chữa/phụ tùng/bảo hiểm/đăng kiểm/phí đường bộ).
- **Dashboard**: widget nhắc gia hạn — xe có bảo hiểm/đăng kiểm/phí đường bộ sắp tới hạn hoặc quá hạn.

---

## Kiểm thử

- **Vitest:** phiếu UNPAID → một dòng VENDOR credit, số dư tăng; PAID → không có dòng sổ cái; thanh toán NCC debit giảm số dư; **tuổi nợ AP với debit/credit hoán đổi** khớp ví dụ FIFO tính tay; xóa phiếu đã post → ADJUSTMENT bù trừ về 0.
- **Migration:** generate chạy sạch; tạo bảng; seed hạng mục mặc định.
- **E2E (đăng nhập `ketoan`):** tạo NCC → hạng mục định kỳ (Bảo hiểm, lead 30) → phiếu "Ghi nợ" trên xe X có `valid_to` + ảnh hóa đơn → xuất hiện ở `/payables` đúng tuổi nợ → thanh toán một phần → số dư giảm → `/finance` hiện bảo dưỡng xe X trong lãi gộp + rơ-mooc/không gắn ở lãi ròng + lát cắt mới → Dashboard hiện nhắc gia hạn khi `valid_to` đến gần.
- **RBAC:** DRIVER bị chặn `/expenses` và `/payables`; `ketoan`/`giamdoc` được phép.
