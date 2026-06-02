# Pete's QA Answers — Triage Punch List

**Source:** `docs/company-files/NePoQA 20260106_Answered_20260602.docx`
**Date received:** 2026-06-02
**Status:** Triage only — no implementation in this pass. Items below need product/eng discussion before scoping.

Each item carries one of: **🐛 Bug** (current code disagrees), **✨ Feature** (new work), **🔧 Config** (make user-configurable), **📝 Wording** (UI string change), **✅ Confirm** (existing behavior is correct, no action), **❓ Clarify** (need a follow-up question to Pete).

---

## A. Service costs — buy/sell with optional markup

### A1. Payment channel for service fees varies by fee
**Pete:** Most service fees (lifting, lowering, weighing, customs declaration, infrastructure, inspection, etc.) are advanced by the forwarder ("giao nhận") and reimbursed later. **But** shipping-line filings receipted to NePO, OR any single fee > 5M VND, are paid directly by NePO bank transfer.

- **🔧 Config:** add a per-fee or per-payment threshold flag. Suggest two-track recording:
  - **Forwarder advance** → goes through the existing forwarder advance ledger.
  - **Direct NePO payment** → recorded as a payable to the supplier (cảng / hãng tàu) directly.
- **❓ Clarify:** is the 5M VND threshold a hard rule or guideline? Should the UI auto-route or let the operator pick?

### A2. Sell price = buy price (pass-through) OR buy price + markup
**Pete:** Sell price comes from NePO's price list — some pass-through, some marked-up. The field should be **editable** with the buy price as a default starting point.

- **🐛 Bug / 🔧 Config:** if the current forwarder expense form auto-syncs sell = buy with no override, that contradicts the spec. The sell field needs to be an independently editable currency input that defaults to buy on creation but never re-syncs after the user touches it.
- **❓ Clarify:** does NePO's "báo giá" (price list) live anywhere yet? If not, do we want to introduce a service-fee-rate catalog separate from per-trip overrides?

### A3. Markup-permitted vs pass-through fees
**Pete explicitly lists:**
- **Pass-through (giữ nguyên giá gốc):** phí kết cấu hạ tầng, phí nâng hạ container, phí kiểm hóa tại cảng, phí cân hàng.
- **Markup allowed:** phí thủ tục hải quan, phí phục vụ kiểm hóa (NePO adds "phí quản lý" or tax to the customer invoice).

- **🔧 Config:** every entry in the **forwarder expense type catalog** needs a `markupPolicy` field:
  - `PASS_THROUGH` — sell price locked to buy, edit is blocked.
  - `MARKUP_ALLOWED` — sell defaults to buy + suggested management fee; freely editable.
- **🔧 Schema:** depends on `forwarder_expense_types` table — confirm whether `FORWARDER_EXPENSE_TYPE_DEFAULTS` constant in `shared/` already has the right type rows, and add the policy column.

### A4. Internal-only fees (not billed to customer)
**Pete:** Some forwarder expenses are NePO-internal — operator pays them but they're not on the customer invoice. Or they're invoiced under a different line item.

