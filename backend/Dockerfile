# Stage 1: Build the Go application
FROM golang:1.23.0-alpine AS builder

WORKDIR /app/src

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy go.mod and go.sum to download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags "-s -w" -o /app/nepocorp ./cmd/api/main.go

# Stage 2: Create the final, minimal image
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk --no-cache add ca-certificates

# Copy the pre-built binary from the builder stage
COPY --from=builder /app/nepocorp .

# Copy migration files
COPY --from=builder /app/src/migrations ./migrations

# Copy wait-for-it script
COPY --from=builder /app/src/wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Expose port 8080
EXPOSE 8080

# Command to run the executable
CMD ["/app/nepocorp"]
