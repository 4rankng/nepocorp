.PHONY: local db test migrate-up migrate-down docker-build docker-push

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