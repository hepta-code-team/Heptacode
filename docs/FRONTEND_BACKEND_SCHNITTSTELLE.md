# Schnittstelle zwischen Frontend und Backend

Diese Dokumentation beschreibt die HTTP-Schnittstelle zwischen dem React/Vite-Frontend und dem Fastify-Backend. Sie ist als gemeinsame Referenz für Frontend- und Backend-Entwicklung gedacht und dokumentiert sowohl die aktuell vorhandenen Backend-Endpunkte als auch den aktuellen Integrationsstand im Frontend.

## Überblick

| Bereich | Wert |
|---|---|
| Frontend-Dev-URL | `http://localhost:5173` |
| Backend-Dev-URL | `http://localhost:3000` |
| API-Basis-URL im Frontend | `VITE_API_BASE_URL`, Fallback `http://localhost:3000` |
| API-Präfix der fachlichen Backend-Endpunkte | `/api/v1` |
| Standard-Content-Type | `application/json` für JSON-Endpunkte |
| PDF-Content-Type | `application/pdf` |
| CORS | Backend erlaubt `env.corsOrigin`, lokal typischerweise das Frontend |

## Aktueller Integrationsstand

Das Backend stellt die dokumentierten `/api/v1/...`-Endpunkte bereit. Das Frontend besitzt einen generischen `apiClient`, der Requests an `VITE_API_BASE_URL` sendet und JSON-Fehlernachrichten aus `message` oder `error` liest.

Wichtig: Der aktuell im Frontend verdrahtete Assessment-Submit ruft `POST /assessments` auf. Dieser Endpunkt existiert im Backend derzeit nicht. Für die fachliche Triage ist aktuell der Backend-Endpunkt `POST /api/v1/triage/evaluate` vorgesehen. Bei einer Anbindung sollte das Frontend entweder auf diesen Endpunkt umgestellt werden oder das Backend muss einen kompatiblen `/assessments`-Adapter bereitstellen.

## Gemeinsame HTTP-Regeln

### Request-Format

JSON-Endpunkte erwarten einen Body mit Header:

```http
Content-Type: application/json
```

Der Frontend-Client serialisiert Request-Bodies mit `JSON.stringify`.

### Erfolgsantworten

JSON-Endpunkte antworten mit JSON. PDF-Endpunkte antworten direkt mit einem PDF-Download.

### Fehlerformat

Es gibt aktuell zwei Fehlerformate:

1. Globaler Backend-Error-Handler, z. B. bei Zod-Validierungsfehlern in den klassischen Routes:

```json
{
  "message": "Validation failed",
  "details": {}
}
```

2. Summary-Controller-spezifisches Fehlerformat:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Die übergebenen Daten sind ungültig.",
    "details": {}
  }
}
```

Der aktuelle Frontend-Client liest nur `message` oder einen stringartigen `error` direkt auf Top-Level. Für Summary-Fehler mit `error.message` müsste die Fehlerauswertung erweitert werden, falls diese Endpunkte direkt über den bestehenden Client angebunden werden.

### Wichtige Statuscodes

| Status | Bedeutung |
|---|---|
| `200` | Erfolgreiche JSON-Antwort |
| `400` | Ungültige Anfrage oder fachlicher Bad Request, z. B. ungültiger Triage-Freitext |
| `404` | Ressource nicht gefunden, z. B. unbekannte Summary-ID beim PDF-Download |
| `422` | Summary-Validierungsfehler oder fehlende Datenverarbeitungszustimmung |
| `500` | Interner Fehler, z. B. KI-/PDF-Erzeugungsfehler |

## Endpunkte

### Health Check

```http
GET /health
```

Prüft, ob das Backend erreichbar ist.

#### Response `200`

```json
{
  "status": "ok"
}
```

#### Beispiel

```bash
curl http://localhost:3000/health
```

---

### Symptom-Extraktion aus Freitext

```http
POST /api/v1/symptoms/extraction
```

Extrahiert aus deutschem medizinischem Freitext bis zu drei frontend-kompatible Symptome. Das Backend validiert zuerst, ob der Text medizinisch sinnvoll wirkt, und nutzt danach die KI zur strukturierten Extraktion.

#### Request

```ts
interface SymptomExtractionRequest {
  text?: string;
  input?: string; // Legacy-/Alternativfeld, falls text nicht gesetzt ist
  inputType?: "text" | "speech";
}
```

Validierung:

- entweder `text` oder `input` muss vorhanden und nach Trim nicht leer sein
- `inputType` ist optional, Default im Service ist `text`

#### Response `200`

```ts
interface SymptomExtractionResponse {
  text: string;
  inputType: "text" | "speech";
  symptoms: TriageSymptom[];
  invalidInput?: boolean;
  message?: string;
}
```

Bei fachlich ungültigem Freitext antwortet der Endpunkt trotzdem mit `200`, aber mit `invalidInput: true`, leerer Symptomliste und einer erklärenden `message`.

#### Beispiel-Request

```bash
curl -X POST http://localhost:3000/api/v1/symptoms/extraction \
  -H 'Content-Type: application/json' \
  --data '{"text":"Ich habe seit ein paar Tagen starke Kopfschmerzen, etwa 7 von 10, und leichte Übelkeit."}'
