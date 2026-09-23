.PHONY: dev stop down setup seed migrate generate build e2etest clean logs \
        push push-backend push-frontend \
        deploy deploy-backend deploy-frontend \
        demo demo-backend demo-frontend \
        prod-migrate prod-migrate-file \
        backup restore adminer

# ─── Ports ─────────────────────────────────────────────────────────────────────
# PostgreSQL: 5440  |  Redis: 6390  |  Backend: 3090  |  Frontend: 7173

# Local Adminer → PRODUCTION over a private SSH tunnel (make adminer).
# Never public (the nginx /adminer/ block was removed). Avoids 8081 (local dev adminer).
ADMINER_TUNNEL_PORT ?= 8082

# ─── Full dev environment ─────────────────────────────────────────────────────
dev: ## Start everything (db, redis, backend, frontend)
	@echo "Starting TingTing dev environment..."
	@docker compose -f docker-compose.dev.yml up -d --wait 2>/dev/null || \
		docker-compose -f docker-compose.dev.yml up -d
	@echo "Waiting for database..."
	@until pg_isready -h localhost -p 5440 -U postgres >/dev/null 2>&1 || \
		nc -z localhost 5440 >/dev/null 2>&1; do sleep 1; done
	@sleep 1
	@echo "Generating & running migrations..."
	@cd backend && npx drizzle-kit generate 2>/dev/null || true
	@cd backend && npx drizzle-kit migrate 2>&1 | grep -v "already exists, skipping" || true
	@echo "Starting backend (port 3090) and frontend (port 7173)..."
	@bash -c '\
		trap "kill 0" EXIT; \
		(cd backend && npx tsx watch src/index.ts) & \
		(cd frontend && npx vite --port 7173) & \
		wait'

# ─── Infrastructure only ──────────────────────────────────────────────────────
infra: ## Start only db and redis
	@docker compose -f docker-compose.dev.yml up -d --wait 2>/dev/null || \
		docker-compose -f docker-compose.dev.yml up -d

# ─── Database ──────────────────────────────────────────────────────────────────
migrate: ## Run database migrations
	cd backend && npx drizzle-kit migrate

generate: ## Generate migration from schema changes
	cd backend && npx drizzle-kit generate

seed: ## Seed database with sample data
	cd backend && npx tsx src/seed.ts

setup: infra ## First-time setup: infra + generate + migrate + seed
	@sleep 2
	@echo "Generating migrations..."
	@cd backend && npx drizzle-kit generate
	@echo "Applying migrations..."
	@cd backend && npx drizzle-kit migrate
	@echo "Seeding database..."
	@cd backend && npx tsx src/seed.ts
	@echo ""
	@echo "Setup complete! Run 'make dev' to start the app."
	@echo "  Frontend: http://localhost:7173"
	@echo "  Backend:  http://localhost:3090/api/health"
	@echo ""
	@echo "Login: admin / admin123"

# ─── Studio (Drizzle ORM GUI) ─────────────────────────────────────────────────
studio: ## Open Drizzle Studio
	cd backend && npx drizzle-kit studio

# ─── Build ─────────────────────────────────────────────────────────────────────
build: ## Build shared + backend + frontend
	cd shared && npx tsc
	cd backend && npx tsc
	cd frontend && npx vite build

# ─── E2E Tests ──────────────────────────────────────────────────────────────────
e2etest: ## Run E2E tests (requires make dev running)
	@bash e2e/run_all.sh $(ARGS)

# ─── Teardown ──────────────────────────────────────────────────────────────────
stop: ## Stop backend/frontend (keep db)
	@echo "Stopping app processes..."
	@pkill -f "tsx watch src/index.ts" 2>/dev/null || true
	@pkill -f "vite.*7173" 2>/dev/null || true

down: ## Stop everything including db and redis
	@docker compose -f docker-compose.dev.yml down 2>/dev/null || \
		docker-compose -f docker-compose.dev.yml down

clean: down ## Remove everything including database volume
	@docker compose -f docker-compose.dev.yml down -v 2>/dev/null || \
		docker-compose -f docker-compose.dev.yml down -v
	@echo "Cleaned up all containers and volumes."

# ─── Logs ──────────────────────────────────────────────────────────────────────
logs-db: ## Show database logs
	@docker compose -f docker-compose.dev.yml logs -f db 2>/dev/null || \
		docker-compose -f docker-compose.dev.yml logs -f db

logs-redis: ## Show redis logs
	@docker compose -f docker-compose.dev.yml logs -f redis 2>/dev/null || \
		docker-compose -f docker-compose.dev.yml logs -f redis

