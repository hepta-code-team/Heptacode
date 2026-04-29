Was sind die steps ?

# 0. Was braucht man vor dem Klonen?
(nicht unbedingt) Du brauchst zuerst eine neue version von node.js.#

Du brauchst make (haben wir in cpr gehabt)

Du brauchst Docker Desktop --> Vs Extensions
- Docker von Mircosoft 
- Container Tools von mircosoft
- Dev Containers

# 1. Repo klonen
- git clone https://github.com/euer-repo/heptacode.git
cd heptacode

# 2. Leere .env.local anlegen
- make setup

oder

- touch .env.local        # Mac

- New-Item .env.local     # Windows PowerShell

# 3. Node modules lokal installieren (nur für VS Code - keine roten Fehler)
- wenn kein node heruntergeladen ist:
docker compose -f docker-compose.dev.yml run --rm frontend npm install

docker compose -f docker-compose.dev.yml run --rm backend npm install

- ohne:
cd frontend && npm install
cd ../backend && npm install

# 4. Zurück in root und starten
cd ..
make dev
