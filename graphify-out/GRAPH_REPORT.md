# Graph Report - .  (2026-06-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 860 nodes · 1696 edges · 46 communities (38 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5929a741`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend App & Assessment Flow|Frontend App & Assessment Flow]]
- [[_COMMUNITY_AI Adapter & Symptom Extraction|AI Adapter & Symptom Extraction]]
- [[_COMMUNITY_Triage Logic & Plausibility|Triage Logic & Plausibility]]
- [[_COMMUNITY_Patient & Medical Data Forms|Patient & Medical Data Forms]]
- [[_COMMUNITY_Assessment Service & FHIR Output|Assessment Service & FHIR Output]]
- [[_COMMUNITY_PDF Export Rendering|PDF Export Rendering]]
- [[_COMMUNITY_Frontend Package Dependencies|Frontend Package Dependencies]]
- [[_COMMUNITY_Nearby Practice Search|Nearby Practice Search]]
- [[_COMMUNITY_Backend App, Env & Middleware|Backend App, Env & Middleware]]
- [[_COMMUNITY_Symptom Selection & Speech Input|Symptom Selection & Speech Input]]
- [[_COMMUNITY_Backend Package Scripts|Backend Package Scripts]]
- [[_COMMUNITY_PDFTriage Types & Review Prompt|PDF/Triage Types & Review Prompt]]
- [[_COMMUNITY_Result Page Formatting|Result Page Formatting]]
- [[_COMMUNITY_Backend TypeScript Config|Backend TypeScript Config]]
- [[_COMMUNITY_Triage Plausibility Live Tests|Triage Plausibility Live Tests]]
- [[_COMMUNITY_Symptom Extraction Normalization|Symptom Extraction Normalization]]
- [[_COMMUNITY_Mental Health Extraction Contracts|Mental Health Extraction Contracts]]
- [[_COMMUNITY_Result Cards & Shared Result Types|Result Cards & Shared Result Types]]
- [[_COMMUNITY_Frontend TypeScript Config|Frontend TypeScript Config]]
- [[_COMMUNITY_Backend Benchmark Scripts|Backend Benchmark Scripts]]
- [[_COMMUNITY_Frontend Recommendation Config|Frontend Recommendation Config]]
- [[_COMMUNITY_Symptom Detail Controls|Symptom Detail Controls]]
- [[_COMMUNITY_Triage Specialty Test Cases|Triage Specialty Test Cases]]
- [[_COMMUNITY_Symptom Extraction API Client|Symptom Extraction API Client]]
- [[_COMMUNITY_Frontend Specialty Recommendation|Frontend Specialty Recommendation]]
- [[_COMMUNITY_Symptom Constants & Measurements|Symptom Constants & Measurements]]
- [[_COMMUNITY_Modal & Pain Scale UI|Modal & Pain Scale UI]]
- [[_COMMUNITY_Symptom Button Grid|Symptom Button Grid]]
- [[_COMMUNITY_Backend Test TypeScript Config|Backend Test TypeScript Config]]
- [[_COMMUNITY_Emergency Symptom Grid|Emergency Symptom Grid]]
- [[_COMMUNITY_Root Package PDF Dependencies|Root Package PDF Dependencies]]
- [[_COMMUNITY_PDF Route Integration Test|PDF Route Integration Test]]
- [[_COMMUNITY_Mental Health Risk Prompt|Mental Health Risk Prompt]]
- [[_COMMUNITY_Assessment Request Schema|Assessment Request Schema]]
- [[_COMMUNITY_PDF Request Schema|PDF Request Schema]]
- [[_COMMUNITY_Symptom Extraction Request Schema|Symptom Extraction Request Schema]]
- [[_COMMUNITY_Triage Request Schema|Triage Request Schema]]
- [[_COMMUNITY_Docker Start Script|Docker Start Script]]
- [[_COMMUNITY_Result Feature Types|Result Feature Types]]
- [[_COMMUNITY_Shared Package Metadata|Shared Package Metadata]]

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

### Community 0 - "Frontend App & Assessment Flow"
Cohesion: 0.06
Nodes (53): App(), PatientDataRequiredRoute(), router, MobileNavigation(), pages, PageShellProps, pages, WizardNavigation() (+45 more)

### Community 1 - "AI Adapter & Symptom Extraction"
Cohesion: 0.06
Nodes (62): getErrorMessage(), getErrorStatus(), ModelRequest, requestStructuredAiResponse(), requestStructuredAiResponseWithModel(), requestWithModel(), runLoggedAiCall(), StructuredAiRequest (+54 more)

### Community 2 - "Triage Logic & Plausibility"
Cohesion: 0.05
Nodes (54): createTriagePrompt(), specialtyDecisionGuide, specialtyDecisionGuideText, triageInstructions, TriagePromptInput, assertPatientDataIsPlausible(), attachPresentationFields(), buildPatientDataLines() (+46 more)

