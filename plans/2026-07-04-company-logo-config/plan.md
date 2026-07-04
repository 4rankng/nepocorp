# Company Logo Config + De-hard-code Brand Literals

**Status:** done
**Created:** 2026-07-04
**Completed:** 2026-07-04
**Scope owner:** backend + frontend + shared

## Problem

Company info (name, address, MST, representative, bank) is already configurable at
`/config/company-info` and consumed by both `giấy báo nợ` (DEBIT_NOTE) and `bảng kê`
(PAYMENT_STATEMENT) XLSX exports. Two gaps remain:

1. **No company logo.** The XLSX header falls back to a hard-coded literal
   `'NePO\nPower your success'` (`billingDocument.service.ts:1532`). A parallel per-template
   `logoStorageKey` exists on `debit_note_templates` — a duplicated, barely-used logo source
   that invites exactly the hard-coding the user wants gone.
2. **Hard-coded brand literals** scattered across export services (`wb.creator`,
   footer `— TingTing Logistics`).

## Goal

Single source of truth for the company logo in `app_settings` (`company.logo_storage_key`),
edited at `/config/company-info`, rendered on every XLSX that carries company info. Zero
hard-coded brand text in export code.

## Non-negotiable constraints

- No brand-text literals in export code. Fallback when no logo = `company.name` (configurable), never a literal.
- One logo only. The per-template `logoStorageKey` is removed entirely (column, snapshot field, upload route, editor UI).
- Reuse existing `storageService` + `wb.addImage({ base64, extension: 'png' })` pattern. PNG normalization (per memory: ExcelJS can't embed webp).
- Migration must be idempotent + forward-dated `when` (per [[drizzle-migrate-timestamp-not-hash]] — prod journal desync history).
- RBAC unchanged on the backend (ADMIN+MANAGER+ACCOUNTANT already allowed); frontend route stays as-is this round.

## Out of scope

- Widening `/config/company-info` RBAC on the frontend (separate small job).
- Adding the logo to fuel-voucher (internal doc, no company body fields).
- Frontend sidebar `TingTing Logistics v1.2.0` (`Layout.tsx:483`) — app chrome, not document export.
- Removing the vestigial per-template `issuer*` fields (separate cleanup).

---

## Phase 1 — Company logo feature

### 1.1 Shared types + schema
- `shared/src/types/index.ts:230` — add `logoStorageKey: string | null` to `CompanyInfo`.
- `shared/src/schemas/index.ts:572` — add `logoStorageKey: z.string().nullable().optional()` to `companyInfoSchema`.
- Rebuild `shared` (backend reads from `dist/`).

### 1.2 Backend company-info service + route
- `backend/src/services/company-info.service.ts`:
  - Add `logoStorageKey: 'company.logo_storage_key'` to `COMPANY_INFO_SETTING_KEYS`.
  - Add `logoStorageKey: null` to `COMPANY_INFO_DEFAULTS`.
  - `companyInfoFromSettings` already maps generically — verify null default holds.
- `backend/src/routes/config.ts:297` (PUT `/company-info`): handle nullable logoStorageKey — write `company.logo_storage_key` (allow null/empty → store empty string or skip row). Confirm the iteration over `COMPANY_INFO_SETTING_KEYS` doesn't choke on a nullable field.

### 1.3 Upload route
- `backend/src/routes/upload.ts` — add `POST /company-logo` mirroring `POST /debit-note-template-logo` (line 234–262): multer single file, normalize to PNG, key `company-assets/logo-${uuid}.png`, `storageService.upload`, return `{ logoStorageKey }`. Guard: ADMIN+MANAGER+ACCOUNTANT (match config router).

### 1.4 Render logo on cả two doc types
- `backend/src/services/billingDocument.service.ts`:
  - Render path (lines 1526–1534): replace `loadDebitNoteLogoBytes(snap.logoStorageKey)` → load from `company.logoStorageKey` (company already loaded via `loadCompanyInfo()` near line 877; thread `company` into the render function).
  - Replace `logoCell.value = 'NePO\nPower your success'` (line 1532) → `logoCell.value = company.name`.
  - Confirm same render path serves both DEBIT_NOTE + PAYMENT_STATEMENT (it does — both go through `buildBillingXlsx`).

### 1.5 Remove per-template logo (full removal)
- `billingDocument.service.ts`: drop `logoStorageKey` from `DEFAULT_DEBIT_NOTE_SNAPSHOT` (line 88), `rowToTemplate` (133), `templateToSnapshot` (206), and delete `loadDebitNoteLogoBytes` if no longer referenced.
- `frontend/src/pages/config/DebitNoteTemplateEditorPage.tsx:141,167` — remove `logoStorageKey` from the form state + the logo upload UI block.
- `backend/src/routes/upload.ts:262` — remove `POST /debit-note-template-logo` route + its helper (lines 234–260).
- `backend/src/db/schema.ts:396` — remove `logo_storage_key` column from `debitNoteTemplates`.
- Migration `0095_drop_debit_note_template_logo.sql` (idempotent, forward-dated `when`): `ALTER TABLE debit_note_templates DROP COLUMN IF EXISTS logo_storage_key;`

### 1.6 Migration — seed company.logo_storage_key
- Migration `0096_company_logo_setting.sql` (idempotent, forward-dated): no-op seed — the row is created on first save via the PUT route; migration only ensures the path is journal-advanced past prod's max(created_at). (Per [[feedback-finalization-p0-migration]]: verify prod journal before relying on CI.)

### 1.7 Frontend — CompanyInfoConfigPage logo uploader
- `frontend/src/pages/config/CompanyInfoConfigPage.tsx`:
  - Add logo uploader above the field list: `<input type="file" accept="image/*" hidden>` + preview `<img>` (resolve via a signed-URL or `/api/storage/<key>` endpoint — confirm which the app uses) + "Xóa logo" button.
  - On select: POST `/api/upload/company-logo`, on success store returned `logoStorageKey` into form state; save persists via existing `saveCompanyInfo` PUT.
  - `configClient.ts` — add `uploadCompanyLogo(file)` helper.

### 1.8 Tests
- Update `backend/src/tests/debitNoteTemplates.service.test.ts` — remove `logoStorageKey` assertions; keep issuer assertions intact.
- Add company-info logo test: save with `logoStorageKey`, GET returns it; null is allowed.
- Render test: when `company.logo_storage_key` set → `wb.addImage` invoked; when null → header cell = `company.name` (not a literal).

---

## Phase 2 — De-hard-code remaining brand literals

Pull `company.name` via `loadCompanyInfo()` (or an existing cached read) at each site:

- `billingDocument.service.ts:937, 1434, 1731` — `wb.creator = company.name` (was `'NEPO Logistics'`).
- `fuel-voucher.service.ts:365` — `wb.creator = company.name` (was `'TingTing'`).
- `settlement-export.service.ts:236` — `workbook.creator = company.name`.
- `settlement-export.service.ts:541` — footer `— ${company.name}` (was `— TingTing Logistics`).

Note: `loadCompanyInfo` is currently private to billingDocument.service.ts. Either export it from `company-info.service.ts` as a cached `getCompanyInfo()` or duplicate the 2-line read. Prefer exporting from company-info.service.ts (DRY).

---

## Risks / rollback

- **DROP COLUMN** on `debit_note_templates.logo_storage_key` — safe (nullable, only the removed UI wrote it). If a prod template has a logo stored, that logo is lost on rollback; acceptable since the feature is being removed by design.
- **Prod migration desync** — prod journal historically lags (memory). Both new migrations must be idempotent + forward-dated; SSH-verify prod journal before deploy.
- **Logo storage path** — new prefix `company-assets/`. Confirm the storage serving route (GET) covers it; if serving is prefix-allowlisted, add `company-assets/`.
- **shared rebuild** — backend reads `shared/dist`; must rebuild after type/schema edits or PUT validation 500s.

## Acceptance criteria

1. Admin/manager/accountant can upload a PNG logo at `/config/company-info`; it persists and previews.
2. Generated `giấy báo nợ` and `bảng kê` show the uploaded logo in the header.
3. With no logo uploaded, header shows the configured `company.name` — no `NePO` / `Power your success` literal anywhere.
4. `debit_note_templates.logo_storage_key` column, the template-editor logo UI, and `POST /debit-note-template-logo` are all gone; XLSX still exports correctly.
5. `grep -rn "NePO\|Power your success\|'TingTing'\|'NEPO Logistics'" backend/src/services` returns nothing.
6. `cd backend && npm test` green; shared + backend + frontend tsc clean; vite build OK.
