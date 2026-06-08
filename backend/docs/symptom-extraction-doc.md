## Modul `symptom-extraction`

### Zuständigkeiten

`symptom-extraction` ist für die strukturierte Aufbereitung von Eingaben zuständig:

- formale Request-Validierung
- heuristische Vorprüfung auf offensichtlichen Unsinn
- KI-gestützte Prüfung, ob überhaupt medizinisch sinnvoller Inhalt vorliegt
- KI-gestützte Extraktion von bis zu drei frontend-kompatiblen Symptomen

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

Das Modul übersetzt deutschen medizinischen Freitext in eine kleine, stabile und frontend-kompatible Symptomliste.

Die Ausgabe ist absichtlich eng begrenzt:

- maximal drei Symptome
- nur bekannte Regionen und Unteroptionen
- optionale Schmerzstärke als ganzzahliger Wert von `1` bis `10`
- optionale Dauer als eine von `today`, `days`, `week`, `weeks`

### HTTP-Endpunkt

Die Route befindet sich in [backend/src/routes/symptomExtraction.routes.ts]

Pfad:

```text
POST /api/v1/symptoms/extraction
```

Die Route validiert den Request-Body per `symptomExtractionRequestSchema` und ruft anschließend `extractSymptoms(...)` auf.

### Request-Schema

Das Schema steht in [backend/src/modules/symptom-extraction/symptomExtraction.types.ts]

Erlaubte Felder:

- `text?: string`
- `input?: string`
- `inputType?: 'text' | 'speech'`

Besonderheiten:

- `text` und `input` sind alternativ nutzbar.
- Mindestens eines von beiden muss befüllt sein.
- Der Route-Handler übergibt `body.text ?? body.input ?? ''` an den Service.

Der Alias `input` wirkt wie ein Kompatibilitäts- oder Übergangsfeld für bestehende Clients.

### Response-Schema

Die Service-Funktion liefert ein Objekt vom Typ `SymptomExtractionResponse`:

- `text`: der originale Freitext
- `inputType`: `text` oder `speech`
- `symptoms`: extrahierte Symptomliste
- `invalidInput?`: Kennzeichnung für ungültige Eingaben
- `message?`: fachliche Rückmeldung bei ungültiger Eingabe

Wichtig ist, dass ungültiger medizinischer Freitext nicht als HTTP-Fehler behandelt wird. Stattdessen liefert das Modul regulär eine Antwort mit:

- leerer `symptoms`-Liste
- `invalidInput: true`
- einer Benutzer-Nachricht in `message`

### Datenmodell der Symptome

Ein einzelnes Symptom hat folgende Struktur:

```ts
{
  region: string
  side?: string
  painLevel?: number
  duration?: 'today' | 'days' | 'week' | 'weeks'
}
```

Die eigentliche KI-Ausgabe wird über `symptomExtractionAiResultSchema` eingeschränkt:

- `symptoms` ist ein Array
- maximal `3` Einträge
- jeder Eintrag muss `selectedSymptomSchema` erfüllen

### Ablauf im Service

Die Kernlogik steht in [backend/src/modules/symptom-extraction/symptomExtraction.service.ts]

Der Ablauf ist mehrstufig:

1. heuristische Vorprüfung
2. KI-Validierung des Freitexts
3. KI-Extraktion der Symptome
4. Rückgabe der strukturierten Liste

#### 1. Heuristische Vorprüfung

`detectHeuristicInvalidInput(...)` fängt klar ungeeignete Eingaben schon ohne KI-Aufruf ab.

Verwendete Hilfsfunktionen:

- `normalizeText(...)`
- `splitWords(...)`

Geprüft werden unter anderem:

- sehr kurze Eingaben
- nur ein einzelnes, nicht-medizinisches Wort
- stark repetitiver Buchstabensalat
- reine Satzzeichen- oder Zahleneingaben

Ziel dieser Heuristik:

- Kosten sparen
- Latenz reduzieren
- triviale Unsinnseingaben früh abweisen

Wenn die Heuristik anschlägt, liefert der Service sofort:

- `invalidInput: true`
- `symptoms: []`
- eine konkrete Benutzer-Nachricht

#### 2. KI-Validierung des Freitexts

Wenn die Heuristik den Text nicht verwirft, ruft das Modul `requestInputValidationFromAi(...)` auf.

Die KI bekommt:

- einen System-Prompt zur Trennung zwischen medizinisch sinnvollem und unsinnigem Freitext
- einen User-Prompt mit `Input-Typ` und `Freitext`

Die strukturierte Antwort muss dem Schema `symptomInputValidationAiResultSchema` entsprechen:

```ts
{
  isValidMedicalInput: boolean
  reason: string
}
```

Wenn `isValidMedicalInput` `false` ist, liefert der Service wieder eine reguläre Antwort mit:

- `invalidInput: true`
- `symptoms: []`
- `message: reason`

#### 3. KI-Extraktion der Symptome

Nur wenn der Text fachlich valide wirkt, ruft das Modul `requestSymptomsFromAi(...)` auf.

Der Prompt erzwingt eine sehr enge Taxonomie:

- nur bekannte Regionen
- nur definierte Unteroptionen
- optionale Schmerzstärke nur als ganze Zahl von `1` bis `10`
- Dauer nur aus einer festen Auswahlliste
- keine erfundenen Symptome
- maximal drei Symptome

Die strukturierte Antwort wird über `symptomExtractionAiResultSchema` validiert.

#### 4. Rückgabe

Die Rückgabe enthält:

- den ursprünglichen `text`
- `inputType`
- die extrahierten `symptoms`

Wenn der Text gültig war, enthält die Antwort kein `invalidInput`.

### Fachliche Leitplanken

Das Modul ist nicht als freies NLU-System ausgelegt, sondern als Übersetzer in eine feste Frontend-Symptomtaxonomie.

Wichtige Konsequenzen:

- Nicht jedes medizinisch sinnvolle Detail wird übernommen.
- Das Modul priorisiert Kompatibilität mit der UI über Vollständigkeit.
- Symptome außerhalb der hinterlegten Taxonomie werden nicht frei modelliert.
- Schmerzstärke und Dauer werden nur übernommen, wenn sie klar erkennbar sind.

### Fehlerverhalten

Mögliche Fehlerfälle:

- formale Request-Validierung schlägt fehl: HTTP `400`
- KI-Client ist falsch konfiguriert oder nicht erreichbar: HTTP `500`
- KI liefert keine parsebare strukturierte Antwort: HTTP `500`

Fachlich ungültiger Freitext ist dagegen kein technischer Fehler, sondern Teil des normalen Antwortvertrags.