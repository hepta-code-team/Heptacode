## KI-Nutzung im Backend

### Ziel

Das Backend nutzt KI nicht als freie Blackbox, sondern als strukturierte Hilfskomponente fuer medizinische Ersteinschaetzung.

Die KI wird aktuell eingesetzt fuer:

- Validierung medizinischer Freitexte
- Extraktion strukturierter Symptome aus Freitext oder Spracheingabe
- Validierung einzelner Detailangaben
- Konsistenzpruefung zwischen ausgewaehlter Symptomregion und Details
- Triage strukturierter Symptome

Die finale API-Antwort entsteht nicht ungeprueft aus Modelltext. KI-Antworten werden ueber Zod-Schemas validiert, normalisiert und je nach Modul durch Heuristiken, Plausibilitaetspruefungen oder lokale Fallbacks abgesichert.

### Zentrale KI-Anbindung

Die technische Integration liegt in:

- [backend/src/ai/client.ts]
- [backend/src/ai/llmAdapter.ts]
- [backend/src/ai/timeout.ts]

`client.ts` erstellt einen OpenAI-kompatiblen Client:

- `AI_API_URL` ist verpflichtend und muss `http` oder `https` verwenden
- `AI_API_KEY` ist optional und faellt auf `dummy` zurueck
- `AI_MODEL` faellt auf `medgemma:27b` zurueck
- `FALLBACK_MODEL` faellt auf `medgemma:4b` zurueck

Die Umgebung wird aus `.env.local` und `.env` gelesen. Dabei werden Dateien im aktuellen Arbeitsverzeichnis und eine Ebene darueber beruecksichtigt.

### Strukturierte Antworten

Alle produktiven KI-Aufrufe laufen ueber `requestStructuredAiResponse(...)` oder `requestStructuredAiResponseWithModel(...)`.

Der Adapter erwartet immer:

- `messages`: System- und User-Prompt
- `schema`: Zod-Schema der erwarteten Antwort
- `schemaName`: Name des strukturierten Ausgabeformats
- `temperature`: optional, Standard `0.2`
- `modelStrategy`: optional, `primary-with-fallback` oder `fallback-only`

Der Ablauf pro Modell:

1. Der Adapter versucht `aiClient.beta.chat.completions.parse(...)` mit `zodResponseFormat(...)`.
2. Wenn strukturierter Parse aus einem nicht-verfuegbarkeitsbezogenen Grund scheitert, versucht der Adapter JSON-Modus.
3. Im JSON-Modus wird eine zusaetzliche System-Anweisung angehaengt: `Antworte ausschliesslich mit validem JSON.`
4. Der JSON-Text wird geparst und lokal gegen das gleiche Zod-Schema validiert.
5. Wenn keine valide strukturierte Antwort entsteht, wird `AiResponseError` geworfen.

Damit bekommen die aufrufenden Module typisierte Daten statt freier Textantworten.

### Modellstrategien

Es gibt zwei Strategien:

#### `primary-with-fallback`

Das ist der Standard.

Der Adapter versucht zuerst `AI_MODEL` mit dem Primary-Timeout. Wenn ein klassifizierter KI-Request-Fehler entsteht und `FALLBACK_MODEL` anders ist als `AI_MODEL`, wird das Fallback-Modell versucht.

Dieser Modus wird fuer die eigentliche Triage verwendet, weil dort das verwendete Modell im Ergebnis als `aiModel` sichtbar sein kann.

#### `fallback-only`

Dieser Modus ueberspringt das Primary-Modell und nutzt direkt `FALLBACK_MODEL`.

Er wird fuer kuerzere Validierungs- und Extraktionsaufgaben in `symptom-extraction` verwendet:

- allgemeine Freitextvalidierung
- Detailvalidierung
- Konsistenzpruefung
- Symptomextraktion

### Timeouts und Retries

Die Timeouts stehen in [backend/src/ai/timeout.ts]:

- Primary-Modell: `40_000 ms`
- Fallback-Modell: `22_000 ms`

SDK-Retries sind deaktiviert:

```ts
{
  timeout,
  maxRetries: 0
}
```

Das ist bewusst so gehalten, damit nicht SDK-Retries und eigene Fallback-Logik gleichzeitig laufen. Die Backend-Services sollen schnell entscheiden koennen, ob sie eine kontrollierte Fallback-Antwort liefern.

### Fehlerklassen

`AiResponseError` beschreibt KI-Antworten, die technisch erreichbar waren, aber keinen verwertbaren strukturierten Inhalt geliefert haben.

