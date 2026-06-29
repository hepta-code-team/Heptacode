# Graph Report - .  (2026-06-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 860 nodes · 1696 edges · 46 communities (38 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b6ed3690`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend-App & Assessment-Ablauf|Frontend-App & Assessment-Ablauf]]
- [[_COMMUNITY_KI-Adapter & Symptomerkennung|KI-Adapter & Symptomerkennung]]
- [[_COMMUNITY_Triage-Logik & Plausibilitaet|Triage-Logik & Plausibilitaet]]
- [[_COMMUNITY_Patienten- & Medizindaten-Formulare|Patienten- & Medizindaten-Formulare]]
- [[_COMMUNITY_Assessment-Service & FHIR-Export|Assessment-Service & FHIR-Export]]
- [[_COMMUNITY_PDF-Export & Darstellung|PDF-Export & Darstellung]]
- [[_COMMUNITY_Frontend-Paketabhaengigkeiten|Frontend-Paketabhaengigkeiten]]
- [[_COMMUNITY_Praxis-Einrichtungssuche in der Naehe|Praxis-/Einrichtungssuche in der Naehe]]
- [[_COMMUNITY_Backend-App, Env & Middleware|Backend-App, Env & Middleware]]
- [[_COMMUNITY_Symptomauswahl & Spracheingabe|Symptomauswahl & Spracheingabe]]
- [[_COMMUNITY_Backend-Paket-Skripte|Backend-Paket-Skripte]]
- [[_COMMUNITY_PDF-Triage-Typen & Review-Prompt|PDF-/Triage-Typen & Review-Prompt]]
- [[_COMMUNITY_Ergebnis-Seite & Formatierung|Ergebnis-Seite & Formatierung]]
- [[_COMMUNITY_Backend-TypeScript-Konfiguration|Backend-TypeScript-Konfiguration]]
- [[_COMMUNITY_Live-Tests fuer Triage-Plausibilitaet|Live-Tests fuer Triage-Plausibilitaet]]
- [[_COMMUNITY_Normalisierung der Symptomerkennung|Normalisierung der Symptomerkennung]]
- [[_COMMUNITY_Mental-Health-Extraktion & Vertraege|Mental-Health-Extraktion & Vertraege]]
- [[_COMMUNITY_Ergebniskarten & gemeinsame Ergebnis-Typen|Ergebniskarten & gemeinsame Ergebnis-Typen]]
- [[_COMMUNITY_Frontend-TypeScript-Konfiguration|Frontend-TypeScript-Konfiguration]]
- [[_COMMUNITY_Backend-Benchmark-Skripte|Backend-Benchmark-Skripte]]
- [[_COMMUNITY_Frontend-Empfehlungskonfiguration|Frontend-Empfehlungskonfiguration]]
- [[_COMMUNITY_Symptomdetail-Steuerung|Symptomdetail-Steuerung]]
- [[_COMMUNITY_Testfaelle fuer Triage-Fachrichtungen|Testfaelle fuer Triage-Fachrichtungen]]
- [[_COMMUNITY_API-Client fuer Symptomerkennung|API-Client fuer Symptomerkennung]]
- [[_COMMUNITY_Frontend-Fachrichtungsempfehlung|Frontend-Fachrichtungsempfehlung]]
- [[_COMMUNITY_Symptom-Konstanten & Messwerte|Symptom-Konstanten & Messwerte]]
- [[_COMMUNITY_Modal & Schmerzskala-UI|Modal & Schmerzskala-UI]]
- [[_COMMUNITY_Symptom-Button-Grid|Symptom-Button-Grid]]
- [[_COMMUNITY_TypeScript-Konfiguration fuer Backend-Tests|TypeScript-Konfiguration fuer Backend-Tests]]
- [[_COMMUNITY_Notfall-Symptom-Grid|Notfall-Symptom-Grid]]
- [[_COMMUNITY_Root-Package PDF-Abhaengigkeiten|Root-Package PDF-Abhaengigkeiten]]
- [[_COMMUNITY_PDF-Routen-Integrationstest|PDF-Routen-Integrationstest]]
- [[_COMMUNITY_Mental-Health-Risikoprompt|Mental-Health-Risikoprompt]]
- [[_COMMUNITY_Assessment-Request-Schema|Assessment-Request-Schema]]
- [[_COMMUNITY_PDF-Request-Schema|PDF-Request-Schema]]
- [[_COMMUNITY_Symptomerkennungs-Request-Schema|Symptomerkennungs-Request-Schema]]
- [[_COMMUNITY_Triage-Request-Schema|Triage-Request-Schema]]
- [[_COMMUNITY_Docker-Startskript|Docker-Startskript]]
- [[_COMMUNITY_Ergebnis-Feature-Typen|Ergebnis-Feature-Typen]]
- [[_COMMUNITY_Shared-Package-Metadaten|Shared-Package-Metadaten]]

