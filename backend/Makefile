.PHONY: dev build test lint migrate-up migrate-down

# Build variables
BINARY_NAME=api
BIN_DIR=bin

# Development
dev:
	@echo "Starting development server..."
	@go run cmd/api/main.go

# Build
build:
	@echo "Building application..."
	@go build -o $(BIN_DIR)/$(BINARY_NAME) cmd/api/main.go

# Development
dev:
	@echo "Starting development environment..."
	docker-compose up --build

# Test
test:
	@echo "Running tests..."
	@go test -v ./...

# Lint
lint:
	@echo "Running linter..."
	@golangci-lint run

# Database migrations
migrate-up:
	@echo "Running database migrations..."
	@migrate -path ./migrations -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}" up

migrate-down:
	@echo "Rolling back the last migration..."
	@migrate -path ./migrations -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}" down

# Clean build artifacts
clean:
	@echo "Cleaning up..."
	@rm -rf $(BIN_DIR)
	@go clean
