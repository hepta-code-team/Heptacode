.PHONY: dev prod prod-build prod-down down logs clean

dev:
	docker compose -f docker-compose.dev.yml up --build

prod:
	docker compose up -d --build

prod-build:
	docker compose build

prod-down:
	docker compose down

down:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f

clean:
	docker compose down --rmi all --volumes --remove-orphans
	
setup-env:
	@if not exist .env.local copy .env.example .env.local

setup:
	docker run --rm -v $(PWD):/workspace alpine touch /workspace/.env.local
	@echo ".env.local erstellt"
