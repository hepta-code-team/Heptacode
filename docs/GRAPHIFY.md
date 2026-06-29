# Graphify

Graphify ist optionales CLI-Tooling, um die Codebase als Knowledge Graph zu erkunden. Es ist nicht notwendig, um die App zu starten, und es braucht keinen lokalen AI-Agenten.

Dieses Repository ist aktuell fuer einen code-only Graphify-Build konfiguriert. Die `.graphifyignore` schliesst Markdown, Dokumente, PDFs, Bilder, YAML und HTML aus. Dadurch koennen alle im Team den Graph ohne LLM/API-Key bauen.

## Installation

### Windows

```powershell
winget install astral-sh.uv
```

PowerShell neu starten, dann Graphify installieren:

```powershell
uv tool install graphifyy
uv tool update-shell
```

PowerShell noch einmal neu starten, falls `graphify` nicht gefunden wird.

Pruefen:

```powershell
graphify --version
```

### macOS

Mit Homebrew:

```bash
brew install python@3.12 uv
uv tool install graphifyy
uv tool update-shell
```

Terminal neu starten. Falls `graphify` danach noch nicht gefunden wird:

```bash
exec "$SHELL" -l
```

Pruefen:

```bash
graphify --version
```

Ohne Homebrew:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
exec "$SHELL" -l
uv tool install graphifyy
uv tool update-shell
```

## Graph Bauen Oder Aktualisieren

Vom Repository-Root aus, unter Windows oder macOS:

```bash
graphify extract .
graphify cluster-only . --no-label
graphify tree --graph graphify-out/graph.json --output graphify-out/GRAPH_TREE.html --root . --label Heptacode
graphify export callflow-html
```

Nach normalen Codeaenderungen reicht meistens:

```bash
graphify update .
graphify cluster-only . --no-label
```

`--no-label` ist wichtig, damit die manuell gepflegten deutschen Community-Namen nicht durch generische Labels ersetzt werden.

## Uebersicht Oeffnen

Wenn `graphify-out/` committed ist oder lokal schon existiert, zuerst diese Datei oeffnen:

```text
graphify-out/index.html
```

Wenn der Graph komplett neu gebaut wurde und `index.html` nicht vorhanden ist, mit dieser Ansicht starten:

```text
graphify-out/GRAPH_TREE.html
```

Nuetzliche Dateien:

- `graphify-out/index.html`: lesbares Dashboard, durch unser Team-Setup ergaenzt
- `graphify-out/START_HERE.md`: kurze Einstiegserklaerung, durch unser Team-Setup ergaenzt
- `graphify-out/GRAPH_TREE.html`: uebersichtlichere Baumansicht
- `graphify-out/Heptacode-callflow.html`: Architektur-/Callflow-Ansicht
- `graphify-out/graph.html`: vollstaendiger, dichter Netzwerkgraph
- `graphify-out/graph.json`: Graph-Daten fuer Queries

## Fragen Stellen

```bash
graphify query "Wie laeuft ein Assessment vom Frontend ins Backend?" --budget 1200
graphify query "Welche Dateien haengen an PatientData?" --budget 1200
graphify query "Wie entsteht das PDF?" --budget 1200
graphify explain "PatientData"
graphify explain "useAssessment()"
graphify path "SymptomSelectionPage.tsx" "triage.service.ts"
```

## Markdown Oder Dokumente Spaeter Einbeziehen

Das aktuelle Setup ist code-only, weil `.graphifyignore` Markdown, Dokumente, PDFs, Bilder, YAML und HTML ausschliesst. So bleibt Graphify ohne LLM/API-Key nutzbar.

Wenn Markdown oder Dokumente spaeter in den Graph sollen:

1. Die passenden Patterns aus `.graphifyignore` entfernen, zum Beispiel:

```gitignore
*.md
*.mdx
*.pdf
```

2. Ein LLM-Backend konfigurieren. Wenn das Team einen OpenAI-kompatiblen MedGemma-Server nutzt:

Windows PowerShell:

```powershell
$env:OPENAI_BASE_URL="http://localhost:8000/v1"
$env:OPENAI_MODEL="medgemma"
$env:OPENAI_API_KEY="dummy"
```

macOS/Linux:

```bash
export OPENAI_BASE_URL=http://localhost:8000/v1
export OPENAI_MODEL=medgemma
export OPENAI_API_KEY=dummy
```

3. Danach eine volle Extraktion ausfuehren:

```bash
graphify extract . --backend openai
graphify cluster-only . --no-label
graphify tree --graph graphify-out/graph.json --output graphify-out/GRAPH_TREE.html --root . --label Heptacode
graphify export callflow-html
```

Falls Graphify fehlenden OpenAI-Support meldet:

```bash
uv tool install --force "graphifyy[openai]"
```

Beim erstmaligen Hinzufuegen von Markdown/Dokumenten `graphify extract .` nutzen, nicht nur `graphify update .`, weil sich der Corpus-Typ geaendert hat.

## Was Committen?

Empfohlen:

- `.graphifyignore`
- `docs/GRAPHIFY.md`
- optional `graphify-out/` ohne `graphify-out/cache/`

Wenn `graphify-out/` committed wird, koennen alle im Team die HTML-Ansichten direkt oeffnen und das vorhandene `graph.json` abfragen. Wenn `graphify-out/` nicht committed wird, kann jede Person den Graph lokal mit den Befehlen oben erzeugen.
