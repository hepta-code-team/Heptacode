# Heptacode

KI-basierte Patientensteuerung zur Effizienzsteigerung im Gesundheitswesen.  
Patienten werden sicher, schnell und laienverständlich durch das Gesundheitssystem geleitet — mit KI-basierter Triage.

---
## RollenVerteilung
| Name | Rolle | 
|---|---|
| Ella | PO/Frontend |
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
| `tech-stack-v1` | wurde gelöscht/ War der erste Ansatz für unseren TechStack|
| *`newFold-v1` | Aktuelle branch |
| `feature/...` | Neue Features |

# * Bedeutet: ist der Branch an dem aktuell gearbeitet wird
---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, PrimeReact |
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


## Projektstruktur

```
heptacode/
├── docker-compose.yml          # Produktion
├── docker-compose.dev.yml      # Entwicklung (Hot Reload)
├── .env.example                # Vorlage — nie echte Werte eintragen
├── .env.local                  # Echte Werte — NIEMALS in Git!
├── Makefile
│
├── frontend/                   # React + TypeScript + Tailwind + PrimeReact
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── index.css
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── backend/                    # Node.js + Fastify + Zod
    ├── Dockerfile
    ├── Dockerfile.dev
    ├── src/
    │   ├── index.ts
    │   └── ai/
    │       ├── client.ts       # MedGemma Client
    │       ├── prompts.ts      # Prompts zentral
    │       └── triage.ts       # Triage-Logik
    └── tsconfig.json
```

---

> **Niemals** `.env.local` in Git committen.
