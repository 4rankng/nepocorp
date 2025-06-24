# Deployment Guide

This guide explains how to deploy the backend application using Docker on a DigitalOcean droplet or any server.

## Prerequisites

- Docker installed on your server
- Docker Compose (optional but recommended)
- Backend Docker image available (either from Docker Hub or built locally)

## Deployment Steps

### 1. Prepare Environment File

Create a `.env` file on your server with production values:

```bash
# Create .env file
nano .env
```

Add the following content (replace with your actual values):

```env
# Server Configuration
PORT=8080
DEBUG=false

# Database Configuration
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-secure-db-password
DB_NAME=nepo_production
RUN_MIGRATIONS=true

# JWT Configuration
JWT_SECRET=your-very-secure-jwt-secret-min-32-chars
JWT_ISSUER=nepo-backend
JWT_ACCESS_TOKEN_TTL=24h
JWT_REFRESH_TOKEN_TTL=168h

# Password Hashing
HASH_SECRET=your-very-secure-hash-secret-min-32-chars
HASH_SALT=your-very-secure-hash-salt-min-16-chars

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_RPS=10

# Activity Logging
ACTIVITY_LOG_RETENTION_DAYS=90
ACTIVITY_LOG_QUEUE_SIZE=1000

# Casbin RBAC
CASBIN_MODEL_PATH=config/rbac_model.conf
CASBIN_POLICY_PATH=config/rbac_policy.csv
```

### 2. Run with Docker

#### Option A: Using Docker Run

```bash
# Pull the latest image
docker pull your-registry/nepo-backend:latest

# Run the container
docker run -d \
  --name nepo-backend \
  --env-file .env \
  -p 8080:8080 \
  --restart unless-stopped \
  your-registry/nepo-backend:latest
```

#### Option B: Using Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  backend:
    image: your-registry/nepo-backend:latest
    container_name: nepo-backend
    env_file:
      - .env
    ports:
      - "8080:8080"
    restart: unless-stopped
    networks:
      - nepo-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add MySQL if you want to run it in Docker
  mysql:
    image: mysql:8.0
    container_name: nepo-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped
    networks:
      - nepo-network

networks:
  nepo-network:
    driver: bridge

volumes:
  mysql-data:
```

Then run:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### 3. Initialize Database

After the backend is running, initialize the admin account:

```bash
# Option 1: Run init script inside container
docker exec -it nepo-backend sh -c "cd scripts && go run init_db.go -user=admin -pass=YourSecurePassword"

# Option 2: Run migrations manually if needed
docker exec -it nepo-backend sh -c "go run cmd/api/main.go migrate up"
```

### 4. Setup Nginx (Optional but Recommended)

If you want to use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL with Let's Encrypt

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Management Commands

### View Logs
```bash
# Docker run
docker logs -f nepo-backend

# Docker Compose
docker-compose logs -f backend
```

### Restart Service
```bash
# Docker run
docker restart nepo-backend

# Docker Compose
docker-compose restart backend
```

### Update Image
```bash
# Docker run
docker stop nepo-backend
docker rm nepo-backend
docker pull your-registry/nepo-backend:latest
# Then run again with docker run command

# Docker Compose
docker-compose pull
docker-compose up -d
```

### Backup Database
```bash
# If using Docker MySQL
docker exec nepo-mysql mysqldump -u root -p${DB_PASSWORD} ${DB_NAME} > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Security Checklist

- [ ] Use strong passwords for database and JWT secret
- [ ] Change default admin password immediately after setup
- [ ] Enable firewall (ufw) and only allow necessary ports
- [ ] Use HTTPS in production
- [ ] Regularly update Docker images
- [ ] Monitor logs for suspicious activity
- [ ] Set up automated backups

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs nepo-backend

# Check if port is already in use
sudo netstat -tulpn | grep 8080
```

### Database connection issues
- Ensure database host is accessible from container
- If using Docker MySQL, use service name as host
- Check credentials in .env file

### Migration issues
```bash
# Run migrations manually
docker exec -it nepo-backend sh -c "go run cmd/api/main.go migrate up"
```

## Environment Variables Reference

See `.env.example` for all available environment variables and their descriptions.