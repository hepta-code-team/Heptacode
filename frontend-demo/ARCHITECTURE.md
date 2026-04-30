# HeptaCode Frontend Architektur

Dieses Frontend ist als schlanker React/Vite-Prototyp aufgebaut. Die Struktur trennt Routing, Seiten, wiederverwendbare UI-Komponenten, fachliche Features, globale Types und Infrastruktur-Code.

## Struktur

```text
src/
├── app/
│   ├── App.tsx
│   └── router.tsx
├── pages/
│   ├── LandingPage.tsx
│   ├── PatientDataPage.tsx
│   ├── SymptomSelectionPage.tsx
│   ├── SymptomDetailsPage.tsx
│   └── ResultPage.tsx
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── MobileNavigation.tsx
│   ├── PageShell.tsx
│   ├── WizardNavigation.tsx
│   └── ui/
├── features/
│   ├── emergency/
│   ├── results/
│   └── symptoms/
├── lib/
│   ├── apiClient.ts
│   └── AssessmentContext.tsx
├── types/
│   ├── assessment.ts
│   └── triage.ts
└── main.tsx
```

## Verantwortlichkeiten

- `app/`: App-Shell und Routing. Legacy-URLs leiten auf die aktuellen URLs weiter.
- `pages/`: Seiten des Triage-Flows. Pages orchestrieren Navigation, Context und Feature-Komponenten.
- `components/`: Projektweite UI-Bausteine. Änderungen hier wirken bewusst global.
- `features/`: Domänenspezifische Bausteine, getrennt nach `emergency`, `symptoms` und `results`.
- `lib/`: Infrastruktur wie globaler Assessment-State und Backend-Client.
- `types/`: Gemeinsame TypeScript-Typen für Assessment und Triage.

## Flow

```text
LandingPage
  ├─ Red-Flag-Symptom -> ResultPage?emergency=true
  └─ Keine Red Flag -> PatientDataPage -> SymptomSelectionPage -> SymptomDetailsPage -> ResultPage
```

Der aktuelle Prototyp berechnet die Empfehlung noch lokal aus Red Flags und Schmerzintensität. Die spätere Backend- oder KI-Auswertung sollte über `src/lib/apiClient.ts` angebunden werden.
