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

## Google Places einrichten

Die Suche nach medizinischen Einrichtungen verwendet bevorzugt die Google Places API (New). Der API-Key bleibt ausschließlich im Backend. Bei Nicht-Notfällen sucht Google nachts zusätzlich im Umkreis von 20 km nach geöffneten Apotheken. Wenn Google nicht erreichbar ist, übernimmt der OSM-/Overpass-Fallback mit derselben Nacht-Erweiterung.

1. In Google Cloud beziehungsweise über den Maps Demo Key die **Places API (New)** aktivieren.
2. Den Key in `.env.local` eintragen:

```dotenv
GOOGLE_MAPS_API_KEY=your-key
```

3. Backend und Frontend neu starten:

```bash
make dev
```

Für einen produktiven Key sollten API- und Server-IP-Beschränkungen aktiviert werden. Der Key darf nie als `VITE_`-Variable oder direkt im Frontend hinterlegt werden.

---


## Projektstruktur

```text
heptacode/
├── docker-compose.yml          # Produktion
├── docker-compose.dev.yml      # Entwicklung (Hot Reload)
├── .env.example                # Vorlage — nie echte Werte eintragen
├── .env.local                  # Echte Werte — NIEMALS in Git!
├── Makefile
├── docs/
│   └── FRONTEND_BACKEND_SCHNITTSTELLE.md
├── shared/                     # Geteilte Typen zwischen Frontend und Backend
│   ├── patientData.types.ts
│   ├── result.types.ts
│   ├── symptom.types.ts
│   └── symptomExtraction.types.ts
│
├── frontend/                   # React + TypeScript + Vite
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── ARCHITECTURE.md
│   ├── guidelines/
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
│   ├── postcss.config.mjs
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── backend/                    # Node.js + Fastify + Zod
    ├── Dockerfile
    ├── Dockerfile.dev
    ├── docs/
    ├── src/
    │   ├── ai/
    │   │   ├── client.ts       # LLM-Client
    │   │   ├── llmAdapter.ts   # Adapter fuer Modellaufrufe
    │   │   └── timeout.ts
    │   ├── config/
    │   │   └── env.ts
    │   ├── modules/
    │   │   ├── assessment/
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
    └── tsconfig.json
```

---

> **Niemals** `.env.local` in Git committen.
