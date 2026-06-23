# Heptacode Installation per Docker

Diese ZIP enthaelt ein fertiges Docker Image als `heptacode.tar`. Das Repo muss auf dem Zielrechner nicht installiert werden.

## Voraussetzungen

Docker muss installiert und gestartet sein.

Pruefen:

```bash
docker --version
```

## Dateien entpacken

ZIP entpacken. Danach sollten diese Dateien vorhanden sein:

```text
heptacode.tar
.env.local.example
INSTALLATION.md
```

## `.env.local` erstellen

Die Datei `.env.local` ist notwendig. Ohne diese Datei fehlen dem Backend die KI-Server-Einstellungen.

Mac/Linux:

```bash
cp .env.local.example .env.local
nano .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
notepad .env.local
```

Mindestens diese Werte muessen gesetzt sein:

```env
AI_API_URL=http://dein-ki-server:4000
AI_API_KEY=dummy
AI_MODEL=medgemma:27b
FALLBACK_MODEL=medgemma:4b
```

## Image laden

Im entpackten Ordner:

```bash
docker load -i heptacode.tar
```

Pruefen:

```bash
docker images heptacode
```

## Programm starten

Port 80:

```bash
docker run -d --name heptacode -p 80:80 --env-file .env.local heptacode:latest
```

Danach im Browser oeffnen:

```text
http://localhost
```

Wenn Port 80 belegt ist, z. B. Port 8080 nutzen:

```bash
docker run -d --name heptacode -p 8080:80 --env-file .env.local heptacode:latest
```

Dann im Browser oeffnen:

```text
http://localhost:8080
```

## Status pruefen

```bash
docker ps
curl http://localhost/api/health
```

Erwartete Antwort:

```json
{"status":"ok"}
```

Bei Port 8080:

```bash
curl http://localhost:8080/api/health
```

## Logs ansehen

```bash
docker logs heptacode
```

Live:

```bash
docker logs -f heptacode
```

## Stoppen und entfernen

Container stoppen und entfernen:

```bash
docker rm -f heptacode
```

Image entfernen:

```bash
docker rmi heptacode:latest
```

## Neue Version installieren

Alten Container entfernen:

```bash
docker rm -f heptacode
```

Neue ZIP herunterladen, entpacken und neues Image laden:

```bash
docker load -i heptacode.tar
```

Dann wieder starten:

```bash
docker run -d --name heptacode -p 80:80 --env-file .env.local heptacode:latest
```