`isAiRequestError(...)` klassifiziert Fehler, die Services kontrolliert behandeln duerfen:

- `AiResponseError`
- OpenAI `APIError`
- `APIConnectionError`
- `APIConnectionTimeoutError`

Normale Programmierfehler wie ein generischer `Error('boom')` werden nicht als KI-Request-Fehler behandelt und nicht hinter medizinischen Fallbacks versteckt.

`isAiAvailabilityError(...)` ist enger gefasst und steuert den Modell-Fallback:

- Verbindungsfehler
- Timeouts
- HTTP `429`
- HTTP `5xx`

### Eingesetzte KI-Pfade

#### Symptom-Extraction

Die Datei [backend/src/modules/symptom-extraction/symptomExtraction.service.ts] nutzt KI fuer vier Aufgaben.

`requestInputValidationFromAi(...)`

- prueft, ob Freitext medizinisch sinnvoll ist
- nutzt `symptomInputValidationAiResultSchema`
- verwendet `modelStrategy: 'fallback-only'`

`requestDetailValidationFromAi(...)`

- prueft einzelne Angaben von der Detailseite
- ist fachlich toleranter als die allgemeine Freitextvalidierung
- nutzt ebenfalls `symptomInputValidationAiResultSchema`
- verwendet `modelStrategy: 'fallback-only'`

`requestSymptomConsistencyFromAi(...)`

- extrahiert Koerperbereich-IDs aus Region und Details
- der Service entscheidet danach deterministisch, ob ein klarer Widerspruch vorliegt
- nutzt `symptomConsistencyAiResultSchema`
- verwendet `modelStrategy: 'fallback-only'`

`requestSymptomsFromAi(...)`

- extrahiert bis zu drei strukturierte Symptome
- nutzt `symptomExtractionAiResultSchema`
- verwendet `modelStrategy: 'fallback-only'`

Vor KI-Aufrufen laufen lokale Plausibilitaets- und Heuristikpruefungen. Offensichtlich unbrauchbare Eingaben werden ohne KI abgelehnt.

#### Triage

Die Datei [backend/src/modules/triage/triage.service.ts] nutzt KI fuer die medizinische Versorgungseinstufung.

`requestTriageFromAiWithDiagnostics(...)`:

- sendet Stammdaten, Medikationskontext, medizinischen Risikokontext und Symptome an das Modell
- nutzt `triageAiResponseSchema`
- speichert das erfolgreiche Modell in `aiModel`
- normalisiert technische Begriffe in `reasons`
- prueft die Antwort anschliessend mit `getTriageAiPlausibilityIssues(...)`

Die KI-Antwort muss enthalten:

- `careLevel`
- `recommendedSpecialty?`
- `reasons`
- `reviewSummary.plainLanguage`
- `reviewSummary.professionalSummary`

Wenn die Antwort formal gueltig, aber plausibilitaetskritisch ist, wird sie verworfen und durch eine lokale Fallback-Triage ersetzt.

#### Assessment

Die Datei [backend/src/modules/assessment/assessment.service.ts] ruft selbst keinen KI-Adapter auf. Sie nutzt `evaluateTriage(...)` und uebernimmt daraus:

- `careLevel`
- `recommendedSpecialty`
- `reasons`
- `reviewSummary`
- `recommendedSpecialties`
- `aiUnavailable`
- `aiModel`

Assessment ist damit Praesentations- und Aggregationsschicht. Die eigentliche KI-Entscheidung liegt in Triage und Symptom-Extraction.

### Prompts

Die Prompts liegen unter [backend/src/modules/prompt].

Wichtige Prompt-Dateien:

- [backend/src/modules/prompt/symptomExtraction.prompt.ts]
- [backend/src/modules/prompt/triage.prompt.ts]

Die Prompts sind fachlich stark eingegrenzt:

- erlaubte Ausgabeformen sind durch Schemas festgelegt
- Symptomextraktion soll maximal drei Beschwerden liefern
- Triage darf keine Symptome, Stammdaten, Dosierungen oder Wechselwirkungen erfinden
- Medikationskontext und Risikokontext muessen aktiv geprueft werden
- `reasons` und `reviewSummary` muessen deutsch und nutzerverstaendlich sein

### Validierung und Normalisierung

Die wichtigsten Antwortschemas sind:

- `symptomInputValidationAiResultSchema`
- `symptomConsistencyAiResultSchema`
- `symptomExtractionAiResultSchema`
- `triageAiResponseSchema`

Neben reiner Typpruefung normalisieren die Schemas auch Inhalte.

