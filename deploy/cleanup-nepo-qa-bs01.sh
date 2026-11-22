#!/usr/bin/env bash
# NEPO-62 QA cleanup — demo stack (demo.tingting.vip), run ON the vantai droplet.
#
# Removes the double-billing artifact QA left behind (build 312e5506, UI offers
# no delete for a Báo nợ bổ sung draft):
#   - draft Báo nợ bổ sung DN26110001-BS01 (22.500.000₫ — re-billed the lot's
#     freight on top of the issued main note)
#   - its AR adjustment 'Điều chỉnh công nợ theo Giấy báo nợ #36' (+500.000₫)
#
# The draft is removed through the API (DELETE /api/finance/billing-documents/:id,
# ADMIN-only): the service posts the reversal adjustment itself, so the ledger
# stays append-only and HTX Chè N Tân's balance returns to 20.275.600₫. The
# issued main note DN26110001 (22.000.000₫) and the post-issuance fee lines on
# the lô stay untouched — after the code fix, a fresh 'Bổ sung' will bill them
# correctly.
#
# Idempotent: the guard only fires on the exact wrong artifact (draft BS01 with
# total 22.500.000₫). A correctly regenerated -BS01 (500.000₫) is never touched;
# reruns after cleanup exit 0 with the current balance reported.
set -euo pipefail

PSQL() { docker exec demo-postgres-1 psql -U demo -d demo -tAc "$1" | head -1; }
API=http://127.0.0.1:3091/api

MAIN=$(PSQL "SELECT id FROM billing_documents WHERE document_number='DN26110001' AND parent_document_id IS NULL AND deleted_at IS NULL ORDER BY id DESC LIMIT 1")
[ -n "$MAIN" ] || { echo "GUARD FAIL — Báo nợ chính DN26110001 không tồn tại, dừng."; exit 1; }
CID=$(PSQL "SELECT id FROM customers WHERE lower(btrim(name))='htx chè n tân' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1")
[ -n "$CID" ] || { echo "GUARD FAIL — khách HTX Chè N Tân không tồn tại, dừng."; exit 1; }

BAL() { PSQL "SELECT coalesce(balance,0) FROM ledger WHERE entity_type='CUSTOMER' AND entity_id=$CID ORDER BY id DESC LIMIT 1"; }

DOC=$(PSQL "SELECT id FROM billing_documents WHERE document_number='DN26110001-BS01' AND parent_document_id=$MAIN AND issued_at IS NULL AND deleted_at IS NULL AND total_incl_vat='22500000' ORDER BY id DESC LIMIT 1")

if [ -z "$DOC" ]; then
  echo "CLEAN (idempotent) — không thấy draft BS01 sai (22.500.000₫). Không làm gì."
  echo "Số dư hiện tại của khách #$CID: $(BAL) (kỳ vọng 20275600)"
  exit 0
fi
echo "Thấy artifact QA: doc#$DOC (DN26110001-BS01 draft 22.500.000₫), main#$MAIN, customer#$CID"

# ── admin JWT signed with the container's own secret (seed-nepo-qa-unblock pattern) ──
TOKEN=$(docker exec demo-backend-1 node -e "console.log(require('jsonwebtoken').sign({userId:1,username:'admin',email:'admin@nepo.vn',fullName:'Trần Văn Admin',role:'ADMIN',jti:require('crypto').randomUUID()},process.env.JWT_SECRET,{expiresIn:'1h'}))")

RES=$(curl -sS -X DELETE "$API/finance/billing-documents/$DOC" -H "Authorization: Bearer $TOKEN" || echo '{"error":"curl failed"}')
echo "DELETE /api/finance/billing-documents/$DOC → ${RES:-<empty>}"

# ── verify ───────────────────────────────────────────────────────────────────
SOFT=$(PSQL "SELECT count(*) FROM billing_documents WHERE id=$DOC AND deleted_at IS NOT NULL")
REV=$(PSQL "SELECT coalesce(credit,0) FROM ledger WHERE txn_type='ADJUSTMENT' AND txn_id=$DOC AND txn_table='billing_documents' AND credit>0 ORDER BY id DESC LIMIT 1")
BAL=$(BAL)
MAINSTATE=$(PSQL "SELECT (issued_at IS NOT NULL AND deleted_at IS NULL AND total_incl_vat='22000000') FROM billing_documents WHERE id=$MAIN")
echo "verify: soft-deleted=$SOFT reversal_credit=$REV balance=$BAL main_issued_intact=$MAINSTATE"

if [ "$SOFT" = "1" ] && [ "$REV" = "500000" ] && [ "$BAL" = "20275600" ] && [ "$MAINSTATE" = "t" ]; then
  echo "CLEANUP OK — draft BS01 đã xóa, điều chỉnh +500.000₫ đã đảo qua bút toán, số dư về 20.275.600₫."
else
  echo "VERIFY FAILED — trạng thái sau xóa không khớp kỳ vọng, kiểm tra tay."
  exit 1
fi
