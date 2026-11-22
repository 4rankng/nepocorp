#!/usr/bin/env bash
# NEPO QA unblock seed — demo stack (demo.tingting.vip), run ON the vantai droplet.
# Idempotent-ish: customer insert guarded; everything else one-shot (rerun would duplicate
# trips/payments, so the script self-marks and exits if the guard rows exist).
set -euo pipefail

API=http://127.0.0.1:3091/api
PSQL() { docker exec demo-postgres-1 psql -U demo -d demo -tAc "$1" | head -1; }

# ── 0. guard: run once ────────────────────────────────────────────────────────
if [ "$(PSQL "SELECT count(*) FROM customers WHERE lower(btrim(name))='htx chè n tân' AND deleted_at IS NULL")" != "0" ]; then
  CID=$(PSQL "SELECT id FROM customers WHERE lower(btrim(name))='htx chè n tân' AND deleted_at IS NULL LIMIT 1")
  echo "guard: customer exists (id=$CID) — checking seeded receipt 9399"
  if [ "$(PSQL "SELECT count(*) FROM ledger WHERE receipt_id='9399' AND entity_id=$CID")" != "0" ]; then
    echo "already seeded — nothing to do"; exit 0
  fi
  EXISTING=$(PSQL "SELECT id FROM shipments WHERE customer_id=$CID AND deleted_at IS NULL ORDER BY id LIMIT 1")
  if [ -n "$EXISTING" ]; then
    SID=$EXISTING
    SCODE=$(PSQL "SELECT shipment_code FROM shipments WHERE id=$SID")
    SKIP_SHIPMENT=1
    echo "reusing shipment id=$SID code=$SCODE"
  fi
  if [ "$(PSQL "SELECT count(*) FROM ledger WHERE receipt_id='9399' AND entity_id=$CID")" != "0" ]; then
    echo "already seeded — nothing to do"; exit 0
  fi