- **✨ Feature:** add `billingMode` to the forwarder expense line:
  - `BILL_TO_CUSTOMER` (default — appears on the debit note)
  - `INTERNAL_ONLY` (eaten by NePO, never on the invoice)
  - `BILL_AS_OTHER` (Pete's "báo theo hạng mục khác" — relabeled before being sent to the customer). **❓ Clarify** if this third mode is real or just rare.

### A5. VAT on service fees
**Pete:** All service fees carry 8% VAT today, may move to 10% if the government adjusts.

- **🔧 Config:** make the VAT rate a single config row, **not** a hardcoded constant. Per the standing-rules memory, financial precision goes through `shared/calculations` — confirm the VAT rate isn't already inlined there as `0.08`.
- **❓ Clarify:** is the rate the same for all service fees, or does it vary by type/customer?

---

## B. External vehicle dispatch

### B1. Capture partner driver info on external dispatch
**Pete:** For external trucks, must record: **license plate** (needed for invoicing transport), **driver name**, **phone** (given to the customer).

- **🐛 Bug / ✨ Feature:** the current external dispatch flow likely captures only the carrier (đối tác). Add `externalDriverName`, `externalDriverPhone`, `externalTruckPlate` to the trip when `dispatchMode = EXTERNAL`.
- These fields should appear on the debit note (per E2 below — customer-facing format).

### B2. Management profit = variable per-trip difference, no fixed %
**Pete:** Profit = sell price − buy price, varies per shipment, no formula or fixed margin. Varies by customer and partner.

- **✅ Confirm:** current code computes profit as a difference, not a margin — confirm no `EXTERNAL_DISPATCH_MARGIN_PCT` constant exists. Per Pete, no such constant should be applied.

### B3. Profit calc must use pre-VAT for both sides
**Pete:** Sell to customer is VAT-included, buy from partner is VAT-included. **Profit must be calculated on pre-VAT amounts** for accuracy.

- **🐛 Bug:** if the dispatch profit ledger is using gross (VAT-included) numbers, it under-states or over-states profit depending on rate symmetry. Audit `computeTripTotals()` and any external-dispatch finance code for this.
- **❓ Clarify:** is buy-side VAT always 8% (matching sell)? If a partner is on 10% and we're on 8%, the netting needs each side's actual rate.

---

## C. AR/AP netting (đối trừ công nợ)

### C1. Cadence + ownership
**Pete:** Monthly. NePO (kế toán) initiates AR/AP reconciliation; manager reviews and approves before release.

- **✨ Feature:** introduce a **netting batch** flow:
  - Accountant compiles the AR/AP delta per partner-who-is-also-a-customer at month-end.
  - Status: `DRAFT` → `PENDING_APPROVAL` (manager) → `APPROVED` → `RELEASED`.
- **🔧 RBAC:** approval step gated to MANAGER or ADMIN.

### C2. Full-amount, single-shot per month
**Pete:** Netting is the full **min(AR, AP)** in one shot per month — no partial netting, no "I only want to offset 50M of the 120M".

- **✅ Confirm:** netting amount = `min(receivable, payable)`. Payment of the remainder is out of scope (Pete: "việc 2 bên thanh toán như nào thì không cần đề cập").
- **🐛 Defensive:** the netting entry must be a compensating ADJUSTMENT pair in the append-only ledger (per the memory: ledger is append-only, never UPDATE).

---

## D. VAT (cross-cutting)

### D1. Single rate, currently 8%
**Pete:** VAT is uniformly 8% today, will move to 10%. Not per-customer, not per-route, not per-shipment.

- **🔧 Config:** one `vatRate` row in config. All other VAT logic reads from there.
- Connects with A5 — same rate for transport cước + service fees.

---

## E. Debit notes (giấy báo nợ)

### E1. Period varies by customer
**Pete:**
- **Road-only + ancillary services →** monthly consolidated debit note.
- **Road + sea + ancillary →** per-shipment debit note.

- **✨ Feature:** customer-level `debitNotePolicy` enum: `MONTHLY_CONSOLIDATED` | `PER_SHIPMENT`. Default `MONTHLY_CONSOLIDATED`. The debit-note generator branches on this.
- **❓ Clarify:** is the road/sea distinction a property of the customer (static config) or per-shipment (dynamic based on mode mix)?

### E2. Itemized line-by-line on the customer-facing debit note
**Pete:** Customer-facing debit note must show **each service as its own line** — transport cước and each ancillary service detailed separately. No bundling.

- **🐛 Bug / 📝 Wording:** check the current debit note PDF/template — if it concatenates service fees into one line, restructure.
- **❓ Clarify:** the docx referenced two example formats (GBN theo lô vs bảng kê theo tháng) but they're likely the image/table portion of the docx that wasn't extracted into the punch list. Re-export those examples or request the templates from Pete for fidelity.

---

## Cross-cutting follow-ups for Pete

1. The 5M VND direct-payment threshold (A1) — hard rule or guideline?
2. Does NePO's price list ("báo giá") exist as a document we can ingest, or is it only in Pete's head? (A2)
3. Does the "bill as a different category" mode (A4 BILL_AS_OTHER) actually exist in practice, or is it just an edge case to ignore?
4. Per-partner VAT rate possibility (B3) — what if a partner is on a different VAT bracket?
5. Customer-level `debitNotePolicy` (E1) — is the road/sea distinction static (customer property) or dynamic (per shipment)?
6. Re-share the two debit-note example formats from the docx (they didn't extract as text).

## How to act on this list

This file is a **triage punch list**, not an implementation plan. Suggested next step: Pete + product walk through each item, assign T-shirt sizing, prioritize, then split into individual implementation tickets. Several items (A3, A5, D1) are small config additions that can ship quickly; others (C1 netting workflow, E1+E2 debit-note redesign) are full features.
