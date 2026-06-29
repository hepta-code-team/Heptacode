# Heptacode Workflow

Dieser Guide beschreibt den normalen Arbeitsablauf beim Entwickeln.

## 1. Neueste Version holen

```bash
git pull
```

## 2. Nur bei neuen Paketen Dependencies aktualisieren

Dieser Schritt ist nur noetig, wenn sich eine dieser Dateien geaendert hat:

- `frontend/package.json`
- `frontend/package-lock.json`
- `backend/package.json`
- `backend/package-lock.json`

Mit lokalem npm:

```bash
cd frontend
npm install

cd ../backend
npm install

cd ..
```

Ohne lokales npm musst du normalerweise nichts extra installieren. Starte Docker einfach mit Build, dann werden die Dependencies im Image installiert:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Hinweis: Die Docker-Installation von Dependencies hilft nicht immer gegen rote Import-Fehler in VS Code. Dafuer sind lokale `node_modules` noetig.

## 3. Container starten

Mit `make`:

```bash
make dev
```

Ohne `make`:

```bash
docker compose -f docker-compose.dev.yml up --build
```

## 4. Code schreiben und testen

Frontend im Browser oeffnen:

```text
http://localhost:5173
```

Backend Health Check:

```text
http://localhost:3000/health
```

## 5. Fertige Aenderungen pushen

Pruefe zuerst, auf welchem Branch du bist und welche Dateien geaendert wurden:

```bash
git branch
git status
```

Dann committen und pushen:

```bash
git add .
git commit -m "Was wurde geaendert"
git push
```

## Sonderfaelle

### Anwendung produktiv testen

Mit `make`:

```bash
make prod
```

Ohne `make`:

```bash
docker compose up -d --build
```

### Dev-Container stoppen

Mit `make`:

```bash
make down
```

Ohne `make`:

```bash
docker compose -f docker-compose.dev.yml down
```

### Docker komplett neu aufsetzen

Nur nutzen, wenn wirklich etwas kaputt ist, Dockerfiles geaendert wurden oder du sauber neu anfangen willst:

```bash
make clean
```

### Port ist schon belegt

Erst stoppen, dann neu starten:

```bash
make down
make dev
```

Ohne `make`:

```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up --build
```