### Community 3 - "Patient & Medical Data Forms"
Cohesion: 0.05
Nodes (36): Button(), ButtonProps, Input(), Label(), cn(), PRE_EXISTING_CONDITIONS, CONDITION_DETAIL_CONFIGS, conditionIcons (+28 more)

### Community 4 - "Assessment Service & FHIR Output"
Cohesion: 0.07
Nodes (42): buildFallbackReviewSummary(), buildPatientDataLines(), DURATION_LABELS, evaluateAssessmentWithAi(), fallbackSpecialtyForCareLevel(), formatConditionDetail(), formatPatientData(), formatSelectedSymptoms() (+34 more)

### Community 5 - "PDF Export Rendering"
Cohesion: 0.08
Nodes (43): addFooter(), addHeader(), addIntroText(), addPageNumbers(), addPdfContent(), addSectionCard(), buildSections(), cleanStructuredProfessionalSummary() (+35 more)

### Community 6 - "Frontend Package Dependencies"
Cohesion: 0.05
Nodes (37): dependencies, clsx, lucide-react, @radix-ui/react-label, react, react-dom, react-router, tailwind-merge (+29 more)

### Community 7 - "Nearby Practice Search"
Cohesion: 0.07
Nodes (25): buildOverpassQuery(), Coordinates, Facility, fetchNearbyFacilities(), fetchOverpassData(), getEffectiveOpeningHours(), getEmptyMessage(), getFacilityLabel() (+17 more)

### Community 8 - "Backend App, Env & Middleware"
Cohesion: 0.09
Nodes (15): aiApiUrl, aiClient, ApiError, errorHandler(), formatZodErrors(), notFoundHandler(), RequestSchemas, validateRequest() (+7 more)

### Community 9 - "Symptom Selection & Speech Input"
Cohesion: 0.08
Nodes (28): BODY_SIDE_LABELS, BODY_SIDE_TITLE_LABELS, BodySide, BodySideSelection, BrowserSpeechRecognition, BrowserSpeechRecognitionAlternative, BrowserSpeechRecognitionConstructor, BrowserSpeechRecognitionErrorEvent (+20 more)

### Community 10 - "Backend Package Scripts"
Cohesion: 0.07
Nodes (28): dependencies, fastify, @fastify/cors, @fastify/helmet, openai, pdfkit, zod, devDependencies (+20 more)

### Community 11 - "PDF/Triage Types & Review Prompt"
Cohesion: 0.25
Nodes (6): reviewSummaryInstructions, ReviewSummaryPromptInput, conditionDetailSchema, triageRequestSchema, SYMPTOM_MEASUREMENT_TYPES, TRIAGE_SYMPTOM_DURATIONS

### Community 12 - "Result Page Formatting"
Cohesion: 0.14
Nodes (16): CARE_LEVEL_LABELS, EMPTY_MEDICAL_SUMMARY_SECTIONS, fallbackSpecialtyForCareLevel(), formatGender(), formatMedicalSummarySections(), formatOptionalValue(), formatTravelDisplay(), isValidMedicalSpecialty() (+8 more)

### Community 13 - "Backend TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, forceConsistentCasingInFileNames, module, moduleResolution, noEmitOnError, noFallthroughCasesInSwitch, noImplicitReturns, noUncheckedIndexedAccess (+11 more)

### Community 14 - "Triage Plausibility Live Tests"
Cohesion: 0.14
Nodes (15): TriageEvaluationDiagnostics, adultPatientData, anticoagulatedPatientData, diabeticPatientData, immunosuppressedPatientData, pregnantPatientData, TRIAGE_PLAUSIBILITY_CATEGORIES, TRIAGE_PLAUSIBILITY_LIVE_CASES (+7 more)

### Community 15 - "Symptom Extraction Normalization"
Cohesion: 0.11
Nodes (20): extractedSymptomSchema, isDuplicateSymptomDetail(), isFeverSymptom(), normalizeLabel(), normalizeOption(), normalizeRegion(), optionByNormalizedLabel, regionByNormalizedLabel (+12 more)

### Community 16 - "Mental Health Extraction Contracts"
Cohesion: 0.15
Nodes (14): mentalHealthExtractionInstructions, MentalHealthExtractionPromptInput, SymptomExtractionRequest, SymptomExtractionResponse, SymptomInputValidationResponse, TriageRequest, SymptomExtractionResponse, SymptomInputValidationResponse (+6 more)

### Community 17 - "Result Cards & Shared Result Types"
Cohesion: 0.28
Nodes (12): PdfTriageResult, TriageResponse, NearbyPracticeSearchProps, TriageResult, ResultCardConfig, ResultCardProps, TriageRequest, TriageResult (+4 more)

### Community 18 - "Frontend TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 19 - "Backend Benchmark Scripts"
Cohesion: 0.20
Nodes (12): calculateMetrics(), createAssessmentPayload(), main(), patientData, postJson(), runCase(), seconds(), testCases (+4 more)