## God Nodes (most connected - your core abstractions)
1. `PatientData` - 32 edges
2. `TriageSymptom` - 26 edges
3. `useAssessment()` - 24 edges
4. `MedicalSpecialty` - 22 edges
5. `CareLevel` - 18 edges
6. `compilerOptions` - 17 edges
7. `compilerOptions` - 14 edges
8. `SymptomInputType` - 14 edges
9. `isAiRequestError()` - 13 edges
10. `SelectedSymptom` - 13 edges

## Surprising Connections (you probably didn't know these)
- `PdfExportRequest` --references--> `PatientData`  [EXTRACTED]
  backend/src/modules/pdf/pdf.types.ts → shared/patientData.types.ts
- `PdfExportRequest` --references--> `TriageSymptom`  [EXTRACTED]
  backend/src/modules/pdf/pdf.types.ts → shared/symptom.types.ts
- `SymptomExtractionRequest` --references--> `PatientData`  [EXTRACTED]
  backend/src/modules/symptom-extraction/symptomExtraction.types.ts → shared/patientData.types.ts
- `TriageRequest` --references--> `PatientData`  [EXTRACTED]
  backend/src/modules/triage/triage.types.ts → shared/patientData.types.ts
- `DurationSelectorProps` --references--> `TriageSymptomDuration`  [EXTRACTED]
  frontend/src/features/symptoms/DurationSelector.tsx → shared/symptom.types.ts

## Import Cycles
- None detected.

## Communities (46 total, 8 thin omitted)

### Community 0 - "Frontend-App & Assessment-Ablauf"
Cohesion: 0.06
Nodes (53): App(), PatientDataRequiredRoute(), router, MobileNavigation(), pages, PageShellProps, pages, WizardNavigation() (+45 more)

### Community 1 - "KI-Adapter & Symptomerkennung"
Cohesion: 0.06
Nodes (62): getErrorMessage(), getErrorStatus(), ModelRequest, requestStructuredAiResponse(), requestStructuredAiResponseWithModel(), requestWithModel(), runLoggedAiCall(), StructuredAiRequest (+54 more)

### Community 2 - "Triage-Logik & Plausibilitaet"
Cohesion: 0.05
Nodes (54): createTriagePrompt(), specialtyDecisionGuide, specialtyDecisionGuideText, triageInstructions, TriagePromptInput, assertPatientDataIsPlausible(), attachPresentationFields(), buildPatientDataLines() (+46 more)

### Community 3 - "Patienten- & Medizindaten-Formulare"
Cohesion: 0.05
Nodes (36): Button(), ButtonProps, Input(), Label(), cn(), PRE_EXISTING_CONDITIONS, CONDITION_DETAIL_CONFIGS, conditionIcons (+28 more)

### Community 4 - "Assessment-Service & FHIR-Export"
Cohesion: 0.07
Nodes (42): buildFallbackReviewSummary(), buildPatientDataLines(), DURATION_LABELS, evaluateAssessmentWithAi(), fallbackSpecialtyForCareLevel(), formatConditionDetail(), formatPatientData(), formatSelectedSymptoms() (+34 more)

### Community 5 - "PDF-Export & Darstellung"
Cohesion: 0.08
Nodes (43): addFooter(), addHeader(), addIntroText(), addPageNumbers(), addPdfContent(), addSectionCard(), buildSections(), cleanStructuredProfessionalSummary() (+35 more)

### Community 6 - "Frontend-Paketabhaengigkeiten"
Cohesion: 0.05
Nodes (37): dependencies, clsx, lucide-react, @radix-ui/react-label, react, react-dom, react-router, tailwind-merge (+29 more)

### Community 7 - "Praxis-/Einrichtungssuche in der Naehe"
Cohesion: 0.07
Nodes (25): buildOverpassQuery(), Coordinates, Facility, fetchNearbyFacilities(), fetchOverpassData(), getEffectiveOpeningHours(), getEmptyMessage(), getFacilityLabel() (+17 more)

### Community 8 - "Backend-App, Env & Middleware"
Cohesion: 0.09
Nodes (15): aiApiUrl, aiClient, ApiError, errorHandler(), formatZodErrors(), notFoundHandler(), RequestSchemas, validateRequest() (+7 more)

