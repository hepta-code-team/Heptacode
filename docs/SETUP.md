# Heptacode Setup Guide

Dieser Guide beschreibt den aktuellen Entwicklungs-Setup fuer Heptacode.

## 0. Voraussetzungen

Du brauchst:

- Git
- Docker Desktop inklusive Docker Compose
- optional: Node.js 20 fuer lokale `npm install` Befehle und bessere VS-Code-Unterstuetzung
- optional: `make`

Empfohlene VS-Code-Extensions:

- Docker von Microsoft
- Dev Containers von Microsoft
- Container Tools von Microsoft

Hinweis: Wenn du kein `make` installiert hast, kannst du immer die angegebenen `docker compose` Befehle nutzen.

## 1. Repo klonen

```bash
git clone https://github.com/euer-repo/heptacode.git
cd heptacode
```

## 2. `.env.local` anlegen

Die Datei `.env.local` darf nicht leer sein. Das Backend braucht mindestens `AI_API_URL`.

Erstelle sie aus der Vorlage:

```bash
# Mac, Linux oder Git Bash
cp .env.example .env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

Danach die Werte in `.env.local` anpassen:

```env
AI_API_URL=http://dein-ki-server:4000/v1
AI_API_KEY=dummy
AI_MODEL=medgemma:27b
FALLBACK_MODEL=medgemma:4b
```

Wichtig: `.env.local` niemals committen.

## 3. Optional: Node modules lokal installieren

Dieser Schritt ist nur noetig, wenn VS Code keine roten TypeScript-/Import-Fehler anzeigen soll.

Dafuer brauchst du lokal Node.js/npm:

```bash
cd frontend
npm install

cd ../backend
npm install

cd ..
```

Wenn du nur mit Docker starten willst, ist dieser Schritt nicht zwingend noetig. Die Docker-Images installieren ihre Dependencies beim Build selbst.

## 4. App starten

Mit `make`:

```bash
make dev
```

Ohne `make`:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Danach ist die App erreichbar unter:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health Check: http://localhost:3000/health

## 5. App stoppen

Mit `make`:

```bash
make down
```

Ohne `make`:

```bash
docker compose -f docker-compose.dev.yml down
```

## 6. Logs anzeigen

Mit `make`:

```bash
make logs
```

Ohne `make`:

```bash
docker compose -f docker-compose.dev.yml logs -f
```

## Nach dem Setup

Den normalen Entwicklungsablauf findest du in [Workflow.md](Workflow.md).

## Dev Container verwenden

Wenn du mit VS Code Dev Containers arbeitest:

1. Erst `.env.local` wie oben beschrieben erstellen.
2. Docker Desktop starten.
3. In VS Code `Reopen in Container` auswaehlen.

Die Ports `5173`, `3000` und `9229` werden automatisch weitergeleitet.

## Typische Probleme

### `make` funktioniert nicht

Nutze stattdessen direkt:

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Backend startet nicht wegen `AI_API_URL is missing`

Dann fehlt `.env.local` oder sie enthaelt keine `AI_API_URL`.

Loesung:

```bash
cp .env.example .env.local
```

oder unter Windows:

```powershell
Copy-Item .env.example .env.local
```

### VS Code zeigt rote Import-Fehler

Dann fehlen wahrscheinlich lokale `node_modules`.

Loesung:

```bash
cd frontend
npm install

cd ../backend
npm install

cd ..
```

### Port ist schon belegt

Pruefe, ob bereits ein anderer Prozess auf einem dieser Ports laeuft:

- `5173` fuer das Frontend
- `3000` fuer das Backend
- `9229` fuer den Node Debugger

Stoppe den alten Prozess oder passe die Ports in `docker-compose.dev.yml` an.
