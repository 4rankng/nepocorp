#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# TingTing demo staging — one-time setup on the vantai droplet
#
# Usage (from the repo root, AFTER staging the compose + nginx files):
#   ssh root@vantai.tingting.vip 'mkdir -p /opt/demo/deploy'
#   scp deploy/docker-compose.demo.yml root@vantai.tingting.vip:/opt/demo/deploy/
#   scp deploy/nginx-host-demo.conf root@vantai.tingting.vip:/etc/nginx/sites-available/demo
#   ssh root@vantai.tingting.vip 'ln -sf /etc/nginx/sites-available/demo /etc/nginx/sites-enabled/demo && nginx -t && systemctl reload nginx'
#   ssh root@vantai.tingting.vip 'bash -s' < deploy/setup-demo-server.sh
#
# What it does (additive only — nothing under /opt/vantai is touched):
#   1. Create /opt/demo directory structure
#   2. Generate /opt/demo/deploy/.env — fresh JWT_SECRET + DB_PASSWORD,
#      integration keys (Maps, assistant LLM, web-push VAPID) copied from the
#      vantai stack's .env so the demo has working maps/bot/push
#   3. Issue the TLS certificate: certbot --nginx -d demo.tingting.vip
#   4. Start postgres + redis only (backend/frontend start in Phase 4 against
#      the anonymized data load)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE=/opt/demo/deploy/docker-compose.demo.yml
VANTAI_ENV=/opt/vantai/deploy/.env

echo "=== TingTing demo staging setup ==="

# ── 1. Directories ────────────────────────────────────────────────────────────
echo "📁 Creating directory structure..."
mkdir -p /opt/demo/data/postgres
mkdir -p /opt/demo/data/redis
mkdir -p /opt/demo/data/uploads
mkdir -p /opt/demo/deploy
echo "✅ Directories created"

# ── 2. Secrets ────────────────────────────────────────────────────────────────
if [ -f /opt/demo/deploy/.env ]; then
    echo "ℹ️  .env already exists — keeping it (delete it to regenerate)"
else
    echo "🔑 Generating .env..."

    # Copy integration keys from the vantai stack (never printed to stdout).
    # Keys that are missing or set to an empty value are skipped — the trailing
    # return 0 keeps `set -e` happy when nothing is copied.
    copy_key() {
        local key="$1"
        local value
        value=$(grep -E "^${key}=" "$VANTAI_ENV" 2>/dev/null | head -1 | cut -d= -f2- || true)
        if [ -n "$value" ]; then
            printf '%s=%s\n' "$key" "$value"
        fi
        return 0
    }

    {
        echo "# Auth (demo staging)"
        echo "JWT_SECRET=$(openssl rand -base64 32)"
        echo "JWT_EXPIRES_IN=7d"
        echo ""
        echo "# Database"
        echo "DB_PASSWORD=$(openssl rand -base64 24 | tr '+/' '-_')"
        echo ""
        echo "# Integration keys copied from the vantai stack"
        copy_key GOOGLE_MAPS_API_KEY
        copy_key BOT_ENABLE
        copy_key MINIMAX_BASE_URL
        copy_key MINIMAX_MODEL
        copy_key MINIMAX_ENABLE
        copy_key MINIMAX_API_KEY
        copy_key AGENT_MAX_ITERATIONS
        copy_key OPENROUTER_ENABLE
        copy_key OPENROUTER_API_KEY
        copy_key VAPID_PUBLIC_KEY
        copy_key VAPID_PRIVATE_KEY
    } > /opt/demo/deploy/.env

    chmod 600 /opt/demo/deploy/.env
    echo "✅ Secrets generated ($(grep -c '=' /opt/demo/deploy/.env) keys)"
fi

# ── 3. TLS certificate ────────────────────────────────────────────────────────
if certbot certificates 2>/dev/null | grep -q "demo.tingting.vip"; then
    echo "✅ Certificate for demo.tingting.vip already exists"
else
    echo "🔒 Issuing certificate for demo.tingting.vip..."
    certbot --nginx -d demo.tingting.vip --non-interactive --agree-tos
    echo "✅ Certificate issued"
fi

# ── 4. Start infrastructure ───────────────────────────────────────────────────
echo "🗄️  Starting postgres + redis..."
docker compose -f "$COMPOSE" up -d postgres redis

echo "⏳ Waiting for postgres to be healthy..."
for i in $(seq 1 30); do
    if docker compose -f "$COMPOSE" exec -T postgres pg_isready -U demo -d demo >/dev/null 2>&1; then
        echo "✅ Postgres healthy"
        break
    fi
    [ "$i" -eq 30 ] && { echo "❌ Postgres not healthy after 30s"; exit 1; }
    sleep 1
done

echo ""
echo "=========================================="
echo "  ✅ Demo staging infrastructure ready!"
echo "=========================================="
echo ""
echo "Next: load the anonymized snapshot, then:"
echo "  docker compose -f $COMPOSE up -d backend frontend"
echo "  App: https://demo.tingting.vip  (login: admin / admin123)"
