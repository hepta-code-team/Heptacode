## Modul `symptom-extraction`

### Zuständigkeiten

`symptom-extraction` bereitet Freitext- und Spracheingaben fuer die weitere medizinische Ersteinschaetzung auf.

Das Modul uebernimmt:

- formale Request-Validierung
- Plausibilitaetspruefung gegen Stammdaten
- heuristische Vorpruefung auf offensichtlichen Unsinn
- KI-gestuetzte Pruefung, ob medizinisch sinnvoller Inhalt vorliegt
- KI-gestuetzte Extraktion von bis zu drei strukturierten Symptomen
- Validierung einzelner Freitextangaben auf der Detailseite
- Konsistenzpruefung zwischen ausgewaehlter Region und Zusatzdetails
- kontrollierte Fallback-Antworten bei KI-Verfuegbarkeitsproblemen

### Strukturierte AI-Antworten

In [backend/src/ai/llmAdapter.ts] kapseln `requestStructuredAiResponse(...)` und `requestStructuredAiResponseWithModel(...)` die KI-Aufrufe.

Die Funktionen nutzen zuerst strukturierte OpenAI-Antworten mit `zodResponseFormat(...)`. Wenn die strukturierte Parse-Variante aus einem nicht-verfuegbarkeitsbezogenen Grund scheitert, versucht der Adapter JSON-Modus plus lokale Zod-Validierung. Bei Verfuegbarkeitsfehlern kann auf das konfigurierte Fallback-Modell gewechselt werden.

Validierungsnahe Aufrufe in diesem Modul verwenden `modelStrategy: 'fallback-only'`.

### Ziel

Das Modul uebersetzt deutschen medizinischen Freitext in eine kleine, stabile und frontend-kompatible Symptomliste.

Die Ausgabe ist begrenzt auf:

- maximal drei Symptome
- bekannte Regionen und Unteroptionen aus der Symptomtaxonomie, wenn sie passen
- freie, kurze medizinische `region`-Namen, wenn die Taxonomie eine Beschwerde nicht ausreichend abbildet
- optionale Zusatzdetails
- optionale Messart und Messwert
- optionale Dauer als `today`, `days`, `week` oder `weeks`

### HTTP-Endpunkte

Die Routen befinden sich in [backend/src/routes/symptomExtraction.routes.ts].

#### `POST /api/v1/symptoms/extraction`

Extrahiert Symptome aus Freitext oder Spracheingabe.

#### `POST /api/v1/symptoms/validation`

Prueft, ob ein Freitext als medizinischer Input verwertbar ist. Es werden keine Symptome extrahiert.

#### `POST /api/v1/symptoms/detail-validation`

Prueft eine einzelne Angabe von der Symptom-Detailseite. Dieser Pfad ist bewusst toleranter als die allgemeine Freitextvalidierung, weil dort auch kurze Stichworte, Koerperstellen, Seitenangaben, Verletzungsmechanismen oder Negationen valide sein koennen.

#### `POST /api/v1/symptoms/consistency`

Prueft, ob eine ausgewaehlte Region und optionale Details eindeutig widerspruechliche Koerperbereiche nennen.

### Request-Schema

Das Schema steht in [backend/src/modules/symptom-extraction/symptomExtraction.types.ts].

Fuer Extraktion und Validierung sind erlaubt:

- `symptomText?: string`
- `text?: string`
- `input?: string`
- `inputType?: 'text' | 'speech'`
- `patientData?: PatientData`

Mindestens eines der Textfelder muss befuellt sein. Der Route-Handler verwendet die Prioritaet:

```ts
body.symptomText ?? body.text ?? body.input ?? ''
```

`symptomText` ist das aktuelle fachliche Feld. `text` und `input` bleiben als kompatible Alternativen erlaubt.

Fuer die Konsistenzpruefung sind erlaubt:

- `region: string`
- `side?: string`
- `details?: string`
- `patientData?: PatientData`

### Response-Schemas

#### Symptom-Extraktion

`extractSymptoms(...)` liefert `SymptomExtractionResponse`:

- `text`: der originale Freitext
- `inputType`: `text` oder `speech`
- `symptoms`: extrahierte Symptomliste
- `invalidInput?`: Kennzeichnung fachlich ungueltiger Eingaben
- `aiUnavailable?`: Kennzeichnung, dass keine rechtzeitige oder strukturierte KI-Antwort verfuegbar war
- `message?`: Benutzer-Nachricht bei ungueltiger Eingabe oder KI-Ausfall

Fachlich ungueltiger Freitext ist kein HTTP-Fehler. Der Endpunkt antwortet regulaer mit leerer Symptomliste und `invalidInput: true`.

#### Input-Validierung

`validateSymptomInput(...)` und `validateSymptomDetailInput(...)` liefern:

- `text`
- `inputType`
- `isValidMedicalInput`
- `aiUnavailable?`
- `message?`

#### Konsistenzpruefung

`validateSymptomConsistency(...)` liefert:

- `isRegionMeaningful`
- `hasClearContradiction`
- `selectedLocationIds`
- `detailLocationIds`
- `selectedLocationConfidence`
- `detailLocationConfidence`
- `aiUnavailable?`
- `message?`

### Datenmodell der Symptome

Ein extrahiertes Symptom entspricht `TriageSymptom`:

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

`painLevel` wird nicht mehr verwendet. Die Intensitaet wird ueber `measurementType` und `measurementValue` modelliert.

### Normalisierung der KI-Ausgabe

Die KI-Ausgabe wird ueber `symptomExtractionAiResultSchema` validiert und transformiert.

Wichtige Normalisierungen:

