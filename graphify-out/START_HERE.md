# Heptacode Graph - Einstieg

Dies ist der lesbare Einstieg in die Graphify-Ausgabe.

## Zuerst Oeffnen

1. `GRAPH_TREE.html`
   - Beste erste Ansicht.
   - Zeigt das Projekt als aufklappbaren Datei-/Modulbaum.
   - Nuetzlich, wenn `graph.html` zu voll wirkt.

2. `Heptacode-callflow.html`
   - Beste Architekturansicht.
   - Zeigt Callflow-Diagramme und Tabellen.
   - Nuetzlich, um die Verbindungen zwischen Frontend, Backend und Shared Types zu verstehen.

3. `GRAPH_REPORT.md`
   - Beste Textzusammenfassung.
   - Gut fuer zentrale Knoten, Communities und unerwartete Querverbindungen.

4. `graph.html`
   - Voller Rohgraph.
   - Maechtig, aber visuell sehr dicht.

## Projektkarte

Frontend: `frontend/src`
- `app`: React-App-Shell und Router.
- `pages`: Wizard-Seiten fuer Patientendaten, Symptome, medizinische Daten und Ergebnis.
- `features`: fachliche UI fuer Notfallsymptome, Symptomdetails und Ergebnis-/Praxissuche.
- `lib`: gemeinsame Frontend-Logik, API-Wrapper, Assessment Context, Validierung und Empfehlungen.
- `components`: wiederverwendbare UI- und Navigationskomponenten.

Backend: `backend/src`
- `index.ts` und `app.ts`: Serverstart und App-Wiring.
- `routes`: HTTP-Einstiegspunkte fuer Assessment, Triage, Symptomerkennung und PDF-Export.
- `modules/assessment`: Assessment-/Review-Logik.
- `modules/symptom-extraction`: KI-gestuetzte Symptomerkennung.
- `modules/triage`: Triage- und Fachrichtungslogik.
- `modules/pdf`: PDF-Export und Formatierung.
- `modules/fhir`: FHIR-Bundle-Erzeugung.
- `ai`: LLM-Client/Adapter und Request-Handling.
- `common`: Validierung, Fehler und Middleware.

Shared: `shared`
- Gemeinsame Typen fuer Patientendaten, Symptome, Ergebnisse, Extraktion und Taxonomie.

## Hauptfluss

```text
Frontend-Seiten
  -> Frontend API-Helfer
  -> Backend Routes
  -> Backend Module
  -> Backend AI-Client oder lokale Logik
  -> gemeinsame Result-/Patient-/Symptom-Typen
  -> Ergebnis-Seite / PDF / FHIR-Export
```

## Wichtigste Konzepte

- `PatientData`: zentrales Patientendatenmodell.
- `TriageSymptom`: zentrales Symptomenmodell.
- `useAssessment()`: Frontend-State/Context fuer das Assessment.
- `MedicalSpecialty`: Typ fuer Fachrichtungsempfehlungen.
- `CareLevel`: Typ fuer Dringlichkeit/Versorgungslevel.

## Hotspot-Dateien

- `backend/src/modules/pdf/pdfExport.service.ts`
- `frontend/src/features/results/NearbyPracticeSearch.tsx`
- `frontend/src/pages/SymptomSelectionPage.tsx`
- `backend/src/modules/triage/triage.service.ts`
- `frontend/src/pages/ResultPage.tsx`
- `frontend/src/lib/AssessmentContext.tsx`
- `backend/src/modules/assessment/assessment.service.ts`

## Nuetzliche Queries

```bash
graphify query "Wie laeuft ein Assessment vom Frontend ins Backend?" --budget 1200
graphify query "Welche Dateien haengen an PatientData?" --budget 1200
graphify query "Wie entsteht das PDF?" --budget 1200
graphify explain "PatientData"
graphify explain "useAssessment()"
graphify path "SymptomSelectionPage.tsx" "triage.service.ts"
```

## Nach Codeaenderungen Aktualisieren

```bash
graphify update .
graphify cluster-only . --no-label
graphify tree --graph graphify-out/graph.json --output graphify-out/GRAPH_TREE.html --root . --label Heptacode
graphify export callflow-html
```

## Hinweise Zum Aktuellen Build

- Dies ist ein code-only Graph.
- Docs, PDFs, Bilder und YAML werden ueber `.graphifyignore` ignoriert.
- Dadurch bleibt Graphify ohne LLM/API-Key nutzbar.