```

#### Beispiel-Response

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

#### Frontend-Nutzung

Geeignet für Eingaben wie Freitext oder Sprache-zu-Text, bevor Symptome in der UI vorausgefüllt oder direkt an die Triage übergeben werden.

---

### Red-Flag-Prüfung

```http
POST /api/v1/triage/redflags
```

Prüft einen Text per einfacher Keyword-Regel auf bekannte Warnzeichen.

#### Request

```ts
interface RedFlagCheckRequest {
  text: string;
}
```

Validierung:

- `text` ist Pflicht und darf nach Trim nicht leer sein

#### Response `200`

```ts
interface RedFlagCheckResponse {
  hasRedFlags: boolean;
  matches: string[];
}
```

Aktuelle Suchbegriffe:

- `atemnot`
- `brustschmerz`
- `bewusstlos`
- `lähmung`
- `starke blutung`
- `krampfanfall`

#### Beispiel

```bash
curl -X POST http://localhost:3000/api/v1/triage/redflags \
  -H 'Content-Type: application/json' \
  --data '{"text":"Ich habe Atemnot und Brustschmerz."}'
```

```json
{
  "hasRedFlags": true,
  "matches": ["atemnot", "brustschmerz"]
}
```

---

### Triage aus Symptomen oder Freitext

```http
POST /api/v1/triage/evaluate
```

Bewertet Beschwerden und gibt Versorgungsebene, Fachrichtung und Begründungen zurück.

#### Request

```ts
interface TriageRequest {
  patientData?: PatientData;
  symptoms?: TriageSymptom[];
  text?: string;
  inputType?: "text" | "speech";
  emergencyFromLanding?: boolean;
}
```

Validierung:

- mindestens `text` oder eine nicht leere `symptoms`-Liste ist erforderlich
- `symptoms` darf maximal 3 Einträge enthalten
- `inputType` ist optional
- `emergencyFromLanding` ist optional

Achtung: Der Zod-Request verlangt aktuell trotzdem `text` oder `symptoms`. Obwohl der Service `emergencyFromLanding` fachlich direkt als Notfall bewertet, muss der Request für die aktuelle Route zusätzlich `text` oder `symptoms` enthalten, bis das Schema entsprechend erweitert wird.

#### Verarbeitung

1. Wenn `emergencyFromLanding` gesetzt ist, antwortet der Service mit `emergency` und `emergency_medicine`.
2. Wenn `text` gesetzt ist, führt das Backend zuerst die Symptom-Extraktion aus.
3. Wenn die Extraktion `invalidInput` liefert, wird daraus ein `400`-Fehler.
4. Sonst bewertet die KI die strukturierten Symptome.
5. Wenn strukturierte `symptoms` übergeben werden, werden diese direkt bewertet.

#### Response `200`

```ts
interface TriageResponse {
  careLevel: "emergency" | "doctor" | "selfcare";
  recommendedSpecialty: MedicalSpecialty;
  reasons: string[]; // maximal 5 Begründungen
}
```

#### Beispiel: strukturierte Symptome

```bash
curl -X POST http://localhost:3000/api/v1/triage/evaluate \
  -H 'Content-Type: application/json' \
  --data '{"patientData":{"birthMonth":"05","birthYear":"1988","height":"175","weight":"78","gender":"männlich","isPregnant":false,"isBreastfeeding":false,"allergies":"","medications":"","substanceInfluence":"Nein","recentAbroad":false,"recentAbroadDetails":"","conditions":[]},"symptoms":[{"region":"Kopf","painLevel":7,"duration":"days"},{"region":"Allgemein","side":"Übelkeit/Schwindel"}]}'
```

```json
{
  "careLevel": "doctor",
  "recommendedSpecialty": "neurology",
  "reasons": [
    "Die Beschwerden sollten zeitnah ärztlich abgeklärt werden."
  ]
}
```

#### Beispiel: Freitext

```bash
curl -X POST http://localhost:3000/api/v1/triage/evaluate \
  -H 'Content-Type: application/json' \
  --data '{"text":"Ich habe seit heute sehr starke Brustschmerzen, 10 von 10."}'
