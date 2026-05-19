# Backend-Frontend-Response: Dokumentation der Anpassungen

## Überblick

Im Branch `backend/frontend-response` wurde die Kette zwischen Backend-Triage, Assessment-Adapter und Result-Page stabilisiert und erweitert.

Ziele:

- das Frontend soll strukturierte Backend-/KI-Antworten erhalten
- die Versorgungsebene soll konsistent sein
- Specialist-Fälle sollen abbildbar sein
- die medizinische Zusammenfassung soll sauber und ohne leere Angaben sein

## Ausgangslage

Vor den Änderungen galt:

- das Frontend sendet Stammdaten und Symptomdetails bereits an das Backend
- die Result-Page war teilweise auf Backend-Daten vorbereitet, nutzte aber noch lokale Ersatzlogik
- die KI-Antwort fiel häufig in den Fallback
- `careLevel`, `recommendedSpecialty` und Begründung konnten sich widersprechen
- leere Stammdatenfelder wurden in der Summary unnötig angezeigt

## Hauptziele der Umsetzung

1. Assessment-Endpoint strukturiert an die bestehende Triage-Logik anbinden
2. KI-Anbindung robust machen, damit nicht permanent `aiUnavailable` zurückkommt
3. Antwortmodell so erweitern, dass Specialist-Empfehlungen und saubere Zusammenfassungen möglich sind

## Branch

Erstellt wurde der Branch:

- `backend/frontend-response`

## Assessment-Flow auf strukturierte Triage umgestellt

Betroffene Dateien:

- [backend/src/modules/assessment/assessment.service.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/assessment/assessment.service.ts)
- [backend/src/modules/assessment/assessment.types.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/assessment/assessment.types.ts)

Änderungen:

- `POST /assessments` verwendet nicht mehr eine separate Beispiel-/Sonderlogik
- `symptomDetails` aus dem Frontend werden in das Triage-Symptomformat gemappt
- intern wird `evaluateTriage(...)` genutzt
- das Ergebnis wird in ein Assessment-Ergebnis überführt, das das Frontend direkt konsumieren kann

Das Assessment-Ergebnis enthält jetzt:

- `careLevel`
- `recommendedSpecialty`
- `reasons`
- `reviewSummary`
- optional `recommendedSpecialties`
- optional `aiUnavailable`
- `summary`
- `createdAt`

## Frontend- und Assessment-Typen erweitert

Betroffene Dateien:

- [frontend/src/types/assessment.ts](/Users/christianscheider/Dev/Heptacode/frontend/src/types/assessment.ts)
- [frontend/src/types/triage.ts](/Users/christianscheider/Dev/Heptacode/frontend/src/types/triage.ts)

Änderungen:

- `AssessmentPayload.symptomDetails` nutzt korrekt `SymptomDetailPayload[]`
- `AssessmentResult` kennt jetzt `recommendedSpecialty`, `reviewSummary`, optional `recommendedSpecialties`, optional `aiUnavailable`
- `RecommendedSpecialty.specialty` nutzt direkt `MedicalSpecialty`

## State-Bug in der Result-Page behoben

Betroffene Datei:

- [frontend/src/lib/AssessmentContext.tsx](/Users/christianscheider/Dev/Heptacode/frontend/src/lib/AssessmentContext.tsx)

Problem:

- das Backend bekam korrekt `measurementValue`
- nach dem Submit wurde der technische Request-Payload zurück in den UI-State geschrieben
- die Result-Page erwartete aber `painLevel`
- Folge: lokal konnte `0/10` angezeigt werden, obwohl das Backend z. B. korrekt `7/10` verarbeitet hatte

Lösung:

- `submitAssessment(...)` nimmt jetzt `SymptomDetailPayload[]`
- der technische Submit-Payload wird nicht mehr in `symptomDetails` des UI-Contexts zurückgeschrieben

## Result-Page auf Backend-Daten ausgerichtet

Betroffene Datei:

- [frontend/src/pages/ResultPage.tsx](/Users/christianscheider/Dev/Heptacode/frontend/src/pages/ResultPage.tsx)

Umgesetzt:

- `careLevel` wird primär aus `assessmentResult.careLevel` gelesen
- `recommendedSpecialty` wird primär aus `assessmentResult.recommendedSpecialty` gelesen
- eigene Sektion „Ihre Einschätzung“ für `reviewSummary.plainLanguage`
- Begründung nutzt die echten Backend-`reasons`
- klinische Zusammenfassung nutzt `reviewSummary.professionalSummary`
- PDF-Export verwendet dieselben Backend-Daten
- Timestamps nutzen `createdAt`
- `aiUnavailable` wird sichtbar gemacht, wenn nur ein Fallback aktiv war

Hinweis:

- die Frontend-Änderungen aus `isabelle-frontend-fix` wurden nicht direkt übernommen
- das Backend wurde aber auf die dafür nötige Datenstruktur vorbereitet

## KI-Anbindung analysiert

Geprüfte Dateien:

- [backend/src/config/env.ts](/Users/christianscheider/Dev/Heptacode/backend/src/config/env.ts)
- [backend/src/ai/client.ts](/Users/christianscheider/Dev/Heptacode/backend/src/ai/client.ts)
- [backend/src/ai/llmAdapter.ts](/Users/christianscheider/Dev/Heptacode/backend/src/ai/llmAdapter.ts)
- [backend/src/ai/timeout.ts](/Users/christianscheider/Dev/Heptacode/backend/src/ai/timeout.ts)

Feststellungen:

- `AI_API_URL`, `AI_API_KEY` und `AI_MODEL` waren lokal gesetzt
- LiteLLM unter `http://141.19.141.155:4000` war erreichbar
- der API-Key funktionierte
- das Modell `medgemma:27b` war vorhanden
- Problem war nicht Netzwerk oder Auth
- der echte Triage-Prompt dauerte ca. `25.7 s`, das Backend brach aber schon nach `8 s` ab
- das Modell lieferte teils leicht abweichendes JSON, z. B. `reasons` als String statt Array und `reviewSummary: null`

## AI-Timeout erhöht

Betroffene Datei:

- [backend/src/ai/timeout.ts](/Users/christianscheider/Dev/Heptacode/backend/src/ai/timeout.ts)

Änderung:

- `AI_REQUEST_TIMEOUT_MS` von `8000` auf `30000`

Ziel:

- das Modell soll den Triage-Prompt realistisch beantworten können, bevor ein Fallback greift

## LLM-Adapter robuster gemacht

Betroffene Datei:

- [backend/src/ai/llmAdapter.ts](/Users/christianscheider/Dev/Heptacode/backend/src/ai/llmAdapter.ts)

Vorher:

- es wurde nur `aiClient.beta.chat.completions.parse(...)` genutzt

Jetzt:

- zuerst wird weiterhin `parse(...)` versucht
- wenn das fehlschlägt, wird automatisch auf `chat.completions.create(...)` mit `response_format: { type: 'json_object' }` gewechselt
- der JSON-String wird anschließend manuell geparst und mit Zod validiert

Nutzen:

- robuster gegen OpenAI-kompatible Proxy-Server wie LiteLLM

## Triage-Schema toleranter gemacht

Betroffene Datei:

- [backend/src/modules/triage/triage.types.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/triage/triage.types.ts)

Anpassungen:

- `reasons` akzeptiert String oder String-Array und normalisiert intern auf `string[]`
- `reviewSummary` darf `null` oder `undefined` sein und wird normalisiert

Ziel:

- Modellantworten scheitern nicht mehr an kleinen Formatabweichungen

## Inkonsistenz zwischen careLevel und recommendedSpecialty behoben

Betroffene Datei:

- [backend/src/modules/triage/triage.service.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/triage/triage.service.ts)

Vorher:

- `recommendedSpecialty` hat faktisch `careLevel` überschrieben
- Beispiel:
  - KI meinte inhaltlich „Selbstversorgung“
  - lieferte aber `general_practice`
  - Backend machte daraus `doctor`
  - oben stand Hausarzt, unten Selbstversorgung

Neue Logik:

- `careLevel` ist die führende Entscheidung
- `recommendedSpecialty` wird daran angepasst

Regeln:

- `emergency` -> `emergency_medicine`
- `selfcare` -> `home_care`
- `doctor` -> `general_practice`, außer es greift eine Specialist-Eskalation
- `specialist` -> Fachgebiet bleibt oder wird aus Symptomen abgeleitet

## Specialist-Zuordnung verbessert

Betroffene Datei:

- [backend/src/modules/triage/triage.service.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/triage/triage.service.ts)

Neue Funktionen:

- `inferSpecialistFromSymptoms(...)`
- `normalizeTriageResult(...)`
- `applySpecialistEscalation(...)`

Heuristiken für Fachrichtungen:

- `Psychische Probleme` -> `psychiatry`
- `Verbrennung` -> `dermatology`
- `Kopf` mit stärkerem Schmerz -> `neurology`
- `Bauch` mit stärkerem Schmerz -> `gastroenterology`
- `Rücken`, `Arme`, `Beine` -> `orthopedics`
- `Brust` -> `cardiology`, bei `Atemabhängig` eher `pulmonology`

Specialist-Eskalation:

- wenn die KI nur `doctor + general_practice` liefert, Symptomtyp, Stärke oder Dauer aber klar für ein Fachgebiet sprechen, wird auf `specialist + Fachrichtung` eskaliert

Verifiziert:

- `Kopfschmerzen 1/10, seit heute` -> `selfcare + home_care`
- `Kopfschmerzen 7/10, seit ein paar Tagen` -> `specialist + neurology`

## recommendedSpecialties für späteres Frontend vorbereitet

Die Result-Page aus `isabelle-frontend-fix` zeigte, dass später eine explizite Fachrichtungsdarstellung vorgesehen ist.

Deshalb liefert das Backend jetzt optional:

- `recommendedSpecialties`

Struktur:

- `specialty`
- `label`
- `reason`
- `priority`

## Doppelte Spezialisten-Taxonomie wieder entfernt

Auf Basis der vorhandenen Domäne wurde die zusätzliche Backend-Mapping-Schicht entfernt.

Jetzt gilt:

- `recommendedSpecialties.specialty` nutzt direkt `medicalSpecialtySchema`
- `recommendedSpecialties.specialty` ist damit direkt vom Typ `MedicalSpecialty`

Geändert in:

- [backend/src/modules/triage/triage.types.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/triage/triage.types.ts)
- [backend/src/modules/triage/triage.service.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/triage/triage.service.ts)
- [frontend/src/types/triage.ts](/Users/christianscheider/Dev/Heptacode/frontend/src/types/triage.ts)

## Leere Stammdatenfelder entfernt

Betroffene Dateien:

- [backend/src/modules/triage/triage.service.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/triage/triage.service.ts)
- [backend/src/modules/assessment/assessment.service.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/assessment/assessment.service.ts)

Umgesetzt:

- serverseitige Helper filtern optionale Stammdaten aus, wenn keine sinnvolle Angabe vorliegt
- keine Zeilen mehr für:
  - Allergien ohne Inhalt
  - Medikamente ohne Inhalt
  - Vorerkrankungen ohne Inhalt
  - `Substanzbeeinflussung: Nein`
  - nicht gesetzte Auslandsdetails
- `professionalSummary` wird zusätzlich bereinigt:
  - Zeilen mit `Keine Angabe` fliegen raus
  - Mehrfachleerzeilen werden geglättet

## Fallback-Triage für Warnmuster verschärft

Betroffene Datei:

- [backend/src/modules/triage/triage.service.ts](/Users/christianscheider/Dev/Heptacode/backend/src/modules/triage/triage.service.ts)

Neu:

- Warnmuster wie Brustschmerz, Verwirrtheit oder Suizidgedanken führen im Fallback vorsichtshalber zur Notfall-Einstufung

## Reproduzierte und behobene Fehler

1. `Brust links, 7/10, seit Tagen`

- vorher teilweise `Hausarzt` durch Fallback
- nach Verschärfung des Fallbacks vorsichtiger bewertet

2. Result-Page zeigt `0/10`, Backend aber `7/10`

- Ursache: falscher Datentyp im Context-State
- behoben

3. `Kopfschmerzen 1/10`

- oben `Hausarzt`, unten Selbstversorgung
- Ursache: `recommendedSpecialty` hat `careLevel` überstimmt
- behoben

4. Specialist-Fälle kommen kaum vor

- Ursache: zu generische `general_practice`-Antworten des Modells
- behoben durch Specialist-Eskalation

## Technische Einschränkungen

Ein vollständiger Build/Typecheck war in der Umgebung nur eingeschränkt aussagekräftig, da lokal bereits allgemeine Dependency-/Typauflösungsprobleme bestanden, u. a. bei:

- `react`
- `vite`
- `fastify`
- `zod`
- `openai`

Die betroffenen Laufzeitpfade wurden deshalb direkt gegen den lokalen Backend-Server getestet.

## Ergebniszustand

Aktuell gilt:

- Assessment nutzt zentrale Triage-Logik
- KI-Antworten kommen wieder an, statt fast immer in `aiUnavailable` zu fallen
- `careLevel` und `recommendedSpecialty` widersprechen sich nicht mehr
- Specialist-Zuordnung erfolgt jetzt deutlich verlässlicher
- `recommendedSpecialties` ist für die spätere Frontend-Darstellung vorbereitet
- leere Stammdatenfelder erscheinen nicht mehr in der professionellen Summary
- die Result-Page kann bereits sinnvoll mit den Backend-Daten arbeiten

## Sinnvolle nächste Schritte

1. Die aktuelle Result-Page gezielt auf `recommendedSpecialties` verdrahten, damit bei `careLevel === specialist` direkt z. B. `Neurologie` oder `Dermatologie` sichtbar wird
2. Den Triage-Prompt weiter schärfen, damit das Modell `specialist` und `reviewSummary` noch zuverlässiger direkt korrekt liefert
3. Falls gewünscht, eine dedizierte Backend-Logik für mehrere priorisierte Fachrichtungen ergänzen statt nur einer Empfehlung
