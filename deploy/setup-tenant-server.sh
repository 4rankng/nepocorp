#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# TingTing — tenant droplet one-time setup (haidang / ankhanh / namphong)
#
# Usage:  ssh root@<tenant>.tingtingsoft.vn 'TENANT=<tenant> bash -s' < deploy/setup-tenant-server.sh
#
# After this script completes (from the local machine):
#   1. make push && make <tenant>
#   2. ssh root@<tenant>.tingtingsoft.vn 'certbot --nginx -d <tenant>.tingtingsoft.vn'
#   3. make tenant-users TENANT=<tenant>    # first logins: admin/giamdoc/ketoan/laixe/giaonhan / Abc123
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${TENANT:?TENANT must be set, e.g. ssh root@haidang.tingtingsoft.vn 'TENANT=haidang bash -s' < deploy/setup-tenant-server.sh}"

echo "=== TingTing Tenant Setup: $TENANT ==="
echo ""

# ── 1. Update System ─────────────────────────────────────────────────────────
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# ── 2. Install Docker ────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# ── 3. Install Nginx & Certbot ───────────────────────────────────────────────
echo "🌐 Installing Nginx and Certbot..."
apt install -y nginx certbot python3-certbot-nginx

# ── 4. Configure Firewall (UFW) ─────────────────────────────────────────────
# Only when not already active — a box with its own rules keeps them.
if ufw status 2>/dev/null | grep -q "Status: active"; then
    echo "✅ UFW already active — leaving existing rules in place"
else
    echo "🔥 Configuring UFW firewall..."
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw --force enable
    echo "✅ Firewall configured (SSH + HTTP + HTTPS only)"
fi

# ── 5. Create Directory Structure ────────────────────────────────────────────
echo "📁 Creating directory structure..."
mkdir -p /opt/$TENANT/data/postgres
mkdir -p /opt/$TENANT/data/redis
mkdir -p /opt/$TENANT/data/uploads
mkdir -p /opt/$TENANT/deploy
mkdir -p /var/www/certbot
echo "✅ Directories created"

# ── 6. Generate Secrets ──────────────────────────────────────────────────────
# Never overwrite an existing .env: its DB_PASSWORD is baked into the postgres
# volume, so regenerating it would orphan the database.
if [ -f /opt/$TENANT/deploy/.env ]; then
    echo "⚠️  /opt/$TENANT/deploy/.env already exists — keeping it"
else
    JWT_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr '+/' '-_')

    echo "🔑 Generating secrets..."
    cat > /opt/$TENANT/deploy/.env << EOF
# Auth
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# Database
DB_PASSWORD=${DB_PASSWORD}

# Tenant (drives compose project name → container names, CORS origin)
TENANT=${TENANT}
COMPOSE_PROJECT_NAME=${TENANT}

# Google Maps
GOOGLE_MAPS_API_KEY=
EOF
    chmod 600 /opt/$TENANT/deploy/.env
    echo "✅ Secrets generated and saved to /opt/$TENANT/deploy/.env"
fi

# ── 7. Write Nginx Config ────────────────────────────────────────────────────
echo "📝 Writing Nginx configuration..."
# Unquoted heredoc so $TENANT expands; nginx's own $vars are escaped.
cat > /etc/nginx/sites-available/$TENANT << NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $TENANT.tingtingsoft.vn;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /uploads/ {
        alias /opt/$TENANT/data/uploads/;
        expires 30d;
        add_header Cache-Control "public";
        add_header X-Content-Type-Options "nosniff" always;
    }

    location /api/ {
        proxy_pass         http://127.0.0.1:3090;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        client_max_body_size 20m;
    }

    # socket.io — the command-and-insight assistant transport (/agent
    # namespace, path /socket.io). Must reach the backend (3090), not the
    # frontend SPA. WebSocket upgrade + long read timeout for multi-tool turns.
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:3090;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
NGINX

# Enable site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/$TENANT /etc/nginx/sites-enabled/
nginx -t && systemctl enable nginx && systemctl restart nginx
echo "✅ Nginx configured"

# ── 8. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  ✅ Tenant '$TENANT' server setup complete!"
echo "=========================================="
echo ""
echo "Next steps from your LOCAL machine:"
echo ""
echo "  1. Push images:"
echo "     make push"
echo ""
echo "  2. Deploy to this droplet:"
echo "     make $TENANT"
echo ""
echo "  3. Enable SSL (first time only):"
echo "     ssh root@$TENANT.tingtingsoft.vn 'certbot --nginx -d $TENANT.tingtingsoft.vn'"
echo ""
echo "  4. Create the initial users (idempotent):"
echo "     make tenant-users TENANT=$TENANT"
echo "     Logins: admin / giamdoc / ketoan / laixe / giaonhan — password Abc123"
echo ""
echo "  5. Test login:"
echo "     https://$TENANT.tingtingsoft.vn"
echo ""
echo "Secrets saved to: /opt/$TENANT/deploy/.env"
