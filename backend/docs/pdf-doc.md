## Modul `pdfExport`

### Zuständigkeiten

Das Modul `pdf` erzeugt aus einer bereits vorliegenden Ersteinschätzung ein patientenlesbares PDF. Es übernimmt:

- Validierung des Export-Requests
- Aufbereitung von Patientendaten, Beschwerden und Triage-Ergebnis
- Normalisierung deutscher Texte und älterer Summary-Formate
- Erzeugung eines A4-Dokuments mit PDFKit
- Rückgabe des PDFs als binärer Download

Das Modul führt selbst keine medizinische Bewertung und keinen KI-Aufruf durch. Es formatiert ausschließlich Daten, die bereits von anderen Modulen oder vom Frontend bereitgestellt wurden.

### Ziel

Ziel des Moduls ist ein direkt herunterladbares Dokument, das die bereits erfassten medizinischen Angaben und die empfohlene Versorgungsebene verständlich zusammenfasst. Das PDF dient als patientenseitige Dokumentation der Ersteinschätzung, nicht als Diagnose oder neue fachliche Bewertung.

### Relevante Dateien

- Route: `backend/src/routes/pdf.routes.ts`
- Request- und Response-Typen: `backend/src/modules/pdf/pdf.types.ts`
- PDF-Erzeugung: `backend/src/modules/pdf/pdfExport.service.ts`
- Logo: `backend/src/modules/pdf/assets/HeptaCheck.png`
- Integrationstest: `backend/tests/integration/routes/pdf.routes.test.ts`
- Service-Tests: `backend/tests/unit/modules/pdf/pdfExport.service.test.ts`

Die Route verwendet das Schema `pdfExportRequestSchema` aus `pdf.types.ts`. Die ältere Datei `pdf.schema.ts` wird von der aktuellen Route nicht importiert und beschreibt nicht den aktuellen API-Vertrag.

### HTTP-Endpunkt

```http
POST /api/v1/pdf/export
Content-Type: application/json
```

Der Endpunkt validiert den Request, ruft `createPdfSummary(...)` auf und wandelt dessen Base64-Inhalt in einen binären PDF-Body um.

### Request-Schema

```ts
interface PdfExportRequest {
  reviewSummary: {
    plainLanguage: string
    professionalSummary: string
  }
  symptomText?: string
  aiModel?: string
  triage?: {
    careLevel: 'selfcare' | 'doctor' | 'specialist' | 'emergency'
    recommendedSpecialty?: MedicalSpecialty
    reasons: string[]
  }
  patientData?: PatientData
  symptoms?: TriageSymptom[]
}
```

#### Pflichtfelder

`reviewSummary` ist erforderlich. Beide enthaltenen Texte müssen mindestens ein Zeichen lang sein:

- `plainLanguage`: patientenverständliche Begründung
- `professionalSummary`: strukturierte oder freie medizinische Zusammenfassung

#### Optionale Felder

- `symptomText`: ursprüngliche Eingabe; wird im PDF als „Ihre Eingabe“ dargestellt
- `aiModel`: Modellname; wird als Herkunftshinweis im Einleitungstext angezeigt
- `triage`: Versorgungsebene, optionale Fachrichtung und höchstens fünf Begründungen
- `patientData`: Stammdaten und medizinische Kontextangaben
- `symptoms`: höchstens drei strukturierte Beschwerden

Leere Strings sind für `symptomText`, `aiModel`, Summary-Texte sowie einzelne Triage-Begründungen nicht erlaubt.

#### Triage-Daten

`careLevel` akzeptiert:

- `selfcare`
- `doctor`
- `specialist`
- `emergency`

`recommendedSpecialty` ist optional und verwendet die zentrale Fachrichtungsliste aus `shared/result.types.ts`, beispielsweise `general_practice`, `cardiology`, `neurology` oder `emergency_medicine`.

### Datenmodell der Symptome

```ts
interface TriageSymptom {
  region: string
  side?: string
  details?: string
  measurementType?: 'pain' | 'temperature' | 'feeling' | 'severity'
  measurementValue?: number
  duration?: 'today' | 'days' | 'week' | 'weeks'
}
```

`region` ist Pflicht. Die API begrenzt die Liste auf drei Symptome, prüft `measurementValue` aber nicht auf einen bestimmten Wertebereich.

### PatientData

Wenn `patientData` übergeben wird, müssen die im zentralen `patientDataSchema` definierten Felder vorhanden sein. Dazu gehören unter anderem Geburtsmonat und -jahr, Größe, Gewicht, Geschlecht, Schwangerschaft, Stillzeit, Allergien, Medikamente, Auslandsreise, Vorerkrankungen und Rauchstatus. `medicationDuration` ist optional und erhält standardmäßig einen leeren String.

### Response-Schema

#### Erfolg: `200 OK`

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="medizinische-ersteinschaetzung.pdf"
```

Der Response-Body enthält direkt die binären PDF-Daten und kein JSON. Ein erfolgreicher Body beginnt mit der PDF-Signatur `%PDF-`.

Die interne Service-Antwort enthält zusätzlich `generatedAt` und die erzeugten Abschnitte. Diese Metadaten werden vom HTTP-Endpunkt jedoch nicht als JSON ausgegeben.

### Fehlerverhalten

| Status | Code/Nachricht | Ursache |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request entspricht nicht dem Zod-Schema |
| `500` | `INTERNAL_SERVER_ERROR` | Unerwarteter Fehler bei Aufbereitung oder PDF-Erzeugung |

Ein Validierungsfehler verwendet das globale Fehlerformat:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "details": [
      {
        "path": "reviewSummary",
        "message": "Required"
      }
    ]
  }
}
```

