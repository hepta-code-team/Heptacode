## Modul `triage`

### Zuständigkeiten

`triage` ist fuer die medizinische Einordnung strukturierter Beschwerden zustaendig.

Das Modul uebernimmt:

- formale Request-Validierung
- Plausibilitaetspruefung gegen Stammdaten
- Unterstuetzung fuer strukturierte Symptome
- Unterstuetzung fuer Freitext, der intern zuerst durch `symptom-extraction` laeuft
- Notfall-Bypass ueber `emergencyFromLanding`
- KI-gestuetzte Auswahl der Versorgungsebene
- optionale KI-gestuetzte Auswahl einer Fachrichtung bei `specialist`
- Plausibilitaetspruefung der KI-Antwort
- lokale Fallback-Triage bei KI-Verfuegbarkeitsproblemen oder verworfenen KI-Antworten

### Strukturierte AI-Antworten

In [backend/src/ai/llmAdapter.ts] kapseln `requestStructuredAiResponse(...)` und `requestStructuredAiResponseWithModel(...)` den eigentlichen KI-Aufruf.

Die Triage nutzt `requestStructuredAiResponseWithModel(...)`, weil das verwendete Modell im Ergebnis als `aiModel` transparent gemacht werden kann.

Der Adapter:

- versucht strukturierte OpenAI-Antworten mit `zodResponseFormat(...)`
- faellt bei nicht-verfuegbarkeitsbezogenen Parse-Problemen auf JSON-Modus plus lokale Zod-Validierung zurueck
- nutzt bei Verfuegbarkeitsfehlern ein konfiguriertes Fallback-Modell, sofern vorhanden
- wirft einen Fehler, wenn keine valide strukturierte Antwort entsteht

### Ziel

Das Modul bewertet Beschwerden im Hinblick auf eine Versorgungsebene:

- `selfcare`
- `doctor`
- `specialist`
- `emergency`

Eine konkrete fachaerztliche `recommendedSpecialty` wird nur bei `specialist` gefuehrt. `emergency_medicine`, `general_practice` und `home_care` sind System-Zielwerte fuer Notfall-, Hausarzt- oder Selbstversorgungsfaelle und koennen in normalisierten oder lokalen Antworten weiterhin gesetzt werden.

### HTTP-Endpunkt

Die Route befindet sich in [backend/src/routes/triage.routes.ts].

Pfad:

```text
POST /api/v1/triage/evaluate
```

Die Route validiert den Request per `triageRequestSchema` und ruft danach `evaluateTriage(...)` auf.

### Request-Schema

Das Schema steht in [backend/src/modules/triage/triage.types.ts].

Erlaubte Felder:

- `patientData?: PatientData`
- `symptoms?: TriageSymptom[]`
- `text?: string`
- `inputType?: 'text' | 'speech'`
- `emergencyFromLanding?: boolean`

Mindestens eine dieser Bedingungen muss erfuellt sein:

- `text` ist gesetzt
- `symptoms` enthaelt mindestens einen Eintrag
- `emergencyFromLanding` ist `true`

`symptoms` sind auf maximal drei Eintraege begrenzt.

### PatientData

Die Stammdaten bestehen aktuell aus:

- `birthMonth`
- `birthYear`
- `height`
- `weight`
- `gender`
- `isPregnant`
- `isBreastfeeding`
- `allergies`
- `medications`
- `medicationDuration`
- `substanceInfluence`
- `recentAbroad`
- `recentAbroadDetails`
- `conditions`
- `isSmoker`
- `smokingSinceYears`
- `cigarettesPerDay`
- `conditionDetails`

Die meisten Werte werden als Strings und Booleans entgegengenommen und fuer den Prompt textuell serialisiert.

Es gibt eine gezielte Plausibilitaetspruefung: Bei maennlichem Geschlecht werden Schwangerschaft, Wehen oder Schwangerschaftsstatus als logischer Widerspruch abgelehnt. Weitere semantische Wertebereiche wie realistische Groesse oder realistisches Gewicht werden in diesem Modul nicht geprueft.

### TriageSymptom

Das Symptommodell kommt aus dem gemeinsamen Typ `TriageSymptom`:

```ts
{
  region: string
  side?: string
  details?: string
  measurementType?: 'pain' | 'temperature' | 'feeling' | 'severity'
  measurementValue?: number
  duration?: 'today' | 'days' | 'week' | 'weeks'
}
```

`painLevel` ist veraltet. Intensitaet und Messwerte werden ueber `measurementType` und `measurementValue` uebergeben.

### Response-Schema

Die Triage liefert `TriageResponse`:

- `careLevel`: `selfcare | doctor | specialist | emergency`
- `recommendedSpecialty?`: fachaerztliche Disziplin oder System-Zielwert wie `emergency_medicine`, `general_practice` oder `home_care`
- `recommendedSpecialties?`: Liste priorisierter Fachrichtungen, aktuell im Service nicht aktiv befuellt
- `reasons`: kurze deutsche Begruendungen
- `reviewSummary?`: Zusammenfassung fuer Patientensprache und fachlichere Darstellung
- `aiUnavailable?`: Kennzeichnung fuer lokale Fallbacks bei KI-Ausfall oder verworfener KI-Antwort
- `aiModel?`: Modellname der erfolgreichen KI-Antwort

`reviewSummary` hat die Form:

```ts
{
  plainLanguage: string
  professionalSummary: string
}
```

Erlaubte Fachrichtungen sind durch `medicalSpecialtySchema` fest definiert:

- `home_care`
- `emergency_medicine`
- `general_practice`
- `internal_medicine`
- `cardiology`
- `neurology`
- `orthopedics`
- `gastroenterology`
- `pulmonology`
- `dermatology`
- `urology`
- `gynecology`
- `psychiatry`
- `pediatrics`
- `dentistry`
- `ophthalmology`
- `otolaryngology`

### Ablauf im Service

Die Kernlogik steht in [backend/src/modules/triage/triage.service.ts].

#### 1. Plausibilitaetspruefung

`assertPatientDataIsPlausible(...)` prueft vor allen Pfaden die Stammdaten gegen Freitext oder strukturierte Symptome.

Aktuell wird insbesondere verhindert, dass bei maennlichem Geschlecht Schwangerschaft, Wehen oder Schwangerschaftsstatus verarbeitet werden. Ein Widerspruch fuehrt zu HTTP `400`.

#### 2. Notfall-Bypass ueber `emergencyFromLanding`

Wenn `emergencyFromLanding` gesetzt ist, gibt das Modul sofort eine feste Notfallantwort zurueck:

- `careLevel: 'emergency'`
- `recommendedSpecialty: 'emergency_medicine'`
- `reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.']`
- `reviewSummary` mit laienverstaendlicher und fachlicher Kurzfassung

In diesem Pfad wird keine KI aufgerufen.

#### 3. Freitextpfad

Wenn `text` gesetzt ist, laeuft die Triage nicht direkt auf dem Rohtext. Stattdessen ruft sie zuerst:

```ts
extractSymptoms(text, inputType)
```

Wenn die Symptom-Extraktion `invalidInput` zurueckliefert, verwandelt `triage` das Ergebnis in einen HTTP-`400`-Fehler.

Wichtig ist der Unterschied zum direkten `symptom-extraction`-Endpunkt:

- `symptom-extraction` liefert bei ungueltigem medizinischem Freitext eine regulaere Fachantwort
- `triage` behandelt denselben Fall als ungueltige Anfrage

Wenn die Freitext-Extraktion wegen KI-Verfuegbarkeit keine Symptome liefern kann, gibt `triage` einen kontrollierten Fallback zurueck:

- `careLevel: 'doctor'`
- `recommendedSpecialty: 'general_practice'`
- `aiUnavailable: true`
- Hinweis, Symptome manuell auszuwaehlen oder Beschwerden aerztlich einschaetzen zu lassen

#### 4. Pfad mit strukturierten Symptomen

Wenn kein `text` vorhanden ist, nutzt der Service `symptoms ?? []`.

Wenn die Symptomliste leer ist, gibt der Service ohne KI-Aufruf zurueck:

- `careLevel: 'selfcare'`
- `recommendedSpecialty: 'home_care'`
- `reasons: []`
- `reviewSummary` mit Hinweis auf fehlende konkrete Beschwerden

#### 5. KI-Triage

Sobald verwertbare Symptome vorliegen, ruft das Modul `requestTriageFromAiWithDiagnostics(...)` auf.

Dazu werden die Daten in mehrere Prompt-Abschnitte formatiert:

- aktuelles lokales Datum
- Stammdaten
- Medikationskontext
- medizinischer Risikokontext
- nummerierte Symptomliste

`formatSymptoms(...)` beruecksichtigt:

- `region` und optionale `side`
- `details`
- `measurementType` und `measurementValue`
- `duration`

Dauerwerte werden deutsch gelabelt:

- `today` -> `Seit heute`
- `days` -> `Seit ein paar Tagen`
- `week` -> `Seit einer Woche`
- `weeks` -> `Seit mehr als 2 Wochen`

Messwerte werden je nach Messart formatiert:

