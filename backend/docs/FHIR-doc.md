# FHIR

Diese Datei beschreibt, wie HeptaCheck aktuell FHIR-Daten erzeugt. Die
Implementierung nutzt FHIR R4 Typen und baut nach einer abgeschlossenen
Ersteinschaetzung ein FHIR `Bundle` im Backend.

## Kurzueberblick

| Thema | Aktueller Stand |
|---|---|
| Standard | FHIR R4 |
| Bundle-Typ | `document` |
| Erzeugung | nach erfolgreichem `POST /assessments` |
| Speicherung | keine Persistenz, Bundle entsteht im Arbeitsspeicher |
| Externer Versand | echter HTTP-POST an `FHIR_ENDPOINT` |
| Hauptdatei | `backend/src/modules/fhir/fhirBundle.ts` |
| Tests | `backend/tests/unit/modules/fhir/fhirBundle.test.ts` |

## Ablauf im Backend

1. `POST /assessments` validiert den `AssessmentPayload`.
2. `evaluateAssessmentWithAi` erzeugt das fachliche `AssessmentResult`.
3. `buildFhirBundle(payload, result)` baut daraus ein FHIR Document Bundle.
4. Die Route loggt eine strukturierte, inhaltsarme Zusammenfassung des Bundles.
5. `sendFhirBundle(...)` uebergibt das Bundle an die Sendeschicht und fuehrt
   einen HTTP-POST an `FHIR_ENDPOINT` aus.
6. Die HTTP-Antwort bleibt das normale Assessment-Ergebnis; das FHIR Bundle wird
   aktuell nicht als Response ausgeliefert.

## FHIR-Versand

Fuer Integrations- und echte Sendetests gibt es einen Send-Endpunkt:

```http
POST /api/v1/fhir/send
```

Der Endpunkt erwartet ein FHIR `Bundle` und uebergibt es an denselben
Send-Service, der auch nach `POST /assessments` verwendet wird.

Request:

```json
{
  "target": "test-fhir-server",
  "bundle": {
    "resourceType": "Bundle",
    "type": "document",
    "entry": [
      {
        "resource": {
          "resourceType": "Composition"
        }
      }
    ]
  }
}
```

Response `202 Accepted`:

```json
{
  "mode": "http",
  "status": "accepted",
  "target": "test-fhir-server",
  "transmissionId": "http-fhir-...",
  "submittedAt": "2026-06-23T12:00:00.000Z",
  "bundleSummary": {
    "generated": true,
    "bundleType": "document",
    "entryCount": 1,
    "resourceTypes": ["Composition"]
  },
  "response": {
    "httpStatus": 201,
    "location": "https://hapi.fhir.org/baseR4/Bundle/123/_history/1",
    "resourceUrl": "https://hapi.fhir.org/baseR4/Bundle/123",
    "resourceId": "123",
    "resourceType": "Bundle"
  }
}
```

Die Quittung enthaelt nur Struktur-Metadaten und keine klinischen Inhalte.
`response.resourceUrl` ist die direkt oeffenbare URL der vom FHIR-Server
gespeicherten Resource.

### HTTP-Konfiguration

Fuer einen echten POST an einen FHIR-Server wird die Umgebung so konfiguriert:

```env
FHIR_ENDPOINT=https://hapi.fhir.org/baseR4/Bundle
FHIR_AUTH_TOKEN=<optional-bearer-token>
FHIR_REQUEST_TIMEOUT_MS=10000
```

`sendFhirBundle(...)` sendet das Bundle mit:

```http
Content-Type: application/fhir+json
Accept: application/fhir+json, application/json
```

Wenn `FHIR_AUTH_TOKEN` gesetzt ist, wird zusaetzlich ein Bearer Token gesendet.
Erfolgreiche HTTP-Statuscodes werden als `status: "accepted"` zurueckgegeben.
Nicht erfolgreiche Antworten oder Verbindungsfehler werden als
`status: "failed"` mit HTTP-Status beziehungsweise Fehlermeldung protokolliert.
Bei erfolgreichen Create-Responses werden `Location` beziehungsweise
`Content-Location` ausgewertet, damit `resourceUrl` und `resourceId` im Log
sichtbar sind.
FHIR `OperationOutcome`-Antworten werden nur zusammengefasst, damit keine
vollstaendigen Antwortkoerper mit klinischen Inhalten in Logs landen.

Relevante Dateien:

- `backend/src/routes/assessment.routes.ts`
- `backend/src/modules/assessment/assessment.service.ts`
- `backend/src/modules/fhir/fhirBundle.ts`
- `backend/src/modules/fhir/fhirSend.service.ts`
- `backend/src/routes/fhir.routes.ts`

## Bundle-Struktur

Das Bundle enthaelt genau vier Ressourcen. Die `Composition` steht an erster
Stelle, weil FHIR Document Bundles dort den Dokumentindex erwarten.

