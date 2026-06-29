<img width="1923" height="612" alt="heptacheck-logo" src="https://github.com/user-attachments/assets/4be4ba44-f875-48ca-b1ea-a2811dddf38c" />

# Heptacode

KI-basierte Patientensteuerung zur Effizienzsteigerung im Gesundheitswesen.  
Patienten werden sicher, schnell und laienverständlich durch das Gesundheitssystem geleitet — mit KI-basierter Triage.

---
## RollenVerteilung
| Name | Rolle | 
|---|---|
| Ella | PO/UI/UX |
| Chris| Backend|
| Selim | Frontend | 
| Isabelle | Frontend |
| Hanin | Backend | 
| Kai | SM/Backend |
| Lisa | Flex | 
---

## Branches

| Branch | Zweck |
|---|---|
| `main` | Stable — nur reviewed Code |
| `dev` | Gemeinsamer Entwicklungs- und Integrationsbranch |
| `tech-stack-v1` | wurde gelöscht/ War der erste Ansatz für unseren TechStack|
| `feature/...` | Neue Features |

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, PrimeReact, Vite |
| Backend | Node.js, Fastify, Zod, TypeScript |
| KI | MedGemma (eigener Server, OpenAI-kompatible API) |
| Infrastruktur | Docker, Docker Compose, Nginx |

---


## URLs

| | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Health Check | http://localhost:3000/health |
| Setup Guide  | [docs/SETUP.md](docs/SETUP.md)

---

## Aktueller API-Stand

Das Backend registriert aktuell diese HTTP-Endpunkte:

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/health` | Backend-Erreichbarkeit |
| `POST` | `/assessments` | Frontend-kompatible Assessment-Auswertung inklusive FHIR-Bundle-Erzeugung |
| `POST` | `/api/v1/symptoms/extraction` | Symptome aus Freitext extrahieren |
| `POST` | `/api/v1/symptoms/validation` | Symptom-Eingaben validieren |
| `POST` | `/api/v1/symptoms/detail-validation` | Symptom-Details validieren |
| `POST` | `/api/v1/symptoms/consistency` | Symptom-Konsistenz pruefen |
| `POST` | `/api/v1/triage/evaluate` | Triage bewerten |
| `POST` | `/api/v1/pdf/export` | Assessment-PDF erzeugen |

Details stehen in [docs/FRONTEND_BACKEND_SCHNITTSTELLE.md](docs/FRONTEND_BACKEND_SCHNITTSTELLE.md) und in den Backend-Moduldokumenten unter [backend/docs](backend/docs).

---

## Täglicher Workflow
- siehe [docs/Workflow.md](docs/Workflow.md) für genaueres
```bash
# 1. Neueste Änderungen holen
git pull

# 2. Falls package.json geändert wurde
cd frontend && npm install
cd ../backend && npm install
cd ..

# 3. Starten
make dev

# 4. Code schreiben, App auf localhost:5173 anschauen

# 5. Pushen
git add .
git commit -m "was du gemacht hast" (keep conventional git msg in mind)
git push
```

---

## Befehle

| Was | Mac | Windows |
|---|---|---|
| Dev starten | `make dev` | `docker compose -f docker-compose.dev.yml up --build` |
| Stoppen | `make down` | `docker compose -f docker-compose.dev.yml down` |
| Logs | `make logs` | `docker compose -f docker-compose.dev.yml logs -f` |
| Prod Build | `make prod` | `docker compose up --build -d` |
| Alles löschen | `make clean` | `docker compose down --rmi all --volumes` |

---

## Tests und Checks

Frontend:

```bash
cd frontend
npm run check
npm test -- --run
npm run test:coverage -- --run
```

Backend:

```bash
cd backend
npm run build
npm test
```

Live-Tests gegen den echten KI-Server laufen separat und brauchen eine passende `.env.local`:

```bash
cd backend
npm run test:ai-triage
```

---

## Deployment-Optionen

| Option | Wann verwenden | Start |
|---|---|---|
| Entwicklung mit Hot Reload | Lokale Entwicklung an Frontend und Backend | `make dev` |
| Docker Compose Produktion | Lokaler oder Server-Betrieb mit getrennten Frontend-/Backend-Images | `make prod` oder `docker compose up -d --build` |
| Einzelnes Docker Image | Weitergabe als ein Image oder TAR-Datei | `docker build -t heptacode:latest .` |
| GitHub Release Download | Fertiges Docker-Paket aus GitHub Actions herunterladen | `Releases -> Heptacode Docker Download` |

Alle Produktionsvarianten brauchen eine `.env.local` mit mindestens `AI_API_URL`, `AI_API_KEY`, `AI_MODEL` und `FALLBACK_MODEL`.

---

## Einzelnes Docker Image

### Notwendige `.env.local`

Vor dem Start ist eine `.env.local` Datei notwendig. Ohne diese Datei fehlen dem Backend die KI-Server-Einstellungen und der Container kann nicht korrekt arbeiten.

Wenn du im Repo arbeitest:

```bash
cp .env.example .env.local
```

Wenn du nur die `heptacode.tar` auf einem anderen Rechner hast, erstelle im gleichen Ordner wie die `.tar` Datei eine neue Datei namens `.env.local`.

Minimaler Inhalt:

```env
# Adresse vom KI-Server
AI_API_URL=http://dein-ki-server:4000

# API-Key fuer den KI-Server
AI_API_KEY=dummy

# Hauptmodell
AI_MODEL=medgemma:27b