```

```json
{
  "careLevel": "emergency",
  "recommendedSpecialty": "emergency_medicine",
  "reasons": [
    "Die starken Brustschmerzen mit hoher Schmerzintensität sprechen für ein mögliches akutes Risiko."
  ]
}
```

---

### PDF-Export einer Assessment-Zusammenfassung

```http
POST /api/v1/pdf/export
```

Erzeugt ein PDF aus Patientendaten und Symptomen. Der Endpunkt sendet das PDF direkt als Datei zurück.

#### Request

```ts
interface PdfExportRequest {
  assessment: {
    patientData?: PatientData;
    symptoms: TriageSymptom[];
  };
}
```

Validierung:

- `assessment` ist Pflicht
- `assessment.symptoms` ist Pflicht und darf maximal 3 Symptome enthalten
- `patientData` ist optional

#### Response `200`

Header:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="triage-summary.pdf"
```

Body: PDF-Binärdaten.

#### Beispiel

```bash
curl -X POST http://localhost:3000/api/v1/pdf/export \
  -H 'Content-Type: application/json' \
  --data '{"assessment":{"symptoms":[{"region":"Kopf","painLevel":7,"duration":"days"}]}}' \
  --output triage-summary.pdf
```

---

### Strukturierte Summary erstellen

```http
POST /api/v1/summary
```

Erstellt eine strukturierte medizinische Zusammenfassung inklusive Plain-Language-Text, professioneller Zusammenfassung und FHIR-nahem Preview. Die Summary wird im aktuellen Prozessspeicher abgelegt und kann anschließend als PDF heruntergeladen werden.

#### Request

```ts
interface SummaryRequest {
  patient: {
    age: number; // 0 bis 120
    sex: "female" | "male" | "diverse" | "unknown";
    pregnant?: boolean;
    knownConditions?: string[];
    medications?: string[];
    allergies?: string[];
  };
  symptoms: {
    freeText: string; // mindestens 3 Zeichen
    selectedSymptoms?: string[];
    duration?: string;
    severity?: number; // 0 bis 10
    location?: string;
    progression?: "better" | "same" | "worse" | "unknown";
  };
  triage?: TriageResponse;
  context?: {
    language?: "de" | "en";
    accessibilityMode?: boolean;
  };
  consent: {
    acceptedDataProcessing: boolean;
  };
}
```

Validierung:

- `patient.age` muss eine Ganzzahl zwischen 0 und 120 sein
- `patient.sex` ist enum-beschränkt
- `symptoms.freeText` ist Pflicht und mindestens 3 Zeichen lang
- `symptoms.severity` ist optional und muss bei Angabe zwischen 0 und 10 liegen
- `consent.acceptedDataProcessing` muss vorhanden sein; fachlich muss der Wert `true` sein

#### Response `200`

```ts
interface SummaryResponse {
  summaryId: string;
  triage?: TriageResponse;
  aiReviewSummary: {
    plainLanguage: string;
    professionalSummary: string;
  };
  fhirPreview: {
    resourceType: "Bundle";
    type: "collection";
    note: string;
  };
  safetyNotice: string;
}
```

#### Fehler

| Status | Code | Bedeutung |
|---|---|---|
| `422` | `VALIDATION_ERROR` | Request passt nicht zum Schema |
| `422` | `CONSENT_REQUIRED` | Datenverarbeitungszustimmung wurde nicht akzeptiert |
| `500` | `SUMMARY_CREATION_FAILED` | Summary konnte nicht erstellt werden |

#### Beispiel

```bash
curl -X POST http://localhost:3000/api/v1/summary \
  -H 'Content-Type: application/json' \
  --data '{"patient":{"age":38,"sex":"male","knownConditions":[],"medications":[],"allergies":[]},"symptoms":{"freeText":"Seit ein paar Tagen starke Kopfschmerzen.","selectedSymptoms":["Kopf"],"duration":"days","severity":7,"progression":"same"},"triage":{"careLevel":"doctor","recommendedSpecialty":"neurology","reasons":["Zeitnahe Abklärung empfohlen."]},"context":{"language":"de"},"consent":{"acceptedDataProcessing":true}}'
```

---

### Summary-PDF herunterladen

```http
GET /api/v1/summary/pdf?summaryId=<summaryId>
```

Lädt eine zuvor erzeugte Summary als PDF herunter. Die Summary liegt nur im Prozessspeicher. Nach einem Backend-Neustart sind zuvor erzeugte `summaryId`s nicht mehr verfügbar.

