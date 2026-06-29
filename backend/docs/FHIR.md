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
| Externer Versand | keiner |
| Hauptdatei | `backend/src/modules/fhir/fhirBundle.ts` |
| Tests | `backend/tests/unit/modules/fhir/fhirBundle.test.ts` |

## Ablauf im Backend

1. `POST /assessments` validiert den `AssessmentPayload`.
2. `evaluateAssessmentWithAi` erzeugt das fachliche `AssessmentResult`.
3. `buildFhirBundle(payload, result)` baut daraus ein FHIR Document Bundle.
4. Die Route loggt eine strukturierte, inhaltsarme Zusammenfassung des Bundles.
5. Die HTTP-Antwort bleibt das normale Assessment-Ergebnis; das FHIR Bundle wird
   aktuell nicht als Response ausgeliefert.

Relevante Dateien:

- `backend/src/routes/assessment.routes.ts`
- `backend/src/modules/assessment/assessment.service.ts`
- `backend/src/modules/fhir/fhirBundle.ts`

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

`formatFhirBundleForDebugLog(bundle)` serialisiert dagegen das komplette Bundle
inklusive klinischer Inhalte. Diese Funktion ist nur fuer lokale Entwicklung
und Showcase-Debugging gedacht und sollte vor produktivem Einsatz entfernt oder
per Entwicklungsflag abgesichert werden.

## Grenzen der aktuellen Implementierung

- Es gibt aktuell keinen separaten FHIR-Export-Endpunkt.
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
