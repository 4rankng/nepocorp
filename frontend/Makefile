# Load Docker Hub credentials (shared with backend)
include ../backend/.env
export

.PHONY: push deploy

IMAGE_NAME  := $(DOCKERHUB_USERNAME)/tingting-frontend
GIT_SHA     := $(shell cd .. && git rev-parse --short HEAD)
BUILDER     := bb
PROD_SERVER := nepo.tingting.vip

## push: Build & push frontend image to Docker Hub
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
		--provenance=false \
		--push \
		-f frontend/Dockerfile \
		.
	@echo "Push complete: $(IMAGE_NAME):latest ($(GIT_SHA))"

## deploy: Pull & restart frontend on droplet
deploy:
	@echo "Deploying frontend on production..."
	@echo "Pulling latest image..."
	ssh root@$(PROD_SERVER) "cd /opt/nepocorp && docker compose -f deploy/docker-compose.prod.yml pull frontend"
	@echo "Restarting frontend service..."
	# Retried for the same reason as the demo stack: a concurrent deploy or an
	# interrupted removal makes compose report "removal of container … is already
	# in progress", which clears once the other run finishes.
	@ok=0; for i in 1 2 3 4 5; do \
		if ssh root@$(PROD_SERVER) "cd /opt/nepocorp && docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate --no-deps frontend"; then ok=1; break; fi; \
		echo "  frontend recreate busy, retrying ($$i)..."; \
		sleep 5; \
	done; test $$ok -eq 1
	@echo "Cleaning up unused images..."
	ssh root@$(PROD_SERVER) "docker image prune -af --filter 'until=72h' || true"
	@echo "Frontend deployment complete!"
	@echo "https://$(PROD_SERVER)"
