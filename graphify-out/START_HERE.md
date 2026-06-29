# Heptacode Graph - Start Here

This is the readable entry point for the Graphify output.

## Open These First

1. `GRAPH_TREE.html`
   - Best first view.
   - Shows the project as an expandable file/module tree.
   - Use this when `graph.html` feels too crowded.

2. `Heptacode-callflow.html`
   - Best architecture view.
   - Shows call-flow style diagrams and tables.
   - Use this to understand how frontend, backend, and shared types connect.

3. `GRAPH_REPORT.md`
   - Best text summary.
   - Good for top nodes, communities, and surprising cross-file links.

4. `graph.html`
   - Full raw network graph.
   - Powerful, but visually dense.

## Project Map

Frontend: `frontend/src`
- `app`: React app shell and router.
- `pages`: Wizard pages such as patient data, symptoms, medical data, and result.
- `features`: domain UI for emergency symptoms, symptom details, and result/practice search.
- `lib`: shared frontend logic, API wrappers, assessment context, validation, recommendations.
- `components`: reusable UI and navigation components.

Backend: `backend/src`
- `index.ts` and `app.ts`: server startup and Express app wiring.
- `routes`: HTTP route entry points for assessment, triage, symptom extraction, and PDF export.
- `modules/assessment`: assessment/review logic.
- `modules/symptom-extraction`: AI-assisted symptom extraction.
- `modules/triage`: triage and specialty recommendation logic.
- `modules/pdf`: PDF export and formatting.
- `modules/fhir`: FHIR bundle generation.
- `ai`: LLM client/adapter and request handling.
- `common`: validation, errors, and middleware.

Shared: `shared`
- Cross-package types for patient data, symptoms, results, extraction, and taxonomy.

## Main Flow

```text
Frontend pages
  -> frontend lib/API helpers
  -> backend routes
  -> backend modules
  -> backend AI/client or local logic
  -> shared result/patient/symptom types
  -> result page / PDF / FHIR output
```

## Most Important Concepts

- `PatientData`: central patient information model.
- `TriageSymptom`: central symptom model.
- `useAssessment()`: frontend assessment state/context.
- `MedicalSpecialty`: specialty recommendation type.
- `CareLevel`: urgency/care-level result type.

## Hotspot Files

- `backend/src/modules/pdf/pdfExport.service.ts`
- `frontend/src/features/results/NearbyPracticeSearch.tsx`
- `frontend/src/pages/SymptomSelectionPage.tsx`
- `backend/src/modules/triage/triage.service.ts`
- `frontend/src/pages/ResultPage.tsx`
- `frontend/src/lib/AssessmentContext.tsx`
- `backend/src/modules/assessment/assessment.service.ts`

## Useful Queries

```powershell
graphify query "Wie laeuft ein Assessment vom Frontend ins Backend?" --budget 1200
graphify query "Welche Dateien haengen an PatientData?" --budget 1200
graphify query "Wie entsteht das PDF?" --budget 1200
graphify explain "PatientData"
graphify explain "useAssessment()"
graphify path "SymptomSelectionPage.tsx" "triage.service.ts"
```

## Update After Code Changes

```powershell
graphify update .
graphify cluster-only . --no-label
graphify tree --graph graphify-out\graph.json --output graphify-out\GRAPH_TREE.html --root . --label Heptacode
graphify export callflow-html
```

## Current Build Notes

- This is a code-only graph.
- Docs, PDFs, images, and YAML are ignored via `.graphifyignore`.
- That keeps Graphify usable without an LLM API key.