# ─── Production deploy ──────────────────────────────────────────────────────────

PROD_SERVER := nepo.tingting.vip

## push: Build & push all images to Docker Hub
push: push-backend push-frontend

## push-backend: Build & push backend image
push-backend:
	$(MAKE) -C backend push

## push-frontend: Build & push frontend image
push-frontend:
	$(MAKE) -C frontend push

## deploy: Pull & restart all services on droplet
deploy: deploy-backend deploy-frontend

## deploy-backend: Pull & restart backend on droplet + run migrations
deploy-backend: push-backend
	$(MAKE) -C backend deploy

## deploy-frontend: Pull & restart frontend on droplet
deploy-frontend: push-frontend
	$(MAKE) -C frontend deploy

# ─── Demo staging deploy (Docker Hub → demo.tingting.vip on the vantai droplet) ─
# Second stack on the vantai box, next to the (silversea-bound) /opt/vantai
# stack. Data is a one-time anonymized prod snapshot — deploys only ship code;
# never re-seed or wipe the demo DB.

DEMO_SERVER := demo.tingting.vip
DEMO_PATH := /opt/demo
DEMO_COMPOSE := deploy/docker-compose.demo.yml

## demo: Build, push images & deploy all services to demo staging
demo: demo-backend demo-frontend

## demo-backend: Push & deploy backend to demo staging + run migrations
demo-backend: push-backend
	@echo "Deploying backend on demo staging..."
	@ssh root@$(DEMO_SERVER) "cd $(DEMO_PATH) && docker compose -f $(DEMO_COMPOSE) pull backend"
	# The recreate is retried: a second deploy racing this one (or a removal left
	# half-finished by an interrupted run) makes compose fail with "removal of
	# container … is already in progress". That is transient — once the other run
	# finishes, the next attempt converges.
	@ok=0; for i in 1 2 3 4 5; do \
		if ssh root@$(DEMO_SERVER) "cd $(DEMO_PATH) && docker compose -f $(DEMO_COMPOSE) up -d --force-recreate --no-deps backend"; then ok=1; break; fi; \
		echo "  backend recreate busy, retrying ($$i)..."; \
		sleep 5; \
	done; test $$ok -eq 1
	@echo "Waiting for backend container to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if ssh root@$(DEMO_SERVER) "docker exec demo-backend-1 echo ok" >/dev/null 2>&1; then \
			break; \
		fi; \
		echo "  waiting... ($$i)"; \
		sleep 2; \
	done
	@echo "Running database migrations..."
	@ssh root@$(DEMO_SERVER) "docker exec demo-backend-1 npx drizzle-kit migrate"
	@echo "Reclaiming disk (unused images older than 72h)..."
	@ssh root@$(DEMO_SERVER) "docker image prune -af --filter 'until=72h' || true"
	@echo "Demo backend deployed! API: https://$(DEMO_SERVER)/api/health"

## demo-frontend: Push & deploy frontend to demo staging
demo-frontend: push-frontend
	@echo "Deploying frontend on demo staging..."
	@ssh root@$(DEMO_SERVER) "cd $(DEMO_PATH) && docker compose -f $(DEMO_COMPOSE) pull frontend"
	@ok=0; for i in 1 2 3 4 5; do \
		if ssh root@$(DEMO_SERVER) "cd $(DEMO_PATH) && docker compose -f $(DEMO_COMPOSE) up -d --force-recreate --no-deps frontend"; then ok=1; break; fi; \
		echo "  frontend recreate busy, retrying ($$i)..."; \
		sleep 5; \
	done; test $$ok -eq 1
	@echo "Reclaiming disk (unused images older than 72h)..."
	@ssh root@$(DEMO_SERVER) "docker image prune -af --filter 'until=72h' || true"
	@echo "Demo frontend deployed! App: https://$(DEMO_SERVER)"

