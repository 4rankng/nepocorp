# Nepocorp Backend

## Prerequisites

- Go 1.20 or higher
- MySQL 8.0 or higher
- Git
- Make (optional, but recommended)

## Setup Instructions

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/your-username/nepocorp.git
   cd nepocorp/backend
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your database credentials and JWT secret.

3. **Install dependencies**:
   ```bash
   go mod download
   ```

4. **Set up the database**:
   - Create a MySQL database named `nepocorp_db` (or your preferred name, update `.env` accordingly)
   - Run migrations:
     ```bash
     make migrate-up
     ```
     or manually:
     ```bash
     migrate -path ./migrations -database "mysql://${DB_USER}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_NAME}" up
     ```

## Running the Application

### Development Mode

```bash
# Start the development server with hot reload
make dev
# or
go run cmd/api/main.go
```

The API will be available at `http://localhost:8080` by default.

### Production Mode

```bash
# Build the application
make build

# Run the binary
./bin/api
```

## Available Make Commands

- `make dev` - Start development server with hot reload
- `make build` - Build the application
- `make test` - Run tests
- `make lint` - Run linter
- `make migrate-up` - Run database migrations
- `make migrate-down` - Rollback the last migration

## API Documentation

Once the server is running, you can access:
- API Base URL: `http://localhost:8080/api/v1`
- Health Check: `GET /health`

## Environment Variables

See `.env.example` for all available environment variables.

## Database Migrations

To create a new migration:
```bash
migrate create -ext sql -dir migrations -seq migration_name
```

To run migrations:
```bash
make migrate-up
```

To rollback the last migration:
```bash
make migrate-down
```