### Community 9 - "Symptomauswahl & Spracheingabe"
Cohesion: 0.08
Nodes (28): BODY_SIDE_LABELS, BODY_SIDE_TITLE_LABELS, BodySide, BodySideSelection, BrowserSpeechRecognition, BrowserSpeechRecognitionAlternative, BrowserSpeechRecognitionConstructor, BrowserSpeechRecognitionErrorEvent (+20 more)

### Community 10 - "Backend-Paket-Skripte"
Cohesion: 0.07
Nodes (28): dependencies, fastify, @fastify/cors, @fastify/helmet, openai, pdfkit, zod, devDependencies (+20 more)

### Community 11 - "PDF-/Triage-Typen & Review-Prompt"
Cohesion: 0.25
Nodes (6): reviewSummaryInstructions, ReviewSummaryPromptInput, conditionDetailSchema, triageRequestSchema, SYMPTOM_MEASUREMENT_TYPES, TRIAGE_SYMPTOM_DURATIONS

### Community 12 - "Ergebnis-Seite & Formatierung"
Cohesion: 0.14
Nodes (16): CARE_LEVEL_LABELS, EMPTY_MEDICAL_SUMMARY_SECTIONS, fallbackSpecialtyForCareLevel(), formatGender(), formatMedicalSummarySections(), formatOptionalValue(), formatTravelDisplay(), isValidMedicalSpecialty() (+8 more)

### Community 13 - "Backend-TypeScript-Konfiguration"
Cohesion: 0.10
Nodes (19): compilerOptions, forceConsistentCasingInFileNames, module, moduleResolution, noEmitOnError, noFallthroughCasesInSwitch, noImplicitReturns, noUncheckedIndexedAccess (+11 more)

### Community 14 - "Live-Tests fuer Triage-Plausibilitaet"
Cohesion: 0.14
Nodes (15): TriageEvaluationDiagnostics, adultPatientData, anticoagulatedPatientData, diabeticPatientData, immunosuppressedPatientData, pregnantPatientData, TRIAGE_PLAUSIBILITY_CATEGORIES, TRIAGE_PLAUSIBILITY_LIVE_CASES (+7 more)

### Community 15 - "Normalisierung der Symptomerkennung"
Cohesion: 0.11
Nodes (20): extractedSymptomSchema, isDuplicateSymptomDetail(), isFeverSymptom(), normalizeLabel(), normalizeOption(), normalizeRegion(), optionByNormalizedLabel, regionByNormalizedLabel (+12 more)

### Community 16 - "Mental-Health-Extraktion & Vertraege"
Cohesion: 0.15
Nodes (14): mentalHealthExtractionInstructions, MentalHealthExtractionPromptInput, SymptomExtractionRequest, SymptomExtractionResponse, SymptomInputValidationResponse, TriageRequest, SymptomExtractionResponse, SymptomInputValidationResponse (+6 more)

### Community 17 - "Ergebniskarten & gemeinsame Ergebnis-Typen"
Cohesion: 0.28
Nodes (12): PdfTriageResult, TriageResponse, NearbyPracticeSearchProps, TriageResult, ResultCardConfig, ResultCardProps, TriageRequest, TriageResult (+4 more)

### Community 18 - "Frontend-TypeScript-Konfiguration"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 19 - "Backend-Benchmark-Skripte"
Cohesion: 0.20
Nodes (12): calculateMetrics(), createAssessmentPayload(), main(), patientData, postJson(), runCase(), seconds(), testCases (+4 more)

### Community 20 - "Frontend-Empfehlungskonfiguration"
Cohesion: 0.19
Nodes (8): BasicCareLevel, isCareLevel(), isMedicalSpecialty(), MEDICAL_SPECIALTY_EXPLANATIONS, MEDICAL_SPECIALTY_LABELS, TRIAGE_CONFIGS, basePatient, CARE_LEVELS

### Community 21 - "Symptomdetail-Steuerung"
Cohesion: 0.23
Nodes (7): DurationSelectorProps, SymptomDetailsForm(), SymptomDetailsFormProps, DURATIONS, getMeasurementConfigByType(), regions, TriageSymptomDuration

### Community 22 - "Testfaelle fuer Triage-Fachrichtungen"
Cohesion: 0.22
Nodes (8): adultPatientData, childPatientData, femalePatientData, SpecialistMedicalSpecialty, TRIAGE_SPECIALTY_CASES, TriageSpecialtyCase, NON_SPECIALIST_SPECIALTIES, MEDICAL_SPECIALTIES

### Community 23 - "API-Client fuer Symptomerkennung"
Cohesion: 0.33
Nodes (9): SymptomConsistencyResponse, extractSymptomsFromText(), omitMoodFromPatientData(), SymptomConsistencyResponse, validateSymptomConsistency(), validateSymptomDetailInput(), validateSymptomInput(), BodyLocationConfidence (+1 more)

