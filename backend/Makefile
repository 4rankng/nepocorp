# Load Docker Hub credentials
include .env
export

.PHONY: push deploy

IMAGE_NAME  := $(DOCKERHUB_USERNAME)/nepo-backend
GIT_SHA     := $(shell cd .. && git rev-parse --short HEAD)
BUILDER     := bb
PROD_SERVER := nepo.tingting.vip

## push: Build & push backend image to Docker Hub
push:
	@docker buildx inspect $(BUILDER) >/dev/null 2>&1 || docker buildx create --name $(BUILDER) --driver docker-container --use
	@docker buildx use $(BUILDER)
	@docker buildx inspect --bootstrap >/dev/null
	@echo "Logging into DockerHub..."
	@echo "$(DOCKERHUB_PASSWORD)" | docker login -u "$(DOCKERHUB_USERNAME)" --password-stdin
	@echo "Building & pushing AMD64 image (with inline cache)..."
	cd .. && docker buildx build \
		--platform linux/amd64 \
		--tag $(IMAGE_NAME):latest \
		--tag $(IMAGE_NAME):$(GIT_SHA) \
		--cache-from type=registry,ref=$(IMAGE_NAME):latest \
		--build-arg BUILDKIT_INLINE_CACHE=1 \
		--push \
		-f backend/Dockerfile \
		.
	@echo "Push complete: $(IMAGE_NAME):latest ($(GIT_SHA))"

## deploy: Pull & restart backend on droplet + run migrations
deploy:
	@echo "Deploying backend on production..."
	@echo "Pulling latest image..."
	ssh root@$(PROD_SERVER) "cd /opt/nepocorp && docker compose -f deploy/docker-compose.prod.yml pull backend"
	@echo "Restarting backend service..."
	ssh root@$(PROD_SERVER) "cd /opt/nepocorp && docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate --no-deps backend"
	@echo "Running database migrations..."
	ssh root@$(PROD_SERVER) "cd /opt/nepocorp && docker compose -f deploy/docker-compose.prod.yml exec -T backend npx drizzle-kit migrate"
	@echo "Cleaning up unused images..."
	ssh root@$(PROD_SERVER) "docker image prune -f"
	@echo "Backend deployment complete!"
	@echo "API: https://$(PROD_SERVER)/api/health"