Beispiele:

- `reasons` in der Triage duerfen als String oder Liste kommen und werden als Liste ausgegeben
- fachaerztliche Empfehlungen in Triage-Antworten koennen `careLevel: 'specialist'` erzwingen
- lokalisierte Messwerte wie `38,5 °C` werden numerisch extrahiert
- optionale leere Felder werden entfernt
- bekannte Symptomoptionen werden auf kanonische Region/Side-Paare gemappt

### Lokale Sicherheitsmechanismen

Die KI ist nicht die einzige Entscheidungsinstanz.

Vor und nach KI-Aufrufen greifen lokale Regeln:

- Plausibilitaetspruefung gegen Patientendaten
- heuristische Invalid-Input-Erkennung
- deterministische Koerperbereichserkennung fuer Konsistenzpruefung
- Triage-Plausibilitaetsfilter
- lokale Fallback-Triage bei Ausfall oder verworfener KI-Antwort
- technische Bereinigung von KI-Begruendungen

Ein Beispiel: Wenn die KI in `reasons` technische Feldnamen wie `careLevel` oder `recommendedSpecialty` verwendet, ersetzt `removeTechnicalReasonTerms(...)` diese Begriffe durch nutzerverstaendlichere deutsche Begriffe.

### Fallback-Verhalten

KI-Ausfaelle werden je nach Modul unterschiedlich behandelt.

#### Symptom-Extraction

Bei fachlich ungueltigem Input:

- regulaere Antwort
- `invalidInput: true`
- `symptoms: []`

Bei KI-Verfuegbarkeitsproblemen:

- regulaere Antwort
- `aiUnavailable: true`
- `symptoms: []`
- Benutzerhinweis zum erneuten Versuch oder zur manuellen Symptomauswahl

Bei Ausfall der allgemeinen Freitextvalidierung versucht `extractSymptoms(...)` trotzdem die Extraktion. Ein transienter Validierungsausfall blockiert den Flow also nicht automatisch.

#### Triage

Bei KI-Verfuegbarkeitsproblemen nutzt die Triage lokale Regeln:

- starke Messwerte ab `8` fuehren zum Notfall-Fallback
- Warnmuster fuehren zum Notfall-Fallback
- vorhandene, nicht notfallartige Symptome fuehren zu `doctor` und `general_practice`
- leere Symptomlisten fuehren zu `selfcare` und `home_care`

Wenn Freitext-Extraktion im Triage-Pfad nicht verfuegbar ist, empfiehlt der Service kontrolliert aerztliche Abklaerung und manuelle Symptomauswahl.

Fallback-Antworten setzen `aiUnavailable: true`.

### Logging

Jeder KI-Aufruf wird in `runLoggedAiCall(...)` protokolliert.

Geloggte Metadaten:

- Modell
- Schema-Name
- Modus: `structured` oder `json`
- Timeout
- Dauer in Millisekunden
- Fehlername, Fehlermeldung und HTTP-Status bei Fehlschlag

Der Prompt-Inhalt selbst wird dort nicht geloggt.

### Tests

Die zentrale KI-Anbindung ist durch Unit-Tests abgesichert:

- [backend/tests/unit/ai/llmAdapter.test.ts]
- [backend/tests/unit/ai/timeout.test.ts]

Abgedeckt sind unter anderem:

- strukturierte Parse-Antworten
- Default-Temperatur
- `fallback-only`
- JSON-Fallback nach Parse-Fehlern
- invalider JSON-Output
- Schema-Verletzungen
- Primary-zu-Fallback-Modellwechsel
- Timeout-Konfiguration ohne SDK-Retries

Die Modul- und Routen-Tests mocken die KI-Adapter und pruefen, wie Symptom-Extraction, Triage und Assessment mit Erfolgen, Invalid-Input und KI-Ausfaellen umgehen.

### Grenzen

Die KI-Nutzung liefert keine medizinische Enddiagnose.

Wichtige Grenzen:

- keine persistente Speicherung von KI-Anfragen oder Ergebnissen im KI-Layer
- keine vollstaendige medizinische Plausibilitaetspruefung aller Patientendaten
- keine Garantie, dass das Modell fachlich immer korrekt priorisiert
- keine eigenstaendige Empfehlung zum Absetzen oder Aendern von Medikamenten
- keine freie, beliebig detaillierte Diagnostik-Antwort

Deshalb bleiben strukturierte Schemas, lokale Fallbacks, Plausibilitaetsfilter und klare API-Vertraege zentrale Bestandteile der Architektur.
