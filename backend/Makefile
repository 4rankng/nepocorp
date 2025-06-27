.PHONY: local db test migrate-up migrate-down docker-build docker-push mock

# Local development with auto-refresh
local:
	air -c .air.toml

# Start only database and adminer
db:
	docker compose up -d mysql adminer

# Run tests
test:
	go test ./...

# Run migrations up
migrate-up:
	go run cmd/api/main.go migrate up

# Run migrations down
migrate-down:
	go run cmd/api/main.go migrate down

# Build Docker image
docker-build:
	docker build -t nepo-backend .

# Push Docker image to Docker Hub
docker-push:
	docker push $(DOCKER_USER)/nepo-backend:latest

# Run with docker compose
docker-up:
	docker compose up -d

# Stop docker compose
docker-down:
	docker compose down

# View logs
logs:
	docker compose logs -f api

# Clean up
clean:
	docker compose down -v
	rm -f main

# Load mock data into database
mock:
	@echo "Ensuring database is running..."
	@docker compose up -d mysql || true
	@echo "Waiting for database to be ready..."
	@sleep 3
	@echo "Dropping all tables and recreating database..."
	@if [ -f .env ]; then \
		export $$(cat .env | grep -v '^#' | xargs); \
		docker exec nepo_mysql mysql -u$${DB_USER:-nepo} -p$${DB_PASSWORD:-nepo_password} -e "DROP DATABASE IF EXISTS $${DB_NAME:-nepo}; CREATE DATABASE $${DB_NAME:-nepo};"; \
	else \
		docker exec nepo_mysql mysql -unepo -pnepo_password -e "DROP DATABASE IF EXISTS nepo; CREATE DATABASE nepo;"; \
	fi
	@echo "Creating tables from SQL migration..."
	@if [ -f .env ]; then \
		export $$(cat .env | grep -v '^#' | xargs); \
		docker exec -i nepo_mysql mysql -u$${DB_USER:-nepo} -p$${DB_PASSWORD:-nepo_password} $${DB_NAME:-nepo} < migrations/00001-init.sql; \
	else \
		docker exec -i nepo_mysql mysql -unepo -pnepo_password nepo < migrations/00001-init.sql; \
	fi
	@echo "Preparing mock data..."
	@chmod +x scripts/prepare-mock-data.sh
	@./scripts/prepare-mock-data.sh
	@echo "Loading mock data into database..."
	@if [ -f .env ]; then \
		export $$(cat .env | grep -v '^#' | xargs); \
		docker exec -i nepo_mysql mysql -u$${DB_USER:-nepo} -p$${DB_PASSWORD:-nepo_password} $${DB_NAME:-nepo} < scripts/mock-data-processed.sql; \
	else \
		docker exec -i nepo_mysql mysql -unepo -pnepo_password nepo < scripts/mock-data-processed.sql; \
	fi
	@echo "Mock data loaded successfully!"