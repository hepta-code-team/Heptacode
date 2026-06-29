# Graphify

Graphify is optional CLI tooling for exploring the codebase as a knowledge graph. It is not required to run the app and does not require a local AI agent.

This repository is configured for a code-only Graphify build via `.graphifyignore`, so teammates can build the graph without an LLM API key. Docs, PDFs, images, YAML, and HTML are skipped.

## Install

### Windows

```powershell
winget install astral-sh.uv
```

Restart PowerShell, then install Graphify:

```powershell
uv tool install graphifyy
uv tool update-shell
```

Restart PowerShell again if `graphify` is not found.

Check:

```powershell
graphify --version
```

### macOS

With Homebrew:

```bash
brew install python@3.12 uv
uv tool install graphifyy
uv tool update-shell
```

Restart the terminal. If `graphify` is still not found, run:

```bash
exec "$SHELL" -l
```

Check:

```bash
graphify --version
```

Without Homebrew:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
exec "$SHELL" -l
uv tool install graphifyy
uv tool update-shell
```

## Build Or Refresh The Graph

From the repository root on Windows or macOS:

```bash
graphify extract .
graphify cluster-only . --no-label
graphify tree --graph graphify-out/graph.json --output graphify-out/GRAPH_TREE.html --root . --label Heptacode
graphify export callflow-html
```

For normal code changes after the first build:

```bash
graphify update .
graphify cluster-only . --no-label
```

## Open The Overview

If `graphify-out/` is committed or already exists locally, start with:

```text
graphify-out/index.html
```

If you generated the graph from scratch and `index.html` is not present, start with:

```text
graphify-out/GRAPH_TREE.html
```

Useful generated files:

- `graphify-out/index.html`: readable dashboard, added by the team setup
- `graphify-out/START_HERE.md`: short written guide, added by the team setup
- `graphify-out/GRAPH_TREE.html`: cleaner tree view
- `graphify-out/Heptacode-callflow.html`: architecture/call-flow view
- `graphify-out/graph.html`: full dense graph
- `graphify-out/graph.json`: graph data used by queries

## Ask Questions

```bash
graphify query "Wie laeuft ein Assessment vom Frontend ins Backend?" --budget 1200
graphify query "Welche Dateien haengen an PatientData?" --budget 1200
graphify query "Wie entsteht das PDF?" --budget 1200
graphify explain "PatientData"
graphify explain "useAssessment()"
graphify path "SymptomSelectionPage.tsx" "triage.service.ts"
```

## Add Markdown Or Docs Later

The current setup is code-only because `.graphifyignore` excludes Markdown, docs, PDFs, images, YAML, and HTML. This keeps Graphify usable without any LLM/API key.

To include Markdown or docs later:

1. Remove the relevant patterns from `.graphifyignore`, for example:

```gitignore
*.md
*.mdx
*.pdf
```

2. Configure an LLM backend. If the team uses an OpenAI-compatible MedGemma server, set:

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

3. Re-run full extraction:

```bash
graphify extract . --backend openai
graphify cluster-only . --no-label
graphify tree --graph graphify-out/graph.json --output graphify-out/GRAPH_TREE.html --root . --label Heptacode
graphify export callflow-html
```

If Graphify reports missing OpenAI support, reinstall it with the OpenAI extra:

```bash
uv tool install --force "graphifyy[openai]"
```

Use `graphify extract .` instead of only `graphify update .` when newly adding Markdown/docs, because the corpus type changed.

## What To Commit

Recommended:

- `.graphifyignore`
- `docs/GRAPHIFY.md`
- optionally `graphify-out/` without `graphify-out/cache/`

If the team commits `graphify-out/`, everyone can open the HTML views immediately and query the existing `graph.json`. If the team does not commit `graphify-out/`, each teammate can generate it locally with the commands above.