## prod-migrate: Apply all Drizzle SQL migrations to production DB
## (skips *.revert.sql — dev-rollback pairs must never run against prod)
prod-migrate:
	@echo "==> Applying migrations on production..."
	@for f in $(shell ls backend/drizzle/*.sql | grep -v '\.revert\.sql'); do \
		basename=$$(basename "$$f"); \
		echo "  Copying $$basename..."; \
		scp "$$f" root@$(PROD_SERVER):/tmp/$$basename; \
		ssh root@$(PROD_SERVER) "docker cp /tmp/$$basename nepocorp-postgres-1:/tmp/$$basename"; \
		echo "  Applying $$basename..."; \
		ssh root@$(PROD_SERVER) "docker exec nepocorp-postgres-1 psql -U nepocorp -d nepocorp \
			-v ON_ERROR_STOP=1 --single-transaction -f /tmp/$$basename" \
			&& echo "  ✅ $$basename" \
			|| echo "  ⚠️  $$basename skipped (already applied)"; \
		ssh root@$(PROD_SERVER) "rm -f /tmp/$$basename"; \
	done
	@echo "==> Restarting backend..."
	ssh root@$(PROD_SERVER) "docker restart nepocorp-backend-1"
	@echo "==> ✅ All migrations applied"

## prod-migrate-file: Apply a single migration file (make prod-migrate-file FILE=0022_cool_hydra.sql)
prod-migrate-file:
	@test -n "$(FILE)" || (echo "Usage: make prod-migrate-file FILE=0022_cool_hydra.sql" && exit 1)
	@echo "==> Applying $(FILE) on production..."
	scp backend/drizzle/$(FILE) root@$(PROD_SERVER):/tmp/$(FILE)
	ssh root@$(PROD_SERVER) "docker cp /tmp/$(FILE) nepocorp-postgres-1:/tmp/$(FILE)"
	ssh root@$(PROD_SERVER) "docker exec nepocorp-postgres-1 psql -U nepocorp -d nepocorp \
		-v ON_ERROR_STOP=1 --single-transaction -f /tmp/$(FILE)"
	ssh root@$(PROD_SERVER) "rm -f /tmp/$(FILE)"
	@echo "==> ✅ $(FILE) applied"

## backup: Dump production PostgreSQL DB → OneDrive
backup:
	@echo "💾 Starting database backup from production..."
	@TIMESTAMP=$$(date +%Y-%m-%d_%H%M%S) && \
	BACKUP_DIR="/Users/dev/Library/CloudStorage/OneDrive-Personal/backup/tingting_db_backup" && \
	BACKUP_FILE="tingting_pg_backup_$$TIMESTAMP.sql" && \
	BACKUP_FILE_GZ="tingting_pg_backup_$$TIMESTAMP.sql.gz" && \
	mkdir -p "$$BACKUP_DIR" && \
	echo "📊 Creating PostgreSQL dump of tingting database..." && \
	ssh root@$(PROD_SERVER) \
		"docker exec nepocorp-postgres-1 \
		pg_dump -U nepocorp nepocorp > /tmp/$$BACKUP_FILE" && \
	echo "🗜️  Compressing..." && \
	ssh root@$(PROD_SERVER) "gzip /tmp/$$BACKUP_FILE" && \
	ssh root@$(PROD_SERVER) \
		"if [ ! -s /tmp/$$BACKUP_FILE_GZ ]; then echo '❌ Backup file is empty!'; exit 1; fi" && \
	echo "📥 Downloading to local machine..." && \
	scp root@$(PROD_SERVER):/tmp/$$BACKUP_FILE_GZ "$$BACKUP_DIR/$$BACKUP_FILE_GZ" && \
	ssh root@$(PROD_SERVER) "rm -f /tmp/$$BACKUP_FILE_GZ" && \
	echo "✅ Backup complete!" && \
	echo "📂 Saved to: $$BACKUP_DIR/$$BACKUP_FILE_GZ" && \
	echo "📊 Size: $$(du -h "$$BACKUP_DIR/$$BACKUP_FILE_GZ" | cut -f1)"

## restore: Restore latest backup from OneDrive to local dev DB
restore:
	@echo "🐳 Starting DB container..." && \
	docker compose -f docker-compose.dev.yml up -d --wait db 2>/dev/null || \
		docker-compose -f docker-compose.dev.yml up -d db && \
	echo "⏳ Waiting for DB to be ready..." && \
	until docker exec tingting-db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done && \
	BACKUP_DIR="/Users/dev/Library/CloudStorage/OneDrive-Personal/backup/tingting_db_backup" && \
	LATEST=$$(ls -t "$$BACKUP_DIR"/tingting_pg_backup_*.sql.gz 2>/dev/null | head -1) && \
	if [ -z "$$LATEST" ]; then echo "❌ No backup files found in $$BACKUP_DIR"; exit 1; fi && \
	echo "📂 Using backup: $$LATEST" && \
	echo "📊 Size: $$(du -h "$$LATEST" | cut -f1)" && \
	echo "⏳ Decompressing..." && \
	gunzip -k -f "$$LATEST" && \
	SQL_FILE="$${LATEST%.gz}" && \
	echo "🗑️  Terminating active connections and recreating local database..." && \
	docker exec tingting-db psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'tingting' AND pid <> pg_backend_pid();" && \
	docker exec tingting-db psql -U postgres -c "DROP DATABASE IF EXISTS tingting;" && \
	docker exec tingting-db psql -U postgres -c "CREATE DATABASE tingting;" && \
	docker exec tingting-db psql -U postgres -c "CREATE ROLE nepocorp WITH LOGIN PASSWORD 'nepocorp';" 2>/dev/null || true && \
	echo "📥 Restoring backup into local database..." && \
	docker exec -i tingting-db psql -U postgres -d tingting < "$$SQL_FILE" && \
	rm -f "$$SQL_FILE" && \
	echo "🔑 Resetting all user passwords to admin123..." && \
	HASH=$$(cd backend && node -e "console.log(require('bcryptjs').hashSync('admin123',10))") && \
	docker exec tingting-db psql -U postgres -d tingting -c "UPDATE users SET password_hash = '$$HASH';" && \
	echo "✅ Restore complete! All passwords reset to admin123"

## adminer: Open prod Adminer over a private SSH tunnel → http://localhost:8082 (Ctrl-C to close)
# Self-healing: starts the loopback-only adminer container on prod (127.0.0.1:8080,
# never public), forwards localhost:8082 → prod loopback:8080, opens the page. Ctrl-C
# closes the tunnel; the container stays on prod loopback (safe). Adminer reaches
# postgres over the prod docker network (Server: postgres · DB/user: nepocorp).
adminer:
	@echo "🔓 Opening prod Adminer over SSH tunnel (private, no public exposure)..."
	@ssh root@$(PROD_SERVER) "cd /opt/nepocorp/deploy && docker compose -f docker-compose.prod.yml --profile adminer up -d adminer"
	@echo "⏳ Waiting for Adminer on prod 127.0.0.1:8080..."
	@ssh root@$(PROD_SERVER) "for i in \$$(seq 1 30); do (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | grep -qE '127\\.0\\.0\\.1:8080[[:space:]]' && exit 0; sleep 1; done; echo '❌ Adminer did not become ready in 30s' >&2; exit 1"
	@echo "🌐 Adminer: http://localhost:$(ADMINER_TUNNEL_PORT)"
	@echo "   System: PostgreSQL  ·  Server: postgres  ·  Database: nepocorp  ·  Username: nepocorp"
	@echo "   Password: $$(ssh root@$(PROD_SERVER) "grep -E '^DB_PASSWORD=' /opt/nepocorp/deploy/.env 2>/dev/null | head -1 | cut -d= -f2-" || echo 'NepoProd2026 (default)')"
	@echo "⏎  Press Ctrl-C to close the tunnel. (Container stays on prod loopback — safe to leave running.)"
	@(sleep 1 && (open "http://localhost:$(ADMINER_TUNNEL_PORT)?server=postgres&db=nepocorp" || xdg-open "http://localhost:$(ADMINER_TUNNEL_PORT)?server=postgres&db=nepocorp" || true)) &
	@ssh -N -L $(ADMINER_TUNNEL_PORT):127.0.0.1:8080 root@$(PROD_SERVER)

# ─── Help ──────────────────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Production deploy (Docker Hub → droplet):"
	@echo "  \033[36mpush          \033[0m Build & push all images to Docker Hub"
	@echo "  \033[36mpush-backend  \033[0m Build & push backend image"
	@echo "  \033[36mpush-frontend \033[0m Build & push frontend image"
	@echo "  \033[36mdeploy        \033[0m Pull & restart all services on droplet"
	@echo "  \033[36mdeploy-backend\033[0m Pull & restart backend + run migrations"
	@echo "  \033[36mdeploy-frontend\033[0m Pull & restart frontend on droplet"
	@echo "  \033[36mdeploy-infra  \033[0m Restart infra services (postgres, redis)"
	@echo ""
	@echo "Demo staging deploy (Docker Hub → demo.tingting.vip, /opt/demo on the vantai droplet):"
	@echo "  \033[36mdemo          \033[0m Build, push images & deploy all to demo staging"
	@echo "  \033[36mdemo-backend  \033[0m Push & deploy backend to demo staging (+ migrations)"
	@echo "  \033[36mdemo-frontend \033[0m Push & deploy frontend to demo staging"
	@echo "  \033[36mprod-migrate  \033[0m Apply all SQL migrations to production DB"
	@echo "  \033[36mprod-migrate-file \033[0m Apply single migration (FILE=xxx.sql)"
	@echo "  \033[36mbackup        \033[0m Dump production DB → OneDrive"
	@echo "  \033[36mrestore       \033[0m Restore latest backup to local dev DB"
	@echo "  \033[36madminer       \033[0m Prod Adminer over private SSH tunnel → localhost:8082"