#### Query-Parameter

| Parameter | Pflicht | Bedeutung |
|---|---:|---|
| `summaryId` | ja | ID aus `POST /api/v1/summary` |

#### Response `200`

Header:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="<summaryId>.pdf"
```

Body: PDF-Binärdaten.

#### Fehler

| Status | Code | Bedeutung |
|---|---|---|
| `400` | `SUMMARY_ID_REQUIRED` | Query-Parameter fehlt |
| `404` | `SUMMARY_NOT_FOUND` | Keine Summary zu dieser ID gefunden |
| `500` | `PDF_CREATION_FAILED` | PDF konnte nicht erzeugt werden |

#### Beispiel

```bash
curl "http://localhost:3000/api/v1/summary/pdf?summaryId=summary_1710000000000" \
  --output summary.pdf
```

## Frontend-Anbindung

### `apiClient`

Der Frontend-Client stellt zwei Methoden bereit:

```ts
apiClient.get<TResponse>(path, options?)
apiClient.post<TResponse>(path, body?, options?)
```

Eigenschaften:

- Basis-URL: `import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"`
- setzt standardmäßig `Content-Type: application/json`
- serialisiert `body` automatisch als JSON
- wirft bei nicht erfolgreichem HTTP-Status einen `Error`
- unterstützt aktuell primär JSON-Antworten; PDF-Downloads sollten mit separater `fetch`-Logik oder erweitertem Client behandelt werden

### Empfohlener Triage-Submit aus dem Frontend

Aktuell sendet `submitAssessment` ein Frontend-spezifisches `AssessmentPayload` an `/assessments`:

```ts
interface AssessmentPayload {
  patientData: PatientData;
  selectedSymptoms: SelectedSymptom[];
  symptomDetails: Symptom[];
}
```

Für den bestehenden Backend-Endpunkt sollte daraus ein `TriageRequest` gemappt werden. Die Felder aus `symptomDetails` müssen dabei auf die Backend-Felder abgebildet werden:

| Frontend-Feld | Backend-Feld | Hinweis |
|---|---|---|
| `symptom.region` | `region` | direkt übernehmbar |
| `symptom.side` | `side` | optional |
| `measurementValue` | `painLevel` | nur setzen, wenn `measurementType === "pain"`; Wert muss 1 bis 10 sein |
| `duration` | `duration` | muss auf `today`, `days`, `week`, `weeks` normalisiert werden |
| `patientData` | `patientData` | direkt übernehmbar, wenn alle Pflichtfelder gefüllt sind |

Zielrequest:

```ts
const request: TriageRequest = {
  patientData,
  symptoms: symptomDetails
    .filter((symptom) => symptom.active)
    .slice(0, 3)
    .map((symptom) => ({
      region: symptom.region,
      side: symptom.side,
      painLevel: symptom.measurementType === "pain" ? symptom.measurementValue : undefined,
      duration: symptom.duration as "today" | "days" | "week" | "weeks",
    })),
};
```

Dann:

```ts
const result = await apiClient.post<TriageResponse>("/api/v1/triage/evaluate", request);
```

## Sicherheits- und Produkt-Hinweise

- Triage-Antworten sind Orientierung und ersetzen keine ärztliche Diagnose.
- Bei `careLevel: "emergency"` sollte das Frontend prominent auf Notruf `112` bzw. Notaufnahme hinweisen.
- Bei KI-Fehlern sollte das Frontend eine verständliche Fehlermeldung anzeigen und keine medizinische Entwarnung suggerieren.
- Summary-Daten werden aktuell nur im Speicher gehalten und sind nicht persistent.
- PDF-Downloads enthalten medizinische Angaben und sollten im Frontend bewusst als sensible Daten behandelt werden.

## Kurzreferenz aller Backend-Endpunkte

| Methode | Pfad | Zweck | Antwort |
|---|---|---|---|
| `GET` | `/health` | Backend-Erreichbarkeit | JSON |
| `POST` | `/api/v1/symptoms/extraction` | Symptome aus Freitext extrahieren | JSON |
| `POST` | `/api/v1/triage/redflags` | Red-Flag-Keywords prüfen | JSON |
| `POST` | `/api/v1/triage/evaluate` | Triage bewerten | JSON |
| `POST` | `/api/v1/pdf/export` | Assessment-PDF erzeugen | PDF |
| `POST` | `/api/v1/summary` | Strukturierte Summary erzeugen | JSON |
| `GET` | `/api/v1/summary/pdf` | Summary-PDF herunterladen | PDF |
