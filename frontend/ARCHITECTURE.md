# HeptaCode Frontend Architektur

Dieses Dokument beschreibt die aktuelle Architektur des HeptaCode-Frontends. Es soll neuen Entwicklerinnen und Entwicklern helfen, den Aufbau, den Datenfluss und die wichtigsten technischen Entscheidungen schnell zu verstehen.

Das Frontend ist eine React/Vite-Anwendung für einen mehrstufigen medizinischen Ersteinschätzungs-Flow. Die Nutzer geben zuerst Stammdaten und medizinische Zusatzinformationen ein, wählen anschließend Beschwerden aus oder beschreiben sie per Freitext/Sprache und erhalten am Ende eine Einschätzung mit Empfehlung und PDF-Export.

## Tech Stack

Das Frontend verwendet:

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS v4
- Vitest
- React Testing Library
- Lucide React Icons

Die Anwendung läuft lokal standardmäßig auf Port `5173`.

```bash
cd frontend
npm install
npm run dev
```

Weitere wichtige Befehle:

```bash
npm run check
npm run build
npm test -- --run
npm run test:coverage -- --run
```

## Einstiegspunkt

Der technische Einstieg liegt in:

```text
src/main.tsx
```

Dort wird die React-App in den DOM gerendert.

```text
main.tsx
  -> app/App.tsx
    -> AssessmentProvider
      -> RouterProvider
```

`App.tsx` hängt den globalen `AssessmentProvider` um die gesamte Anwendung. Dadurch können alle Seiten auf den gemeinsamen Assessment-Zustand zugreifen.

## Ordnerstruktur

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── router.tsx
│   │
│   ├── assets/
│   │   ├── emergency/
│   │   ├── symptoms/
│   │   └── heptacheck-logo.png
│   │
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── MobileNavigation.tsx
│   │   ├── PageShell.tsx
│   │   ├── WizardNavigation.tsx
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── emergency/
│   │   ├── results/
│   │   └── symptoms/
│   │
│   ├── lib/
│   │   ├── apiClient.ts
│   │   ├── AssessmentContext.tsx
│   │   ├── assessmentValidation.ts
│   │   ├── specialtyRecommendation.ts
│   │   ├── symptomExtractionApi.ts
│   │   └── triageRecommendation.ts
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── PatientDataPage.tsx
│   │   ├── MedicalDataPage.tsx
│   │   ├── PreExistingConditionsPage.tsx
│   │   ├── SymptomSelectionPage.tsx
│   │   ├── SymptomDetailsPage.tsx
│   │   └── ResultPage.tsx
│   │
│   ├── styles/
│   │   ├── fonts.css
│   │   ├── index.css
│   │   ├── tailwind.css
│   │   └── theme.css
│   │
│   ├── types/
│   │   ├── assessment.ts
│   │   └── triage.ts
│   │
│   └── vite-env.d.ts
│
├── tests/
│   ├── setup/
│   └── unit/
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Verantwortlichkeiten der Hauptordner

### `src/app`

Enthält den technischen App-Rahmen.

- `App.tsx` verbindet Context und Router.
- `router.tsx` definiert alle Frontend-Routen und einfache Zugriffsschutzlogik.

### `src/pages`

Enthält die vollständigen Seiten des Nutzerflows. Pages orchestrieren Navigation, Context-Zugriffe, lokale Formularzustände und Feature-Komponenten.

Eine Page sollte nicht zu viel wiederverwendbare Fachlogik enthalten. Sobald Logik mehrfach gebraucht wird oder fachlich klar abgrenzbar ist, sollte sie nach `features/`, `lib/` oder `types/` ausgelagert werden.

### `src/components`

Enthält allgemeine UI-Bausteine, die projektweit verwendet werden.

Beispiele:

- `PageShell`
- `Button`
- `Modal`
- `WizardNavigation`
- `MobileNavigation`

Änderungen in diesem Ordner wirken häufig global.

### `src/features`

Enthält fachliche Komponenten und Logik, gruppiert nach Domänen.

Aktuelle Feature-Bereiche:

```text
features/emergency
features/symptoms
features/results
```

Beispiele:

- Notfall-Symptomauswahl
- Symptom-Buttons
- Schmerz-/Dauer-Auswahl
- Ergebnis-Karten
- Standort-/Praxissuche

### `src/lib`

Enthält Infrastruktur- und Anwendungslogik, die nicht direkt UI ist.

Wichtige Dateien:

- `AssessmentContext.tsx`
- `apiClient.ts`
- `assessmentValidation.ts`
- `symptomExtractionApi.ts`
- `triageRecommendation.ts`
- `specialtyRecommendation.ts`

### `src/types`

Enthält Frontend-Typen und Re-Exports aus `shared`.

Aktuell werden einige Typen noch relativ aus dem Root-Ordner `shared` importiert, z.B.:

```ts
../../../shared/...
```

Zielzustand sollte sein, `shared` als Workspace-Package zu verwenden, damit Importe stabiler und sauberer werden, z.B.:

```ts
@heptacode/shared
```

Das ist besonders wichtig, weil relative Imports über mehrere Ordnerebenen fehleranfällig sind.

### `src/assets`

Enthält statische Assets wie Icons, Symptom-Bilder und Logo.

### `src/styles`

Enthält globale Styles, Tailwind-Einstieg und Design-Tokens.

## Routing

Die Routen sind in `src/app/router.tsx` definiert.

Aktuelle Haupt-Routen:

```text
/                         LandingPage
/patient-data             PatientDataPage
/medical-data             MedicalDataPage
/pre-existing-conditions  PreExistingConditionsPage
/symptom-selection        SymptomSelectionPage
/symptom-details          SymptomDetailsPage
/result                   ResultPage
```

Die Route `/result?emergency=true` ist ein Sonderfall für akute Notfallsymptome. Sie darf auch ohne vollständige Stammdaten angezeigt werden.

Für alle anderen späteren Schritte prüft `PatientDataRequiredRoute`, ob gültige Stammdaten vorhanden sind. Falls nicht, wird auf `/patient-data` weitergeleitet.

## Nutzerflow

Der normale Flow ist:

```text
LandingPage
  -> PatientDataPage
  -> MedicalDataPage
  -> PreExistingConditionsPage
  -> SymptomSelectionPage
  -> SymptomDetailsPage
  -> ResultPage
```

Der Notfall-Flow ist:

```text
LandingPage
  -> ResultPage?emergency=true
```

Wenn auf der LandingPage ein Red-Flag-Symptom ausgewählt wird, wird der normale Assessment-Zustand zurückgesetzt und direkt die Notfall-Ergebnisseite geöffnet.

## Globaler Assessment-Zustand

Der zentrale Zustand liegt in:

```text
src/lib/AssessmentContext.tsx
```

Der Context verwaltet:

- `patientData`
- `selectedSymptoms`
- `symptomText`
- `symptomDetails`
- `assessmentResult`
- `evaluationProgress`
- `isEvaluating`

Außerdem stellt er Funktionen bereit wie:

- `setPatientData`
- `setSelectedSymptoms`
- `setSymptomText`
- `setSymptomDetails`
- `submitAssessment`
- `resetAssessment`

Der Zustand wird in `sessionStorage` gespeichert. Dadurch bleiben Nutzereingaben beim Neuladen der Seite kurzfristig erhalten. Die gespeicherten Daten haben aktuell eine TTL von 10 Minuten.

Storage-Key:

```text
heptacheck.assessment.v1
```

Wichtig: Wenn sich relevante Eingaben ändern, wird ein vorhandenes Assessment-Ergebnis invalidiert. Dadurch wird verhindert, dass ein altes Ergebnis angezeigt wird, obwohl die Eingaben inzwischen verändert wurden.

## API-Kommunikation

Die allgemeine API-Kommunikation läuft über:

```text
src/lib/apiClient.ts
```

Standardmäßig verwendet das Frontend:

```text
http://localhost:3000
```

Der Wert kann über folgende Environment Variable überschrieben werden:

```env
VITE_API_BASE_URL=
```

Der API-Client sendet JSON und wirft bei Fehlerantworten eine `Error`-Instanz mit möglichst verständlicher Fehlermeldung.

## Symptom-Eingabe

Die Symptom-Eingabe liegt hauptsächlich in:

```text
src/pages/SymptomSelectionPage.tsx
```

Es gibt zwei Eingabemodi:

1. Körperstelle manuell auswählen
2. Beschwerden frei beschreiben, auch per Spracheingabe

Wichtig für die Architektur:

Manuelle Auswahl und Freitext/Sprache sind fachlich alternative Eingabewege. Sie sollen nicht als ergänzende Eingaben gemischt werden.

Das bedeutet:

- Manuell ausgewählte Symptome werden über `selectedSymptoms` geführt.
- Freitext/Sprache wird zuerst als `symptomText` gespeichert.
- Die KI-/Backend-Extraktion wandelt den Text in strukturierte Symptome um.
- Diese extrahierten Symptome ersetzen die manuelle Auswahl.
- Das System arbeitet danach wieder mit strukturierten Symptomen weiter.

Dadurch bleibt der weitere Flow einheitlich, weil `SymptomDetailsPage` und `submitAssessment` strukturierte Symptome erwarten.

## Spracheingabe

Die Spracheingabe verwendet die Browser Speech Recognition API, falls der Browser sie unterstützt.

Dabei gilt:

- Spracheingabe ist Teil des Freitext-Modus.
- Die Aufnahme ist zeitlich begrenzt.
- Erkanntes Transkript wird in das Freitextfeld geschrieben.
- Danach wird der Text über das Backend in Symptome extrahiert.
- Wenn der Browser keine Spracheingabe unterstützt oder Mikrofonrechte fehlen, wird eine Nutzermeldung angezeigt.

Die Spracheingabe ersetzt keine Backend-Logik. Sie ist nur eine bequemere Eingabeform für Freitext.

## Symptom-Details

Die Detailseite liegt in:

```text
src/pages/SymptomDetailsPage.tsx
```

Sie arbeitet mit den in `selectedSymptoms` gespeicherten Symptomen und erzeugt daraus editierbare `SymptomDrafts`.

Auf dieser Seite werden pro Symptom u.a. erfasst:

- Region
- Seite
- Stärke bzw. Messwert
- Dauer
- optionale Details

Maximal werden aktuell drei Symptome unterstützt.

Die Konfiguration für Symptome, Körperregionen, Messarten und Dauerwerte liegt in:

```text
src/features/symptoms/symptoms.constants.ts
```

## Assessment Submit

Die Submit-Logik liegt verteilt in:

```text
src/features/symptoms/handleSubmitAssessment.ts
src/lib/AssessmentContext.tsx
```

Ablauf:

1. Aktive Symptome werden gesammelt.
2. Dauer und Stärke werden validiert.
3. Bei KI-extrahierten Symptomen kann zusätzlich eine Konsistenzprüfung erfolgen.
4. `submitAssessment` baut das finale Payload.
5. Das Frontend sendet die Daten an das Backend.
6. Das Ergebnis wird im Context gespeichert.
7. Danach wird auf `/result` navigiert.

Der Backend-Request für die finale Einschätzung geht aktuell an:

```text
POST /assessments
```

## Ergebnis-Seite

Die Ergebnis-Seite liegt in:

```text
src/pages/ResultPage.tsx
```

Sie zeigt:

- Versorgungsebene
- verständliche Zusammenfassung
- Begründungen
- Fachrichtungsempfehlung
- Notfall-/Telefonhinweise
- Standort- und Praxissuche
- editierbare medizinische Zusammenfassung
- PDF-Download

Für den PDF-Export wird ein Payload an das Backend gesendet:

```text
POST /api/v1/pdf/export
```

## Standort- und Praxissuche

Die Standortsuche liegt in:

```text
src/features/results/NearbyPracticeSearch.tsx
```

Sie nutzt:

- Browser-Geolocation
- manuelle Orts-/PLZ-Suche
- OpenStreetMap/Overpass-Daten
- Google-Maps-Routenlinks

Die Komponente versucht passende Einrichtungen zur empfohlenen Versorgungsebene zu finden, z.B.:

- Notaufnahme
- Hausarzt
- Facharzt
- Apotheke

## Validierung

Zentrale Validierungslogik liegt in:

```text
src/lib/assessmentValidation.ts
```

