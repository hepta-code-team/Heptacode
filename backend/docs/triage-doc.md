## Modul `triage`

### Zuständigkeiten

`triage` ist für die medizinische Einordnung zuständig:

- formale Request-Validierung
- Unterstützung für zwei Eingangswege:
  - direkte strukturierte Symptome
  - Freitext, der intern zuerst durch `symptom-extraction` läuft
- KI-gestützte Auswahl von Versorgungsebene und Fachrichtung
- Nachkorrektur der Versorgungsebene, damit sie immer zur empfohlenen Fachrichtung passt

### Strukturierte AI-Antworten

In [backend/src/ai/llmAdapter.ts] kapselt `requestStructuredAiResponse(...)` den eigentlichen KI-Aufruf.

Die Funktion übernimmt:

- `messages`: Chat-Nachrichten für System- und User-Prompt
- `schema`: ein Zod-Schema für die erwartete Antwort
- `schemaName`: Name des Ausgabeformats
- `temperature`: optional, Standard `0.2`

Intern wird `aiClient.beta.chat.completions.parse(...)` mit `zodResponseFormat(...)` genutzt. Dadurch wird die Antwort direkt gegen ein Zod-Schema geparst. Wenn keine geparste Antwort vorliegt, wirft die Funktion einen Fehler.

Diese Kapselung hat zwei Vorteile:

- alle strukturierten KI-Antworten laufen über denselben Integrationspunkt
- die Module bekommen bereits validierte Daten zurück statt freie Textantworten


### Ziel

Das Modul `triage` bewertet Symptome im Hinblick auf die richtige Versorgungsebene und eine empfohlene medizinische Fachrichtung.

Die Triage kann zwei Arten von Eingaben verarbeiten:

- bereits strukturierte Symptome
- medizinischen Freitext

Der Freitextpfad nutzt intern das Modul `symptom-extraction`.

### HTTP-Endpunkt

Die Route befindet sich in [backend/src/routes/triage.routes.ts]

Pfad:

```text
POST /api/v1/triage/evaluate
```

Die Route validiert den Request per `triageRequestSchema` und ruft danach `evaluateTriage(...)` auf.

### Request-Schema

Das Schema steht in [backend/src/modules/triage/triage.types.ts]

Erlaubte Felder:

- `patientData?: PatientData`
- `symptoms?: TriageSymptom[]`
- `text?: string`
- `inputType?: 'text' | 'speech'`
- `emergencyFromLanding?: boolean`

Wichtige Validierungsregel:

- Es muss entweder `text` gesetzt sein oder `symptoms` müssen mindestens einen Eintrag enthalten.

`symptoms` sind zusätzlich auf maximal drei Einträge begrenzt.

### PatientData

Die Stammdaten bestehen aus:

- `birthMonth`
- `birthYear`
- `height`
- `weight`
- `gender`
- `isPregnant`
- `isBreastfeeding`
- `allergies`
- `medications`
- `substanceInfluence`
- `recentAbroad`
- `recentAbroadDetails`
- `conditions`

Die Werte werden aktuell als Strings und Booleans entgegengenommen und im Triage-Prompt als Text serialisiert. Es gibt in diesem Modul keine weitergehende semantische Validierung, etwa für realistische Größen- oder Gewichtsbereiche.

### TriageSymptom

Das Symptommodell entspricht inhaltlich der Struktur aus `symptom-extraction`:

```ts
{
  region: string
  side?: string
  painLevel?: number
  duration?: 'today' | 'days' | 'week' | 'weeks'
}
```

Damit kann `triage` die Ergebnisse der Symptom-Extraktion direkt weiterverwenden.

### Response-Schema

Die Triage liefert ein Objekt vom Typ `TriageResponse`:

- `careLevel`: `emergency | doctor | selfcare`
- `recommendedSpecialty`: medizinische Fachrichtung
- `reasons`: Liste kurzer Begründungen

Erlaubte Fachrichtungen sind durch `medicalSpecialtySchema` fest definiert, unter anderem:

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

Die Kernlogik steht in [backend/src/modules/triage/triage.service.ts]

#### 1. Notfall-Bypass über `emergencyFromLanding`

Wenn `emergencyFromLanding` gesetzt ist, gibt das Modul sofort eine feste Notfallantwort zurück:

- `careLevel: 'emergency'`
- `recommendedSpecialty: 'emergency_medicine'`
- `reasons: ['Notfallmodus ueber die Startseite ausgewaehlt.']`

In diesem Pfad wird keine KI aufgerufen.

#### 2. Freitextpfad

Wenn `text` gesetzt ist, läuft die Triage nicht direkt auf dem Rohtext, sondern zuerst über:

```ts
extractSymptoms(text, inputType)
```

Das ist eine zentrale Designentscheidung:

- nur eine Stelle im Backend transformiert Freitext in strukturierte Symptome
- die eigentliche Triage arbeitet bevorzugt mit einer standardisierten Symptomstruktur

Wenn die Symptom-Extraktion `invalidInput` zurückliefert, verwandelt `triage` das Ergebnis in einen HTTP-`400`-Fehler. Das geschieht über `createBadRequestError(...)`.

Wichtig ist der Unterschied zum direkten `symptom-extraction`-Endpunkt:

- `symptom-extraction` liefert bei ungültigem medizinischem Freitext eine reguläre Fachantwort
- `triage` behandelt denselben Fall als ungültige Anfrage

Diese Entscheidung ist konsistent mit der Aufgabe des Endpunkts: Triage soll nur auf verwertbaren Beschwerdeangaben arbeiten.

#### 3. Pfad mit strukturierten Symptomen

Wenn kein `text` vorhanden ist, nutzt der Service `symptoms ?? []`.

Wenn die Symptomliste leer ist, gibt der Service ohne KI-Aufruf sofort zurück:

- `careLevel: 'selfcare'`
- `recommendedSpecialty: 'home_care'`
- `reasons: []`

Auch das ist ein bewusst gesetzter Short-Circuit.

#### 4. KI-Triage

Sobald verwertbare Symptome vorliegen, ruft das Modul `requestTriageFromAi(...)` auf.

Dazu werden die Daten zunächst textuell formatiert:

- `formatPatientData(...)`
- `formatSymptoms(...)`

`formatSymptoms(...)` setzt die Dauerwerte in lesbare deutsche Labels um:

- `today` -> `Seit heute`
- `days` -> `Seit ein paar Tagen`
- `week` -> `Seit einer Woche`
- `weeks` -> `Seit mehr als 2 Wochen`

Der Prompt fordert die KI unter anderem dazu auf:

- genau eine Versorgungsebene zuzuordnen
- genau eine erlaubte Fachrichtung zu wählen
- sicherheitsorientiert zu handeln
- keine zusätzlichen Symptome oder Stammdaten zu erfinden
- kurze deutsche Begründungen zu liefern

Die KI-Antwort muss `triageAiResultSchema` entsprechen:

```ts
{
  careLevel: 'emergency' | 'doctor' | 'selfcare'
  recommendedSpecialty: MedicalSpecialty
  reasons: string[]
}
```

### Nachkorrektur der Versorgungsebene

Die KI darf zwar `careLevel` liefern, das Ergebnis wird aber anschließend mit `ensureConsistentCareLevel(...)` normalisiert.

Die eigentliche Logik dafür steckt in `toCareLevel(...)`:

- `emergency_medicine` -> `emergency`
- `home_care` -> `selfcare`
- alles andere -> `doctor`

Das ist ein wichtiger Schutzmechanismus gegen widersprüchliche KI-Antworten, etwa:

- `recommendedSpecialty: emergency_medicine`
- `careLevel: doctor`

Nach der Nachkorrektur ist dieser Widerspruch ausgeschlossen.

### Fehlerverhalten

Mögliche Fehlerfälle:

- formale Request-Validierung schlägt fehl: HTTP `400`
- Freitext ist fachlich unbrauchbar: HTTP `400`
- KI-Backend nicht erreichbar oder falsch konfiguriert: HTTP `500`
- KI liefert keine parsebare strukturierte Antwort: HTTP `500`

## Zusammenspiel mit symptom-extraction

Die Module sind bewusst kaskadiert:

1. Freitext wird zuerst in eine stabile Symptomstruktur überführt.
2. Die Triage bewertet bevorzugt diese strukturierte Form.

Das reduziert Varianz in der Triage, weil das Modell nicht gleichzeitig:

- Rohtext interpretieren
- Symptome extrahieren
- Versorgung ableiten

muss.

Stattdessen werden diese Aufgaben getrennt:

- `symptom-extraction` reduziert Freitext auf ein kleines, kontrolliertes Schema
- `triage` trifft darauf aufbauend die Versorgungsentscheidung

## API-Beispiele

### Beispiel 1: Direkte Symptom-Extraktion

Request:

```json
{
  "text": "Ich habe seit ein paar Tagen starke Kopfschmerzen, etwa 7 von 10, und leichte Übelkeit.",
  "inputType": "text"
}
```

Mögliche Antwort:

```json
{
  "text": "Ich habe seit ein paar Tagen starke Kopfschmerzen, etwa 7 von 10, und leichte Übelkeit.",
  "inputType": "text",
  "symptoms": [
    {
      "region": "Kopf",
      "painLevel": 7,
      "duration": "days"
    },
    {
      "region": "Allgemein",
      "side": "Übelkeit/Schwindel"
    }
  ]
}
```

### Beispiel 2: Triage mit strukturierter Symptomliste

Request:

```json
{
  "patientData": {
    "birthMonth": "05",
    "birthYear": "1988",
    "height": "175",
    "weight": "78",
    "gender": "männlich",
    "isPregnant": false,
    "isBreastfeeding": false,
    "allergies": "",
    "medications": "",
    "substanceInfluence": "Nein",
    "recentAbroad": false,
    "recentAbroadDetails": "",
    "conditions": []
  },
  "symptoms": [
    {
      "region": "Kopf",
      "painLevel": 7,
      "duration": "days"
    },
    {
      "region": "Allgemein",
      "side": "Übelkeit/Schwindel"
    }
  ]
}
```

Mögliche Antwort:

```json
{
  "careLevel": "doctor",
  "recommendedSpecialty": "neurology",
  "reasons": [
    "Die Beschwerden sollten zeitnah ärztlich abgeklärt werden."
  ]
}
```

### Beispiel 3: Triage mit Freitext

Request:

```json
{
  "patientData": {
    "birthMonth": "05",
    "birthYear": "1988",
    "height": "175",
    "weight": "78",
    "gender": "männlich",
    "isPregnant": false,
    "isBreastfeeding": false,
    "allergies": "",
    "medications": "",
    "substanceInfluence": "Nein",
    "recentAbroad": false,
    "recentAbroadDetails": "",
    "conditions": []
  },
  "text": "Ich habe seit ein paar Tagen starke Kopfschmerzen, etwa 7 von 10, und leichte Übelkeit."
}
```

Interner Ablauf:

- `triage` ruft `extractSymptoms(...)` auf
- das Ergebnis wird an `requestTriageFromAi(...)` übergeben
- das Ergebnis wird per `ensureConsistentCareLevel(...)` nachkorrigiert

## Betrieb, Debugging und Grenzen

### Anforderungen an das Modell

Das Modell muss OpenAI-kompatible strukturierte Antworten liefern, die mit `beta.chat.completions.parse(...)` und `zodResponseFormat(...)` funktionieren.

Praktisch bedeutet das:

- das Modell oder Gateway muss JSON-Ausgaben zuverlässig erzeugen
- die Antwort muss das jeweilige Zod-Schema erfüllen
- ungeeignete Modelle führen eher zu Parse-Fehlern oder inkonsistenten Fachantworten

### Was die Module nicht tun

Die Module leisten derzeit nicht:

- persistente Speicherung von Requests oder Ergebnissen
- Authentifizierung oder Autorisierung
- medizinische Enddiagnostik
- Rückgabe freier, beliebig detaillierter Symptomstrukturen
- tiefe Plausibilitätsprüfung der Stammdaten

### Debugging-Hinweise

Bei Problemen helfen diese Prüfpunkte:

- Läuft `/health`?
- Sind `AI_API_URL`, `AI_API_KEY` und `AI_MODEL` korrekt gesetzt?
- Ist das AI-Backend OpenAI-kompatibel erreichbar?
- Liefert das Modell strukturierte Antworten, die zum Zod-Schema passen?
- Tritt der Fehler schon in der Heuristik auf, erst in der KI-Validierung oder erst in der eigentlichen Triage?

### Erweiterungspunkte

Sinnvolle Erweiterungen wären:

- zusätzliche automatisierte Tests für Heuristik und Invalid-Input-Pfade
- verbesserte Prompt-Templates
- Logging oder Tracing rund um KI-Requests und Parse-Fehler
- explizite Metriken für Invalid-Input-Raten, KI-Latenz und Fehlerraten

## Fazit

`symptom-extraction` und `triage` bilden zusammen eine klar getrennte Pipeline:

- Freitext wird zuerst validiert und in eine kontrollierte Symptomstruktur überführt.
- Die Triage trifft auf Basis dieser Struktur eine Versorgungsempfehlung.
- Technische Integrität wird durch Zod-Schemas und strukturierte KI-Antworten abgesichert.
- Fachliche Konsistenz wird zusätzlich durch Heuristiken, feste Taxonomien und eine Nachkorrektur des `careLevel` geschützt.

Für Weiterentwicklungen ist besonders wichtig, diese Trennung beizubehalten. Sobald Triage und Freitextinterpretation wieder vermischt werden, steigen Varianz, Debugging-Aufwand und das Risiko inkonsistenter Antworten deutlich.