- `temperature` als Temperatur in Grad Celsius
- `pain`, `feeling` und `severity` als normalisierte Skala `/10`

Der Prompt fordert die KI unter anderem dazu auf:

- genau eine Versorgungsebene zu waehlen
- `recommendedSpecialty` nur bei `specialist` zu setzen
- direkte fachaerztliche Abklaerung gegen Allgemeinmedizin abzuwägen
- Medikationskontext aktiv zu pruefen
- Allergien, Substanzeinfluss, Auslandsaufenthalte und Vorerkrankungen zu beruecksichtigen
- keine Dosierungen, Wechselwirkungen, Nebenwirkungen, Symptome oder Stammdaten zu erfinden
- keine technischen Feldnamen in `reasons` zu verwenden
- `reviewSummary` auf Deutsch zu liefern

### Validierung und Normalisierung der KI-Antwort

Die KI-Antwort muss `triageAiResponseSchema` aus [backend/src/shared/validation.ts] entsprechen:

```ts
{
  careLevel: 'selfcare' | 'doctor' | 'specialist' | 'emergency'
  recommendedSpecialty?: MedicalSpecialty
  reasons: string[] | string
  reviewSummary: {
    plainLanguage: string
    professionalSummary: string
  }
}
```

Die Schema-Transformation normalisiert:

- `reasons` kann als String oder Liste kommen und wird als Liste ausgegeben
- bei `emergency` wird `recommendedSpecialty` auf `emergency_medicine` gesetzt
- bei `specialist` ist eine fachaerztliche `recommendedSpecialty` Pflicht
- bei nicht-`specialist` wird eine fachaerztliche Empfehlung in `careLevel: 'specialist'` umgewandelt
- bei `doctor` und `selfcare` wird `recommendedSpecialty` entfernt

Zusätzlich werden technische Begriffe in `reasons` durch nutzerverstaendlichere Begriffe ersetzt.

### Plausibilitaetsfilter fuer KI-Antworten

Nach der Schema-Validierung prueft `getTriageAiPlausibilityIssues(...)`, ob die KI-Antwort medizinisch oder strukturell widerspruechlich wirkt.

Der Filter betrachtet unter anderem:

- starke Messwerte
- Fieberwerte
- Warnmuster in Symptomen und Details
- genannte Fachrichtungen in Gruenden oder Zusammenfassungen
- Plausibilitaet zwischen `careLevel`, Fachrichtung und Antworttext

Wenn Issues gefunden werden, wird die KI-Antwort verworfen und eine lokale Plausibilitaets-Fallback-Triage erzeugt. Die Antwort enthaelt dann:

- `aiUnavailable: true`
- eine Begruendung, dass die KI-Antwort die Plausibilitaetspruefung nicht bestanden hat
- die gefundenen Plausibilitaets-Issues
- eine konservative lokale Versorgungsempfehlung

### Lokale Fallback-Triage

Bei bekannten KI-Verfuegbarkeitsfehlern nutzt `requestTriageWithFallback(...)` eine deterministische lokale Einstufung.

Die Fallback-Logik:

- konvertiert Fieberwerte in eine vergleichbare Schweregradskala
- wertet hohe Messwerte ab `8` als Notfall
- wertet erkannte Warnmuster als Notfall
- empfiehlt bei vorhandenen, aber nicht notfallartigen Symptomen `doctor` mit `general_practice`
- empfiehlt bei leerer Symptomliste `selfcare` mit `home_care`

Fallback-Antworten tragen `aiUnavailable: true`.

### Diagnostikpfad fuer Tests und Live-Evaluation

`evaluateTriageWithDiagnostics(...)` gibt neben der finalen Antwort auch Diagnosedaten zurueck:

- urspruengliche KI-Antwort, falls vorhanden
- finale Antwort nach Plausibilitaetsfilter
- Plausibilitaets-Issues
- Fallback-Typ: `none`, `plausibility` oder `availability`

Dieser Pfad wird fuer Live- und Plausibilitaetstests genutzt.

### Fehlerverhalten

Mögliche Fehlerfälle:

- formale Request-Validierung schlaegt fehl: HTTP `400`
- Plausibilitaetswiderspruch in Stammdaten und Beschwerden: HTTP `400`
- ungueltiger Freitext im Triage-Pfad: HTTP `400`
- unbekannte Service- oder Programmierfehler: HTTP `500`

Bekannte KI-Verfuegbarkeitsprobleme werden nicht als technischer Fehler an den Client durchgereicht. Sie erzeugen kontrollierte Antworten mit `aiUnavailable: true`.
