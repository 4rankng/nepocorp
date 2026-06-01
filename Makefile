.PHONY: dev stop down setup seed migrate generate build e2etest clean logs \
        push push-backend push-frontend \
        deploy deploy-backend deploy-frontend deploy-infra \
        backup restore adminer-on adminer-off

# ─── Ports ─────────────────────────────────────────────────────────────────────
# PostgreSQL: 5440  |  Redis: 6390  |  Backend: 3090  |  Frontend: 7173

# ─── Full dev environment ─────────────────────────────────────────────────────
dev: ## Start everything (db, redis, backend, frontend)
	@echo "Starting NEPO dev environment..."
	@docker compose -f docker-compose.dev.yml up -d --wait 2>/dev/null || \
		docker-compose -f docker-compose.dev.yml up -d
	@echo "Waiting for database..."
	@until pg_isready -h localhost -p 5440 -U postgres >/dev/null 2>&1 || \
		nc -z localhost 5440 >/dev/null 2>&1; do sleep 1; done
	@sleep 1
	@echo "Generating & running migrations..."
	@cd backend && npx drizzle-kit generate 2>/dev/null || true
	@cd backend && npx drizzle-kit migrate
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
deploy-backend:
	$(MAKE) -C backend deploy

## deploy-frontend: Pull & restart frontend on droplet
deploy-frontend:
	$(MAKE) -C frontend deploy

## deploy-infra: Restart infra services (postgres, redis) on droplet
deploy-infra:
	@echo "Restarting infrastructure services on production..."
	ssh root@$(PROD_SERVER) "cd /opt/nepocorp && docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate postgres redis"
	@echo "Infrastructure restarted."

## backup: Dump production PostgreSQL DB → OneDrive
backup:
	@echo "💾 Starting database backup from production..."
	@TIMESTAMP=$$(date +%Y-%m-%d_%H%M%S) && \
	BACKUP_DIR="/Users/dev/Library/CloudStorage/OneDrive-Personal/backup/nepocorp_db_backup" && \
	BACKUP_FILE="nepo_pg_backup_$$TIMESTAMP.sql" && \
	BACKUP_FILE_GZ="nepo_pg_backup_$$TIMESTAMP.sql.gz" && \
	mkdir -p "$$BACKUP_DIR" && \
	echo "📊 Creating PostgreSQL dump of nepocorp database..." && \
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
	until docker exec nepo-db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done && \
	BACKUP_DIR="/Users/dev/Library/CloudStorage/OneDrive-Personal/backup/nepocorp_db_backup" && \
	LATEST=$$(ls -t "$$BACKUP_DIR"/nepo_pg_backup_*.sql.gz 2>/dev/null | head -1) && \
	if [ -z "$$LATEST" ]; then echo "❌ No backup files found in $$BACKUP_DIR"; exit 1; fi && \
	echo "📂 Using backup: $$LATEST" && \
	echo "📊 Size: $$(du -h "$$LATEST" | cut -f1)" && \
	echo "⏳ Decompressing..." && \
	gunzip -k -f "$$LATEST" && \
	SQL_FILE="$${LATEST%.gz}" && \
	echo "🗑️  Terminating active connections and recreating local database..." && \
	docker exec nepo-db psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'nepocorp' AND pid <> pg_backend_pid();" && \
	docker exec nepo-db psql -U postgres -c "DROP DATABASE IF EXISTS nepocorp;" && \
	docker exec nepo-db psql -U postgres -c "CREATE DATABASE nepocorp;" && \
	echo "📥 Restoring backup into local database..." && \
	docker exec -i nepo-db psql -U postgres -d nepocorp < "$$SQL_FILE" && \
	rm -f "$$SQL_FILE" && \
	echo "✅ Restore complete!"

## adminer-on: Start adminer container on production
adminer-on:
	@echo "🔓 Enabling adminer on production..."
	@ssh root@$(PROD_SERVER) "cd /opt/nepocorp && docker compose -f deploy/docker-compose.prod.yml --profile adminer up -d adminer"
	@echo "✅ Adminer: https://$(PROD_SERVER)/adminer"

## adminer-off: Stop adminer container on production (disables /adminer endpoint)
adminer-off:
	@echo "🔒 Disabling adminer on production..."
	@ssh root@$(PROD_SERVER) "cd /opt/nepocorp && docker compose -f deploy/docker-compose.prod.yml stop adminer"
	@echo "✅ Adminer container stopped — /adminer endpoint disabled"

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
	@echo "  \033[36mbackup        \033[0m Dump production DB → OneDrive"
	@echo "  \033[36mrestore       \033[0m Restore latest backup to local dev DB"
	@echo "  \033[36madminer-on    \033[0m Enable adminer on production"
	@echo "  \033[36madminer-off   \033[0m Disable adminer on production"