### Community 24 - "Frontend-Fachrichtungsempfehlung"
Cohesion: 0.40
Nodes (9): createSpecialtyConfig(), addSpecialty(), getFrontendTriageRecommendation(), hasAdministrativeRequest(), hasHighSuicidalIdeation(), hasPsychRequest(), includesAny(), normalize() (+1 more)

### Community 25 - "Symptom-Konstanten & Messwerte"
Cohesion: 0.22
Nodes (8): BODY_AREA_LABELS, BODY_AREA_REGION_IDS, BodyAreaCategory, Duration, EMERGENCY_SYMPTOM_OPTIONS, getBodyRegionsForCategory(), getMeasurementConfig(), MEASUREMENT_CONFIGS

### Community 27 - "Modal & Schmerzskala-UI"
Cohesion: 0.29
Nodes (3): ModalProps, PainScaleSelectorProps, MeasurementConfig

### Community 28 - "Symptom-Button-Grid"
Cohesion: 0.29
Nodes (6): InlineOption, OtherRegion, SymptomButtonGridProps, SymptomGridItem, BODY_REGIONS, BodyRegion

### Community 29 - "TypeScript-Konfiguration fuer Backend-Tests"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, types, exclude, extends, include

### Community 30 - "Notfall-Symptom-Grid"
Cohesion: 0.40
Nodes (3): EmergencySymptom, EmergencySymptomGridProps, symptoms

### Community 31 - "Root-Package PDF-Abhaengigkeiten"
Cohesion: 0.40
Nodes (4): dependencies, pdfkit, devDependencies, @types/pdfkit

### Community 32 - "PDF-Routen-Integrationstest"
Cohesion: 0.16
Nodes (10): PdfExportRequest, pdfExportRequestSchema, PdfExportResult, PdfReviewSummary, PdfSection, pdfTriageResultSchema, patientDataSchema, ReviewSummary (+2 more)

## Knowledge Gaps
- **273 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PatientData` connect `Frontend-App & Assessment-Ablauf` to `PDF-Routen-Integrationstest`, `KI-Adapter & Symptomerkennung`, `Triage-Logik & Plausibilitaet`, `Patienten- & Medizindaten-Formulare`, `Assessment-Service & FHIR-Export`, `PDF-Export & Darstellung`, `PDF-/Triage-Typen & Review-Prompt`, `Ergebnis-Seite & Formatierung`, `Live-Tests fuer Triage-Plausibilitaet`, `Normalisierung der Symptomerkennung`, `Mental-Health-Extraktion & Vertraege`, `Frontend-Empfehlungskonfiguration`, `Testfaelle fuer Triage-Fachrichtungen`, `API-Client fuer Symptomerkennung`, `Frontend-Fachrichtungsempfehlung`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `TriageSymptom` connect `Mental-Health-Extraktion & Vertraege` to `PDF-Routen-Integrationstest`, `KI-Adapter & Symptomerkennung`, `Triage-Logik & Plausibilitaet`, `Frontend-App & Assessment-Ablauf`, `Assessment-Service & FHIR-Export`, `PDF-Export & Darstellung`, `Symptomauswahl & Spracheingabe`, `PDF-/Triage-Typen & Review-Prompt`, `Live-Tests fuer Triage-Plausibilitaet`, `Normalisierung der Symptomerkennung`, `Testfaelle fuer Triage-Fachrichtungen`, `API-Client fuer Symptomerkennung`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `MedicalSpecialty` connect `Ergebniskarten & gemeinsame Ergebnis-Typen` to `PDF-Routen-Integrationstest`, `Frontend-App & Assessment-Ablauf`, `Triage-Logik & Plausibilitaet`, `PDF-Export & Darstellung`, `Praxis-/Einrichtungssuche in der Naehe`, `PDF-/Triage-Typen & Review-Prompt`, `Ergebnis-Seite & Formatierung`, `Frontend-Empfehlungskonfiguration`, `Testfaelle fuer Triage-Fachrichtungen`, `Frontend-Fachrichtungsempfehlung`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend-App & Assessment-Ablauf` be split into smaller, more focused modules?**
  _Cohesion score 0.0560126582278481 - nodes in this community are weakly interconnected._
- **Should `KI-Adapter & Symptomerkennung` be split into smaller, more focused modules?**
  _Cohesion score 0.058747160012982795 - nodes in this community are weakly interconnected._
- **Should `Triage-Logik & Plausibilitaet` be split into smaller, more focused modules?**
  _Cohesion score 0.05336538461538461 - nodes in this community are weakly interconnected._