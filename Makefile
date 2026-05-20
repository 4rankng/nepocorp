.PHONY: dev stop down setup seed migrate generate build clean logs

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
	@cd backend && npx drizzle-kit migrate 2>/dev/null || true
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
	@echo "Login: admin@nepo.vn / admin123"

# ─── Studio (Drizzle ORM GUI) ─────────────────────────────────────────────────
studio: ## Open Drizzle Studio
	cd backend && npx drizzle-kit studio

# ─── Build ─────────────────────────────────────────────────────────────────────
build: ## Build shared + backend + frontend
	cd shared && npx tsc
	cd backend && npx tsc
	cd frontend && npx vite build

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

# ─── Help ──────────────────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