## API-Beispiele

### Beispiel: Vollständiger PDF-Export

```bash
curl -X POST http://localhost:3000/api/v1/pdf/export \
  -H 'Content-Type: application/json' \
  --data '{
    "reviewSummary": {
      "plainLanguage": "Die Beschwerden sollten zeitnah ärztlich abgeklärt werden.",
      "professionalSummary": "Patientendaten:\nGeburtsmonat: 01\nGeburtsjahr: 1990\n\nBeschwerden:\n1. Kopf\nSchmerzstärke: 6/10"
    },
    "symptomText": "Ich habe seit gestern Kopfschmerzen.",
    "aiModel": "medgemma:27b",
    "triage": {
      "careLevel": "doctor",
      "recommendedSpecialty": "neurology",
      "reasons": ["Zeitnahe ärztliche Abklärung empfohlen."]
    },
    "symptoms": [
      {
        "region": "Kopf",
        "measurementType": "pain",
        "measurementValue": 6,
        "duration": "days"
      }
    ]
  }' \
  --output medizinische-ersteinschaetzung.pdf
```

### Ablauf im Service

#### 1. Request-Validierung

Die Route validiert den JSON-Body mit `pdfExportRequestSchema`. Ungültige Daten erreichen den Service nicht.

#### 2. Inhaltliche Aufbereitung

`buildSections(...)` erzeugt die Abschnitte „Medizinische Übersicht“ und „Wichtiger Hinweis“. Eine erkennbare strukturierte `professionalSummary` wird normalisiert. Andernfalls baut der Service die Übersicht aus `patientData` und `symptoms` neu auf.

#### 3. Formatierung

Triage-Werte und Fachrichtungen werden in deutsche, patientenlesbare Bezeichnungen übersetzt. PDFKit rendert Kopfzeile, Inhaltskarten, Warnhinweis und Seitenzahlen auf A4-Seiten.

#### 4. Rückgabe

Der Service sammelt den PDFKit-Stream, kodiert ihn intern als Base64 und gibt ihn an die Route zurück. Die Route dekodiert den Inhalt und sendet ihn als binäre PDF-Datei.

### Fachliche und technische Leitplanken

- Der Zeitstempel wird in der Zeitzone `Europe/Berlin` formatiert.
- Häufige ASCII-Schreibweisen wie `ae`, `oe` und `ue` werden für patientenseitige Texte normalisiert.
- Auslandsreisen im Format `Land|YYYY-MM-DD|YYYY-MM-DD` werden lesbar dargestellt.
- Strukturierte professionelle Zusammenfassungen akzeptieren aktuelle und ältere Überschriften wie `Patientendaten`, `Stammdaten` und `Beschwerden`.
- Das Logo ist optional. Fehlt die Datei oder kann sie nicht geladen werden, wird das PDF trotzdem erzeugt.
- Bei langen Inhalten fügt der Renderer zusätzliche Seiten ein und nummeriert alle Seiten.

## Betrieb, Debugging und Grenzen

### Datenschutz und Grenzen

- Der Endpunkt besitzt aktuell keine Authentifizierung oder Autorisierung.
- Die PDF-Daten werden nicht durch dieses Modul persistiert.
- Der Download kann sensible Gesundheits- und Stammdaten enthalten und muss im Frontend entsprechend behandelt werden.
- Das Dokument ist ausdrücklich keine Diagnose und enthält einen festen medizinischen Warnhinweis.
- Die Korrektheit der gelieferten medizinischen Inhalte wird im PDF-Modul nicht erneut bewertet.

### Debugging-Hinweise

Bei Problemen sollten folgende Punkte geprüft werden:

- Entspricht der Body dem aktuellen Schema aus `pdf.types.ts`?
- Sind beide Texte in `reviewSummary` befüllt?
- Enthält `triage.reasons` höchstens fünf Einträge?
- Enthält `symptoms` höchstens drei Einträge?
- Ist das optionale Logo im Laufzeitverzeichnis vorhanden?
- Zeigt der Server-Log einen PDFKit- oder Stream-Fehler?

### Tests

```bash
cd backend
npm test -- tests/integration/routes/pdf.routes.test.ts tests/unit/modules/pdf
```

Die Tests decken unter anderem Download-Header, PDF-Signatur, Request-Validierung und die inhaltliche Formatierung des Dokuments ab.

### Erweiterungspunkte

Sinnvolle Weiterentwicklungen wären:

- gemeinsames Schema für Frontend und Backend statt manueller Payload-Abbildung
- expliziter API-Fehlercode für Fehler der PDF-Erzeugung
- konfigurierbare Sprache und Zeitzone
- barriereärmere PDF-Struktur und eingebettete Metadaten
- Entfernung oder Migration der nicht mehr verwendeten Datei `pdf.schema.ts`

## Fazit

`pdfExport` ist eine reine Ausgabeschicht: Das Modul validiert bereits vorhandene Assessment-Daten, bereitet sie patientenverständlich auf und liefert ein binäres PDF. Medizinische Entscheidungen bleiben in den vorgelagerten Modulen. Der zentrale API-Endpunkt ist `POST /api/v1/pdf/export`.
