# Graph Report - .  (2026-06-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 860 nodes · 1696 edges · 47 communities (38 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dd4ae1de`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]

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

## Communities (47 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (53): App(), PatientDataRequiredRoute(), router, MobileNavigation(), pages, PageShellProps, pages, WizardNavigation() (+45 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (62): getErrorMessage(), getErrorStatus(), ModelRequest, requestStructuredAiResponse(), requestStructuredAiResponseWithModel(), requestWithModel(), runLoggedAiCall(), StructuredAiRequest (+54 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (54): createTriagePrompt(), specialtyDecisionGuide, specialtyDecisionGuideText, triageInstructions, TriagePromptInput, assertPatientDataIsPlausible(), attachPresentationFields(), buildPatientDataLines() (+46 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (36): Button(), ButtonProps, Input(), Label(), cn(), PRE_EXISTING_CONDITIONS, CONDITION_DETAIL_CONFIGS, conditionIcons (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (42): buildFallbackReviewSummary(), buildPatientDataLines(), DURATION_LABELS, evaluateAssessmentWithAi(), fallbackSpecialtyForCareLevel(), formatConditionDetail(), formatPatientData(), formatSelectedSymptoms() (+34 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (43): addFooter(), addHeader(), addIntroText(), addPageNumbers(), addPdfContent(), addSectionCard(), buildSections(), cleanStructuredProfessionalSummary() (+35 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (37): dependencies, clsx, lucide-react, @radix-ui/react-label, react, react-dom, react-router, tailwind-merge (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (25): buildOverpassQuery(), Coordinates, Facility, fetchNearbyFacilities(), fetchOverpassData(), getEffectiveOpeningHours(), getEmptyMessage(), getFacilityLabel() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (15): aiApiUrl, aiClient, ApiError, errorHandler(), formatZodErrors(), notFoundHandler(), RequestSchemas, validateRequest() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (28): BODY_SIDE_LABELS, BODY_SIDE_TITLE_LABELS, BodySide, BodySideSelection, BrowserSpeechRecognition, BrowserSpeechRecognitionAlternative, BrowserSpeechRecognitionConstructor, BrowserSpeechRecognitionErrorEvent (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (28): dependencies, fastify, @fastify/cors, @fastify/helmet, openai, pdfkit, zod, devDependencies (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (14): pdfExportRequestSchema, PdfExportResult, PdfReviewSummary, PdfSection, pdfTriageResultSchema, reviewSummaryInstructions, ReviewSummaryPromptInput, conditionDetailSchema (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (16): CARE_LEVEL_LABELS, EMPTY_MEDICAL_SUMMARY_SECTIONS, fallbackSpecialtyForCareLevel(), formatGender(), formatMedicalSummarySections(), formatOptionalValue(), formatTravelDisplay(), isValidMedicalSpecialty() (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (19): compilerOptions, forceConsistentCasingInFileNames, module, moduleResolution, noEmitOnError, noFallthroughCasesInSwitch, noImplicitReturns, noUncheckedIndexedAccess (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (15): TriageEvaluationDiagnostics, adultPatientData, anticoagulatedPatientData, diabeticPatientData, immunosuppressedPatientData, pregnantPatientData, TRIAGE_PLAUSIBILITY_CATEGORIES, TRIAGE_PLAUSIBILITY_LIVE_CASES (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (13): extractedSymptomSchema, isDuplicateSymptomDetail(), isFeverSymptom(), normalizeLabel(), normalizeOption(), normalizeRegion(), optionByNormalizedLabel, regionByNormalizedLabel (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (14): mentalHealthExtractionInstructions, MentalHealthExtractionPromptInput, SymptomExtractionRequest, SymptomExtractionResponse, SymptomInputValidationResponse, TriageRequest, SymptomExtractionResponse, SymptomInputValidationResponse (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.28
Nodes (12): PdfTriageResult, TriageResponse, NearbyPracticeSearchProps, TriageResult, ResultCardConfig, ResultCardProps, TriageRequest, TriageResult (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (12): calculateMetrics(), createAssessmentPayload(), main(), patientData, postJson(), runCase(), seconds(), testCases (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.19
Nodes (8): BasicCareLevel, isCareLevel(), isMedicalSpecialty(), MEDICAL_SPECIALTY_EXPLANATIONS, MEDICAL_SPECIALTY_LABELS, TRIAGE_CONFIGS, basePatient, CARE_LEVELS

### Community 21 - "Community 21"
Cohesion: 0.23
Nodes (7): DurationSelectorProps, SymptomDetailsForm(), SymptomDetailsFormProps, DURATIONS, getMeasurementConfigByType(), regions, TriageSymptomDuration

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (8): adultPatientData, childPatientData, femalePatientData, SpecialistMedicalSpecialty, TRIAGE_SPECIALTY_CASES, TriageSpecialtyCase, NON_SPECIALIST_SPECIALTIES, MEDICAL_SPECIALTIES

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (9): SymptomConsistencyResponse, extractSymptomsFromText(), omitMoodFromPatientData(), SymptomConsistencyResponse, validateSymptomConsistency(), validateSymptomDetailInput(), validateSymptomInput(), BodyLocationConfidence (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (9): createSpecialtyConfig(), addSpecialty(), getFrontendTriageRecommendation(), hasAdministrativeRequest(), hasHighSuicidalIdeation(), hasPsychRequest(), includesAny(), normalize() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): BODY_AREA_LABELS, BODY_AREA_REGION_IDS, BodyAreaCategory, Duration, EMERGENCY_SYMPTOM_OPTIONS, getBodyRegionsForCategory(), getMeasurementConfig(), MEASUREMENT_CONFIGS

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (7): BODY_LOCATION_CONFIDENCE_LEVELS, BODY_LOCATION_IDS, getBodyLocationTaxonomy(), OPTIONS_BY_REGION, SYMPTOM_REGION_NAMES, SYMPTOM_REGIONS, SymptomRegionName

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (3): ModalProps, PainScaleSelectorProps, MeasurementConfig

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (6): InlineOption, OtherRegion, SymptomButtonGridProps, SymptomGridItem, BODY_REGIONS, BodyRegion

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, types, exclude, extends, include

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (3): EmergencySymptom, EmergencySymptomGridProps, symptoms

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (4): dependencies, pdfkit, devDependencies, @types/pdfkit

## Knowledge Gaps
- **273 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PatientData` connect `Community 0` to `Community 32`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 20`, `Community 22`, `Community 23`, `Community 24`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `TriageSymptom` connect `Community 16` to `Community 32`, `Community 1`, `Community 2`, `Community 0`, `Community 4`, `Community 5`, `Community 9`, `Community 11`, `Community 14`, `Community 15`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `MedicalSpecialty` connect `Community 17` to `Community 0`, `Community 2`, `Community 5`, `Community 7`, `Community 11`, `Community 12`, `Community 20`, `Community 22`, `Community 24`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0560126582278481 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.058747160012982795 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05336538461538461 - nodes in this community are weakly interconnected._