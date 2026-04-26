# Mac/Linux: make dev
# Windows:   docker compose -f docker-compose.dev.yml up --build

.PHONY: dev prod down logs clean

dev:
	docker compose -f docker-compose.dev.yml up --build

prod:
	docker compose up --build -d

down:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f

clean:
	docker compose down --rmi all --volumes --remove-orphans

setup:
	docker run --rm -v $(PWD):/app alpine touch /app/.env.local
	@echo ✅ .env.local erstellt