- bekannte Regionen werden auf kanonische Regionsnamen gemappt
- bekannte Unteroptionen koennen aus `region` oder `side` erkannt und in `region`/`side` ueberfuehrt werden
- leere Strings und `null` werden bei optionalen Feldern entfernt
- lokalisierte Messwerte wie `38,5 °C` werden numerisch normalisiert
- `temperature` bleibt nur fuer Fieber oder gemessene Koerpertemperatur erhalten
- Dauer- und Staerkeangaben werden aus `details` entfernt, weil sie eigene Felder haben
- redundante Details wie ein erneut genannter Regionsname werden entfernt

### Ablauf im Service

Die Kernlogik steht in [backend/src/modules/symptom-extraction/symptomExtraction.service.ts].

#### 1. Plausibilitaetspruefung gegen Stammdaten

Wenn `patientData` uebergeben wird, prueft `getPatientPlausibilityError(...)` logische Widersprueche. Aktuell wird insbesondere abgefangen, wenn bei maennlichem Geschlecht Schwangerschaft, Wehen oder Schwangerschaftsstatus angegeben werden.

Bei einem Widerspruch liefert das Modul eine fachliche Antwort mit:

- `invalidInput: true`
- `symptoms: []`
- `message` mit der Plausibilitaetsmeldung

#### 2. Heuristische Vorpruefung

`detectHeuristicInvalidInput(...)` faengt klar ungeeignete Eingaben ohne KI-Aufruf ab.

Geprueft werden unter anderem:

- sehr kurze Eingaben
- einzelne unzureichende Woerter
- stark repetitiver Buchstabensalat
- reine Satzzeichen- oder Zahleneingaben

Ziel ist, Kosten und Latenz fuer triviale Unsinnseingaben zu reduzieren.

#### 3. KI-Validierung des Freitexts

Wenn die Heuristik nicht verwirft, ruft das Modul `requestInputValidationFromAi(...)` auf.

Die strukturierte Antwort hat die Form:

```ts
{
  isValidMedicalInput: boolean
  reason: string
}
```

Wenn `isValidMedicalInput` `false` ist, endet der Ablauf mit `invalidInput: true`.

Falls dieser Validierungs-KI-Aufruf wegen Verfuegbarkeit scheitert, versucht `extractSymptoms(...)` trotzdem die eigentliche Extraktion. Ein transienter Validierungsausfall blockiert die Extraktion also nicht automatisch.

#### 4. KI-Extraktion der Symptome

Nur medizinisch sinnvoller Input wird extrahiert. Der Prompt erlaubt sowohl Taxonomie-Mapping als auch freie medizinische Symptomnamen, wenn die feste Liste sonst relevante Information verlieren wuerde.

Die Extraktion erfasst:

- Beschwerden, Symptome und Verletzungen
- Unfaelle, Wunden, Fremdkoerper, Vergiftungen, Blutungen und Verbrennungen
- Funktionsverluste, Gefuehlsstoerungen und Abtrennungen
- relevante Zusatzdetails wie Ursache, Mechanismus, Blutung, offene Wunde oder Negationen

Wenn die Extraktions-KI wegen Verfuegbarkeit scheitert, liefert der Service keinen HTTP-500, sondern:

- `symptoms: []`
- `aiUnavailable: true`
- eine Benutzer-Nachricht mit Hinweis auf erneuten Versuch oder manuelle Symptomauswahl

Unbekannte Fehler werden weiterhin geworfen.

### Detailvalidierung

`validateSymptomDetailInput(...)` nutzt einen eigenen Prompt fuer Detailseiten-Eingaben. Er ist lockerer als die allgemeine Freitextvalidierung:

- einzelne Woerter koennen gueltig sein
- anatomische Regionen koennen gueltig sein
- kurze Fragmente, Ursachen, Materialien oder Negationen koennen gueltig sein
- unspezifische Koerperregionen sind nicht automatisch ungueltig

Leere Eingaben werden direkt mit `Bitte geben Sie eine Angabe ein.` abgelehnt.

### Konsistenzpruefung Region/Details

`validateSymptomConsistency(...)` prueft, ob `region`/`side` und `details` eindeutig unterschiedliche Koerperbereiche nennen.

Der Ablauf:

- bekannte Koerperbereiche werden zunaechst deterministisch aus der gemeinsamen Taxonomie erkannt
- wenn beide Seiten eindeutig erkannt wurden, entscheidet der Service ohne KI
- wenn eine Seite nicht deterministisch aufloesbar ist, wird eine KI-Konsistenzpruefung genutzt
- blockiert wird nur bei hochsicheren, expliziten und nicht kompatiblen Koerperbereichen
- bei KI-Verfuegbarkeitsfehlern wird nicht blockiert, sondern `aiUnavailable: true` zurueckgegeben

### Fachliche Leitplanken

Das Modul ist kein freies Diagnose-System. Es uebersetzt Eingaben in eine triagefaehige Struktur.

Konsequenzen:

- maximal drei Beschwerden werden uebernommen
- UI-kompatible Taxonomie hat Vorrang, solange kein relevanter Inhalt verloren geht
- freie `region`-Namen sind erlaubt, wenn eine Beschwerde sonst zu grob wuerde
- Messwerte werden nur uebernommen, wenn sie ausdruecklich genannt sind
- Dauer wird nur gesetzt, wenn sie sicher einer der vier Optionen zuordenbar ist
- medizinisch relevante Negationen in Details sollen erhalten bleiben

### Fehlerverhalten

Mögliche technische Fehler:

- formale Request-Validierung schlaegt fehl: HTTP `400`
- unbekannte Service- oder Programmierfehler: HTTP `500`

Kontrollierte fachliche oder externe Fehler werden als normale Antwort modelliert:

- ungueltiger medizinischer Freitext: `invalidInput: true`
- KI-Verfuegbarkeitsproblem: `aiUnavailable: true`
