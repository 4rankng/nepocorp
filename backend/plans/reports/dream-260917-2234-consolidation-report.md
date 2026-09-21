# Dream Memory Consolidation Report — 2026-09-17 22:34–23:00

**Run:** manual (user-invoked), all 4 phases, all 33 projects with memory dirs
**Concurrency:** a sibling dream pass ran simultaneously (first seen 22:47); all collisions reconciled on-disk, final state verified stable (5s mtime check)

## Phase 1 — ORIENT
- Config: `DREAM_MEMORY_TYPE=native` → target `~/.claude/projects/*/memory/`
- 33 projects mapped; 3 empty (incl. the active nepocorp Lexar-path home — flagged as the critical gap)
- Dormant >90d (untouched, flagged not archived): tuyennhanvien-vn, vfic-ats-ChatbotX, vfic-ats-n8n (Jun 20); MetaGPT, -Users-dev-Documents-projects (Jun 17/22)

## Phase 2 — GATHER SIGNAL
- 7-day transcript window; jq-based user-message extraction (keyword net + full dumps for quiet projects)
- Hot zones: silversea-prod (~30 sessions, 9.5k user msgs), payroll (6 sessions today), silversea-main, chatbot, nepocorp, vantaiphucloc
- Silversea-prod memory already fresh (self-consolidated 09-16/09-17); vantaiphucloc memory (09-16) newer than its last session — nothing to add

## Phase 3 — CONSOLIDATE (writes)

| Project | Change |
|---|---|
| **nepocorp** (Lexar) | **Memory home MIGRATED** Documents→Lexar path: 81 files copied verbatim; merged index (139 lines) with sibling's `checkout-and-patch-sync.md` row; legacy index preserved as `MEMORY-legacy-inline.md`; legacy dir untouched |
| **payroll** (Lexar) | New `facts.md` (wallet forecast outlier fix 40bda95b 2.84B→905M; locked-gap ruling 0140722d; BCC sheet trim 02a40e99), `corrections.md` (chuyển lô cap 3-step correction chain → bounded slider ruling); merged sibling's 4 files into one 6-row index (sibling had absorbed `payroll-deploy-and-settings.md` into `payroll-ops-2026-09-17.md` mid-run) |
| **silversea-prod** (Lexar) | Appended 2 entries to `lenh-chay-ngoai-domain.md` (MasterDataNhaMay.md §4 expansion + form-toggle ruling; docx authority note); index row bumped; complemented (not duplicated) sibling's `business-language-docx-reports.md` |
| **silversea-main** | Added recurring prod→main merge pattern line (09-15 + 09-17 runs) |
| **chatbot** (Lexar) | Consolidated-date bump only — 09-16 session reconfirmed known avatar-precedence ruling |
| **silversea** (Documents) | New `customer-complaints-reproduced-2026-09-17.md`: 3 CUS bugs reproduced on staging (lot factory label, BL sibling delivery-date, create-lot combobox re-search) — open defects relevant to the zero-open-issues prod gate |

Backups written to `<memory>/memory-backup-<ts>/` before every modified dir. No deletion without replacement (skill safety rule); legacy nepocorp dir kept read-only.

## Phase 4 — PRUNE & INDEX
- All MEMORY.md < 200 lines (max: Documents-payroll 162)
- Ghost-row check on modified indexes: every referenced file exists
- No relative dates in new entries (grep-verified clean)
- `.last-dream` stamped in all 33 memory dirs; `.dream-pending` removed
- Prune decision: dormant >90d projects flagged in this report instead of archived — repos may still exist; archiving whole projects needs user confirmation

## Race-condition notes (for future dream passes)
- Concurrent passes clobber each other's index rewrites; the QR guidance in silversea-prod memory ("use Bash, backup first, re-check mtimes") held up — two mid-run overwrites were caught and reconciled
- Recommend future passes re-read MEMORY.md immediately before writing and prefer targeted `sed` row edits over full-file rewrites when a sibling is active