# Ersatzmodell
FALLBACK_MODEL=medgemma:4b
```

Wenn das Programm als ein einziges Image laufen soll:

```bash
docker build -t heptacode:latest .
docker run --rm -p 80:80 --env-file .env.local heptacode:latest
```

Danach ist die App unter http://localhost erreichbar. Das Image enthaelt das gebaute React-Frontend, Nginx als Webserver und die kompilierte Fastify-API.

Image als Datei weitergeben:

```bash
docker save heptacode:latest -o heptacode.tar
docker load -i heptacode.tar

# starten, nachdem im gleichen Ordner eine .env.local erstellt wurde
docker run --rm -p 80:80 --env-file .env.local heptacode:latest
```

### GitHub Release Download

Bei jedem Push auf `main` baut GitHub Actions automatisch ein aktuelles Docker-Paket und haengt es an den Release `latest` an.

Download auf GitHub:

```text
Releases -> Heptacode Docker Download -> heptacode-docker.zip
```

Die ZIP enthaelt:

```text
heptacode.tar
.env.local.example
INSTALLATION.md
```

Der Workflow kann auch manuell ueber `Actions -> Build Docker TAR Release -> Run workflow` gestartet werden.

---

## Produktiv mit Docker Compose

Die Produktion kann alternativ ohne lokale Node-/npm-Installation ueber zwei Docker Images laufen:

- `heptacode-frontend`: Nginx liefert das gebaute React-Frontend aus und leitet `/api/*` an das Backend weiter.
- `heptacode-backend`: Node.js startet die kompilierte Fastify-API.

Voraussetzungen:

```bash
cp .env.example .env.local
# .env.local mit den echten AI_API_URL / AI_API_KEY Werten befuellen
```

Start:

```bash
docker compose up -d --build
```

Danach ist die App unter http://localhost erreichbar. Der Backend-Healthcheck ist unter http://localhost:3000/health und ueber den Frontend-Proxy unter http://localhost/api/health erreichbar.

Stoppen:

```bash
docker compose down
```

Images separat bauen:

```bash
docker compose build
```

Falls Docker Desktop beim Buildx-Builder einen lokalen Worker-Fehler meldet, funktioniert als Fallback:

```bash
DOCKER_BUILDKIT=0 docker compose build
```

---


## Graphify

Optionales Tooling zum Erkunden der Codebase als Knowledge Graph:
[docs/GRAPHIFY.md](docs/GRAPHIFY.md)

---


## Projektstruktur

```text
heptacode/
├── docker-compose.yml          # Produktion
├── docker-compose.dev.yml      # Entwicklung (Hot Reload)
├── .env.example                # Vorlage — nie echte Werte eintragen
├── .env.local                  # Echte Werte — NIEMALS in Git!
├── Makefile
├── Dockerfile                  # Einzelnes kombiniertes Docker Image
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
├── docs/
│   ├── FRONTEND_BACKEND_SCHNITTSTELLE.md
│   ├── GRAPHIFY.md
│   └── docker-release/
├── shared/                     # Geteilte Typen zwischen Frontend und Backend
│   ├── package.json
│   ├── patientData.types.ts
│   ├── result.types.ts
│   ├── symptom.types.ts
│   ├── symptomExtraction.types.ts
│   └── symptomTaxonomy.ts
│
├── frontend/                   # React + TypeScript + Vite
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── ARCHITECTURE.md
│   ├── README.md
│   ├── nginx.conf
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   └── router.tsx
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── types/
│   │   └── main.tsx
│   ├── tests/
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
└── backend/                    # Node.js + Fastify + Zod
    ├── Dockerfile
    ├── Dockerfile.dev
    ├── docs/
    │   ├── FHIR.md
    │   ├── ki-nutzung-doc.md
    │   ├── symptom-extraction-doc.md
    │   └── triage-doc.md
    ├── src/
    │   ├── ai/
    │   │   ├── client.ts       # LLM-Client
    │   │   ├── llmAdapter.ts   # Adapter fuer Modellaufrufe
    │   │   └── timeout.ts
    │   ├── config/
    │   │   └── env.ts
    │   ├── modules/
    │   │   ├── assessment/
    │   │   ├── fhir/
    │   │   ├── pdf/
    │   │   ├── prompt/
    │   │   ├── symptom-extraction/
    │   │   └── triage/
    │   ├── routes/
    │   │   ├── assessment.routes.ts
    │   │   ├── pdf.routes.ts
    │   │   ├── symptomExtraction.routes.ts
    │   │   └── triage.routes.ts
    │   ├── app.ts
    │   └── index.ts
    ├── tests/
    │   ├── integration/
    │   ├── live/
    │   └── unit/
    ├── package.json
    └── tsconfig.json
```

---

## Bekannte Einschränkungen

- Ohne erreichbaren KI-Server funktionieren Triage, Symptom-Extraktion und Assessment-Auswertung nur eingeschraenkt oder gar nicht.
- Die Live-KI-Tests rufen echte Modelle auf und sind nicht Teil der normalen deterministischen Test-Suite.
- Das Frontend nutzt fuer die Umgebungssuche externe Overpass-/OpenStreetMap-Endpunkte. Diese Abfragen koennen durch Netzwerk, Rate Limits oder Browser-Berechtigungen fehlschlagen.
- `.env.local` ist lokal notwendig, darf aber nicht committet werden.

---

> **Niemals** `.env.local` in Git committen.
