.PHONY: dev down logs clean

dev:
	docker compose -f docker-compose.dev.yml up --build

down:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f

clean:
	docker compose down --rmi all --volumes --remove-orphans