else
  CID=$(PSQL "INSERT INTO customers (name, short_name, is_carrier, debit_note_mode, status)
              VALUES ('HTX Chè N Tân', 'CNT', false, 'MONTHLY', 'ACTIVE')
              ON CONFLICT DO NOTHING RETURNING id")
  [ -n "$CID" ] || { echo "customer insert failed"; exit 1; }
  echo "+ customer HTX Chè N Tân id=$CID (short_name CNT)"
fi

# ── 1. admin JWT signed with the container's own secret ─────────────────────
TOKEN=$(docker exec demo-backend-1 node -e "console.log(require('jsonwebtoken').sign({userId:1,username:'admin',email:'admin@nepo.vn',fullName:'Trần Văn Admin',role:'ADMIN',jti:require('crypto').randomUUID()},process.env.JWT_SECRET,{expiresIn:'12h'}))")
AUTH="Authorization: Bearer $TOKEN"
CALL() { local m=$1 p=$2 b=${3:-}; if [ -n "$b" ]; then curl -sS -X "$m" "$API$p" -H "$AUTH" -H 'Content-Type: application/json' -d "$b"; else curl -sS -X "$m" "$API$p" -H "$AUTH"; fi; }

# ── 2. shipment (auto code [CNT][26][STT]) ───────────────────────────────────
SKIP_SHIPMENT=${SKIP_SHIPMENT:-0}
if [ "$SKIP_SHIPMENT" = "1" ]; then
  echo "+ shipment reused id=$SID code=$SCODE"
else
SHIP=$(CALL POST /shipments '{"customerId":'"$CID"',"flowType":"XUAT","shippingLine":"MSC","bookingNo":"MSCU-939901","blNo":"MSCU-939902","vesselVoyage":"MSC ANNA V.611E","pol":"Hai Phong","pod":"Singapore","etd":"2026-11-20","eta":"2026-11-25","cutoffDate":"2026-11-19","containerSeals":"MSCU 4012345 / SEAL 01129","customsDeclarationNo":"40CQ20261100939","customsDeclarationDate":"2026-11-15","notes":"Lô QA test NEPO-61/62/63"}')
SID=$(echo "$SHIP" | jq -er .id) || { echo "shipment create failed: $SHIP"; exit 1; }
SCODE=$(echo "$SHIP" | jq -r .shipmentCode)
echo "+ shipment id=$SID code=$SCODE"
fi

# ── 3. documents (2 tiny real PDFs) ──────────────────────────────────────────
mkpdf() { printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\nxref\n0 4\n0000000000 65535 f \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%%%EOF\n' > "$1"; }
mkpdf /tmp/qa-booking.pdf; mkpdf /tmp/qa-bl.pdf
for T in BOOKING:qa-booking.pdf BL:qa-bl.pdf; do
  DT=${T%%:*}; F=${T##*:}
  DOC=$(curl -sS -X POST "$API/shipments/$SID/documents" -H "$AUTH" -F "file=@/tmp/$F;type=application/pdf" -F "docType=$DT")
  echo "$DOC" | jq -e .id >/dev/null || { echo "doc $DT failed: $DOC"; exit 1; }
  echo "+ document $DT id=$(echo "$DOC" | jq -r .id)"
done

# ── 4. lot costs (phí chờ — có hóa đơn, có tiền) ────────────────────────────
C1=$(CALL POST /shipments/$SID/costs '{"costType":"OTHER","direction":"SUPPLIER","serviceMode":"SERVICE","description":"Phí chờ tại cảng Hải Phòng (2 ngày)","currency":"VND","amount":3500000,"vatRate":0.08,"awaitingInvoice":false,"incurredDate":"2026-11-18"}')
C2=$(CALL POST /shipments/$SID/costs '{"costType":"DOCUMENT_SERVICE","direction":"SUPPLIER","serviceMode":"SERVICE","description":"Phí chứng từ B/L và C/O","currency":"VND","amount":1200000,"vatRate":0.08,"awaitingInvoice":false,"incurredDate":"2026-11-18"}')
echo "$C1" | jq -e .id >/dev/null || { echo "cost1 failed: $C1"; exit 1; }
echo "$C2" | jq -e .id >/dev/null || { echo "cost2 failed: $C2"; exit 1; }
echo "+ costs id=$(echo "$C1"|jq -r .id),$(echo "$C2"|jq -r .id)"

# ── 5. trips: A,B (Oct, trước biên lai 05/10) + C,D (Nov, trong kỳ, gắn lô) ──
mktrip() { # $1 date  $2 revenue  $3 shipmentId|''  — sets LAST_TID
  local DATE=$1 REV=$2 SHIPARG=${3:-} BODY TID SHIPJSON=""
  [ -n "$SHIPARG" ] && SHIPJSON=",\"shipmentId\":$SHIPARG" || true
  BODY="{\"customerId\":$CID,\"routeId\":1,\"truckId\":3,\"driverId\":5,\"cargoTypeId\":1,\"containerTypeId\":3,\"departureDate\":\"$DATE\",\"vatRate\":0.08$SHIPJSON}"
  T=$(CALL POST /trips "$BODY")
  TID=$(echo "$T" | jq -r '.id // empty')
  [ -n "$TID" ] || { echo "trip $DATE create failed: $T" >&2; exit 1; }
  V=$(echo "$T" | jq -r .version)
  R=$(CALL PUT /trips/$TID/pre-departure "{\"fuelMode\":\"AUTO\",\"revenue\":$REV,\"driverSalary\":8000000,\"version\":$V}")
  echo "$R" | jq -e .id >/dev/null || { echo "trip $TID pre-departure failed: $R" >&2; exit 1; }
  V=$(echo "$R" | jq -r .version)
  R=$(CALL POST /trips/$TID/dispatch)
  echo "$R" | jq -e .id >/dev/null || { echo "trip $TID dispatch failed: $R" >&2; exit 1; }
  R=$(CALL PUT /trips/$TID/actuals "{\"fuelMode\":\"AUTO\",\"revenue\":$REV,\"driverSalary\":8000000,\"version\":$V}")
  echo "$R" | jq -e .id >/dev/null || { echo "trip $TID actuals failed: $R" >&2; exit 1; }
  R=$(CALL POST /trips/$TID/complete)
  echo "$R" | jq -e .id >/dev/null || { echo "trip $TID complete failed: $R" >&2; exit 1; }
  R=$(CALL POST /trips/$TID/lock '{"confirmNoPhoto":true}')
  echo "$R" | jq -e .id >/dev/null || { echo "trip $TID lock failed: $R" >&2; exit 1; }
  LAST_TID=$TID
  echo "+ trip $TID $(echo "$R" | jq -r .tripCode) $DATE rev=$REV status=$(echo "$R" | jq -r .status)"
}
mktrip 2026-10-03 10000000; TID_A=$LAST_TID
mktrip 2026-10-04 5000000;  TID_B=$LAST_TID
mktrip 2026-11-12 10000000 "$SID"; TID_C=$LAST_TID
mktrip 2026-11-18 12000000 "$SID"; TID_D=$LAST_TID

# ── 6. receipt 9399: absorb A+B fully + 1.724.400 surplus (mirrors prod) ─────
DEB_A=$(PSQL "SELECT coalesce(debit,0) FROM ledger WHERE txn_type='TRIP_REVENUE' AND txn_id=$TID_A AND txn_table='trips' AND entity_type='CUSTOMER' AND entity_id=$CID ORDER BY id DESC LIMIT 1")
DEB_B=$(PSQL "SELECT coalesce(debit,0) FROM ledger WHERE txn_type='TRIP_REVENUE' AND txn_id=$TID_B AND txn_table='trips' AND entity_type='CUSTOMER' AND entity_id=$CID ORDER BY id DESC LIMIT 1")
PAY=$(( DEB_A + DEB_B + 1724400 ))
P=$(CALL POST /payments/receive "{\"customerId\":$CID,\"receiptId\":\"9399\",\"receivedDate\":\"2026-10-05\",\"paymentMethod\":\"BANK\",\"payments\":[{\"tripId\":$TID_A,\"amount\":$PAY}]}")
echo "$P" | jq -e .ok >/dev/null || { echo "payment failed: $P"; exit 1; }
echo "+ payment receipt 9399: $PAY (A=$DEB_A B=$DEB_B surplus=1724400) $(echo "$P" | jq -c .)"

echo "SEED OK — customer=$CID shipment=$SID($SCODE) trips=$TID_A,$TID_B,$TID_C,$TID_D receipt=9399"