| Reihenfolge | Resource | Zweck |
|---:|---|---|
| 1 | `Composition` | Dokumentindex der HeptaCheck-Ersteinschaetzung |
| 2 | `Patient` | minimale administrative Patientendaten |
| 3 | `Device` | Quellsystem `HeptaCheck` und optional verwendetes KI-Modell |
| 4 | `ClinicalImpression` | Triage-Ergebnis, Begruendungen und lesbarer medizinischer Kontext |

Die Ressourcen referenzieren sich ueber lokale `urn:uuid:<id>`-URLs innerhalb
des Bundles.

## Datenmapping

| Eingabe / Ergebnis | FHIR-Ziel | Hinweis |
|---|---|---|
| `patientData.birthYear` + `birthMonth` | `Patient.birthDate` | reduzierte Praezision `YYYY-MM`, falls Jahr und Monat gueltig sind |
| `patientData.gender` | `Patient.gender` | Mapping auf `male`, `female`, `other` oder `unknown` |
| Name, Adresse, Telefon, Versicherung | nicht gesetzt | bewusst nicht im aktuellen `Patient` enthalten |
| Groesse, Gewicht, Schwangerschaft, Stillen | `ClinicalImpression.note` | als lesbarer Patientenkontext |
| Allergien, Medikamente, Vorerkrankungen | `ClinicalImpression.note` | nur wenn vorhanden |
| ausgewaehlte Symptome | `ClinicalImpression.note` | nummerierte Liste |
| aktive Symptombeschreibungen | `ClinicalImpression.note` | inklusive Details, Messwert und Dauer |
| `result.careLevel` | `ClinicalImpression.finding` und `note` | empfohlene Versorgungsebene |
| `result.recommendedSpecialty` | `ClinicalImpression.note` | falls vorhanden |
| `result.reasons` | `ClinicalImpression.finding.basis` und `note` | Begruendungen der Einschaetzung |
| `result.reviewSummary.professionalSummary` | `ClinicalImpression.summary` | fachliche Zusammenfassung |
| `result.aiModel` | `Device.deviceName` | optional als Modellname |
| `result.createdAt` | `Bundle.timestamp`, `Composition.date`, `ClinicalImpression.date` | Erzeugungszeitpunkt |

## Beispielstruktur

```json
{
  "resourceType": "Bundle",
  "type": "document",
  "entry": [
    {
      "resource": {
        "resourceType": "Composition",
        "title": "HeptaCheck - Medizinische Ersteinschaetzung"
      }
    },
    {
      "resource": {
        "resourceType": "Patient",
        "active": true,
        "gender": "female",
        "birthDate": "1990-01"
      }
    },
    {
      "resource": {
        "resourceType": "Device",
        "status": "active"
      }
    },
    {
      "resource": {
        "resourceType": "ClinicalImpression",
        "status": "completed"
      }
    }
  ]
}
```

Das Beispiel zeigt nur die Struktur. Das echte Bundle enthaelt UUIDs,
Referenzen, Zeitstempel, Triage-Ergebnis und klinische Notizen.

## Datenschutz und Logging

FHIR Bundles enthalten medizinische Inhalte und Patientenkontext. Sie duerfen
deshalb nicht ungefiltert in Produktionslogs geschrieben werden.

Fuer normale Logs ist `summarizeFhirBundleForLog(bundle)` vorgesehen. Diese
Funktion gibt nur Struktur-Metadaten zurueck:

```json
{
  "generated": true,
  "bundleType": "document",
  "entryCount": 4,
  "resourceTypes": [
    "Composition",
    "Patient",
    "Device",
    "ClinicalImpression"
  ]
}
```

Das komplette Bundle wird im normalen Backend-Flow nicht mehr ungefiltert in
die Logs geschrieben. Fuer Nachweise und Debugging dienen der FHIR-Server, die
Sendequittung und die inhaltsarme Bundle-Zusammenfassung.

## Grenzen der aktuellen Implementierung

- Es gibt aktuell keinen separaten FHIR-Export-Endpunkt fuer das zuletzt
  erzeugte Bundle.
- Echte FHIR-Server koennen je nach Profil, Endpoint und Bundle-Typ weitere
  Anforderungen stellen.
- Das Bundle wird nicht persistiert.
- Es findet noch keine Validierung gegen ein konkretes FHIR-Profil statt.
- Medizinische Inhalte werden ueber lesbare deutsche Texte transportiert, noch
  nicht ueber terminologische Codes wie SNOMED CT, LOINC oder ICD.
- Referenzen sind lokale `urn:uuid`-Referenzen innerhalb des Bundles.
- Consent-, Zugriffs- und Uebermittlungsregeln fuer externe Systeme sind noch
  nicht modelliert.

## Tests

Die bestehenden Unit-Tests pruefen:

- Erzeugung eines `document` Bundles.
- Reihenfolge und Typen der enthaltenen Ressourcen.
- Minimale Patientendaten ohne direkte Kontaktdaten.
- Ablage des medizinischen Ergebnisses in `ClinicalImpression`.
- Inhaltsarme Log-Zusammenfassung ohne klinische Details.

Ausfuehren:

```bash
npm --prefix backend test -- tests/unit/modules/fhir/fhirBundle.test.ts
```