Dort werden u.a. geprüft:

- Stammdaten vollständig und realistisch
- mindestens ein Symptom vorhanden
- Details für Symptome vollständig
- Messwerte im erlaubten Bereich

Die Router-Guards und Wizard-Navigation verwenden diese Validierungen ebenfalls.

## Wizard Navigation

Die untere Schrittanzeige liegt in:

```text
src/components/WizardNavigation.tsx
```

Sie zeigt den Fortschritt durch den Flow und verhindert Navigation zu Schritten, für die wichtige Voraussetzungen fehlen.

Beispiele:

- Ohne gültige Stammdaten keine Navigation zu späteren Schritten.
- Ohne ausgewählte Symptome keine Navigation zu Symptomdetails.
- Ohne fertiges Assessment keine Navigation zum Ergebnis.

## Styling

Das Projekt verwendet Tailwind CSS v4.

Globale Styles liegen in:

```text
src/styles/
```

Die App nutzt viele Tailwind Utility Classes direkt in Komponenten. Wiederkehrende Farben und Textstile sollten möglichst über Theme-Styles oder gemeinsame Komponenten vereinheitlicht werden.

## Tests

Frontend-Tests liegen in:

```text
frontend/tests/
```

Verwendet werden:

- Vitest
- React Testing Library
- jsdom

Getestet werden u.a.:

- Context-Logik
- API-Client
- Seitenflows
- Formularvalidierung
- Symptom-Komponenten
- Ergebnis-Komponenten
- PDF-Download-Verhalten

Tests ausführen:

```bash
cd frontend
npm test -- --run
```

TypeScript prüfen:

```bash
npm run check
```

Build prüfen:

```bash
npm run build
```

## Environment

Wichtige Frontend-Environment-Variable:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Wenn kein Wert gesetzt ist, verwendet das Frontend automatisch:

```text
http://localhost:3000
```

Im Vite-Dev-Server ist außerdem ein Proxy für `/api` konfiguriert. Dieser leitet standardmäßig an das Backend weiter.

## Bekannte Architektur-Hinweise

### Shared Package

Aktuell werden Typen teilweise per relativem Pfad aus `shared` importiert:

```ts
../../../shared/...
```

Das sollte langfristig durch ein echtes Workspace-Package ersetzt werden.

Ziel:

```ts
@heptacode/shared
```

Vorteile:

- stabilere Imports
- bessere Trennung zwischen Frontend, Backend und Shared
- weniger fehleranfällig bei Datei-Verschiebungen
- klarere Monorepo-Struktur

### Große Pages

Einige Pages enthalten aktuell sehr viel UI- und Formularlogik. Besonders groß sind:

- `SymptomSelectionPage.tsx`
- `ResultPage.tsx`
- `MedicalDataPage.tsx`

Langfristig könnten einzelne Bereiche in kleinere Komponenten oder Hooks ausgelagert werden.

Beispiele:

- Speech Recognition Hook
- Symptom-FreeText-Komponente
- AnatomyFigure-Komponente
- Result Summary Editor
- PDF Export Helper
- Medical Accordion Sections

### Frontend ist kein medizinisches Entscheidungs-System

Das Frontend sammelt und strukturiert Nutzereingaben. Die medizinische Bewertung kommt aus Backend-/KI-Logik oder aus definierten Fallbacks.

Das Frontend sollte deshalb möglichst keine harte medizinische Entscheidungslogik duplizieren, außer sie ist bewusst als UI-Fallback oder Sicherheitsprüfung vorgesehen.

## Wartungsregeln

Bei neuen Features sollte geprüft werden:

1. Gehört die Änderung in `pages`, `features`, `components`, `lib` oder `types`?
2. Muss der globale AssessmentContext erweitert werden?
3. Muss der gespeicherte Zustand in `sessionStorage` angepasst werden?
4. Muss das Backend-Payload angepasst werden?
5. Müssen Tests ergänzt werden?
6. Muss diese Architektur-Doku aktualisiert werden?

Diese Datei sollte aktualisiert werden, wenn sich Routing, Datenfluss, globale State-Struktur, API-Endpunkte oder größere Feature-Bereiche ändern.