### Community 20 - "Frontend Recommendation Config"
Cohesion: 0.19
Nodes (8): BasicCareLevel, isCareLevel(), isMedicalSpecialty(), MEDICAL_SPECIALTY_EXPLANATIONS, MEDICAL_SPECIALTY_LABELS, TRIAGE_CONFIGS, basePatient, CARE_LEVELS

### Community 21 - "Symptom Detail Controls"
Cohesion: 0.23
Nodes (7): DurationSelectorProps, SymptomDetailsForm(), SymptomDetailsFormProps, DURATIONS, getMeasurementConfigByType(), regions, TriageSymptomDuration

### Community 22 - "Triage Specialty Test Cases"
Cohesion: 0.22
Nodes (8): adultPatientData, childPatientData, femalePatientData, SpecialistMedicalSpecialty, TRIAGE_SPECIALTY_CASES, TriageSpecialtyCase, NON_SPECIALIST_SPECIALTIES, MEDICAL_SPECIALTIES

### Community 23 - "Symptom Extraction API Client"
Cohesion: 0.33
Nodes (9): SymptomConsistencyResponse, extractSymptomsFromText(), omitMoodFromPatientData(), SymptomConsistencyResponse, validateSymptomConsistency(), validateSymptomDetailInput(), validateSymptomInput(), BodyLocationConfidence (+1 more)

### Community 24 - "Frontend Specialty Recommendation"
Cohesion: 0.40
Nodes (9): createSpecialtyConfig(), addSpecialty(), getFrontendTriageRecommendation(), hasAdministrativeRequest(), hasHighSuicidalIdeation(), hasPsychRequest(), includesAny(), normalize() (+1 more)

### Community 25 - "Symptom Constants & Measurements"
Cohesion: 0.22
Nodes (8): BODY_AREA_LABELS, BODY_AREA_REGION_IDS, BodyAreaCategory, Duration, EMERGENCY_SYMPTOM_OPTIONS, getBodyRegionsForCategory(), getMeasurementConfig(), MEASUREMENT_CONFIGS

### Community 27 - "Modal & Pain Scale UI"
Cohesion: 0.29
Nodes (3): ModalProps, PainScaleSelectorProps, MeasurementConfig

### Community 28 - "Symptom Button Grid"
Cohesion: 0.29
Nodes (6): InlineOption, OtherRegion, SymptomButtonGridProps, SymptomGridItem, BODY_REGIONS, BodyRegion

### Community 29 - "Backend Test TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, types, exclude, extends, include

### Community 30 - "Emergency Symptom Grid"
Cohesion: 0.40
Nodes (3): EmergencySymptom, EmergencySymptomGridProps, symptoms

### Community 31 - "Root Package PDF Dependencies"
Cohesion: 0.40
Nodes (4): dependencies, pdfkit, devDependencies, @types/pdfkit

### Community 32 - "PDF Route Integration Test"
Cohesion: 0.16
Nodes (10): PdfExportRequest, pdfExportRequestSchema, PdfExportResult, PdfReviewSummary, PdfSection, pdfTriageResultSchema, patientDataSchema, ReviewSummary (+2 more)

## Knowledge Gaps
- **273 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PatientData` connect `Frontend App & Assessment Flow` to `PDF Route Integration Test`, `AI Adapter & Symptom Extraction`, `Triage Logic & Plausibility`, `Patient & Medical Data Forms`, `Assessment Service & FHIR Output`, `PDF Export Rendering`, `PDF/Triage Types & Review Prompt`, `Result Page Formatting`, `Triage Plausibility Live Tests`, `Symptom Extraction Normalization`, `Mental Health Extraction Contracts`, `Frontend Recommendation Config`, `Triage Specialty Test Cases`, `Symptom Extraction API Client`, `Frontend Specialty Recommendation`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `TriageSymptom` connect `Mental Health Extraction Contracts` to `PDF Route Integration Test`, `AI Adapter & Symptom Extraction`, `Triage Logic & Plausibility`, `Frontend App & Assessment Flow`, `Assessment Service & FHIR Output`, `PDF Export Rendering`, `Symptom Selection & Speech Input`, `PDF/Triage Types & Review Prompt`, `Triage Plausibility Live Tests`, `Symptom Extraction Normalization`, `Triage Specialty Test Cases`, `Symptom Extraction API Client`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `MedicalSpecialty` connect `Result Cards & Shared Result Types` to `PDF Route Integration Test`, `Frontend App & Assessment Flow`, `Triage Logic & Plausibility`, `PDF Export Rendering`, `Nearby Practice Search`, `PDF/Triage Types & Review Prompt`, `Result Page Formatting`, `Frontend Recommendation Config`, `Triage Specialty Test Cases`, `Frontend Specialty Recommendation`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend App & Assessment Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.0560126582278481 - nodes in this community are weakly interconnected._
- **Should `AI Adapter & Symptom Extraction` be split into smaller, more focused modules?**
  _Cohesion score 0.058747160012982795 - nodes in this community are weakly interconnected._
- **Should `Triage Logic & Plausibility` be split into smaller, more focused modules?**
  _Cohesion score 0.05336538461538461 - nodes in this community are weakly interconnected._