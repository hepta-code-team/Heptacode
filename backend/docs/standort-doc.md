## Modul `places` (Standortsuche)

### Zuständigkeiten

Das Modul `places` sucht medizinische Einrichtungen in der Nähe eines vom Frontend gelieferten Standorts. Es übernimmt:

- Validierung von Koordinaten und Versorgungsebene
- Übersetzung der Versorgungsempfehlung in eine Google-Places-Suchanfrage
- serverseitigen Zugriff auf die Google Places API
- Filterung und Normalisierung externer Treffer
- Berechnung der Luftlinienentfernung
- Rückgabe der fünf nächstgelegenen geeigneten Einrichtungen

Der Browser sendet seinen Standort an das Backend. Das Backend hält den Google-API-Key geheim und gibt ein für das Frontend vereinheitlichtes Datenmodell zurück.

### Ziel

Ziel des Moduls ist es, aus Standort und Versorgungsempfehlung eine kleine, nach Entfernung sortierte Liste passender Anlaufstellen für das Frontend zu erzeugen. Die Route kapselt dabei den Zugriff auf Google Places und verhindert, dass der API-Key an den Browser ausgeliefert wird.

### Relevante Dateien

- Route und gesamte Backend-Logik: `backend/src/routes/places.routes.ts`
- Umgebungsvariable: `backend/src/config/env.ts`
- Integrationstest: `backend/tests/integration/routes/places.routes.test.ts`
- Frontend-Anbindung: `frontend/src/features/results/NearbyPracticeSearch.tsx`

Für dieses Modul existiert derzeit kein separater Service und kein exportiertes gemeinsames Request-/Response-Schema. Schema, Google-Mapping und Normalisierung liegen direkt in der Route.

### Konfiguration

Die Standortsuche benötigt:

```env
GOOGLE_MAPS_API_KEY=<google-places-api-key>
```

Der Key wird ausschließlich serverseitig als Header `X-Goog-Api-Key` an Google gesendet. Fehlt er, beantwortet die Route die Suche mit HTTP `503`.

### HTTP-Endpunkt

```http
POST /places/nearby
Content-Type: application/json
```

Wichtig: Dieser Endpunkt besitzt aktuell – anders als die fachlichen Triage- und PDF-Endpunkte – kein `/api/v1`-Präfix.

### Request-Schema

```ts
interface NearbyPlacesPayload {
  latitude: number
  longitude: number
  careLevel: 'selfcare' | 'doctor' | 'specialist' | 'emergency'
  specialtyLabel?: string
}
```

#### Validierung

- `latitude` und `longitude` sind Pflicht und müssen endliche Zahlen sein.
- `careLevel` ist Pflicht und enum-beschränkt.
- `specialtyLabel` ist optional.
- Das aktuelle Schema prüft nicht, ob der Breitengrad zwischen `-90` und `90` und der Längengrad zwischen `-180` und `180` liegt.
- `specialtyLabel` wird fachlich nur bei `careLevel: "specialist"` verwendet.

### Abbildung auf Google Places

| `careLevel` | Textsuche | `includedType` | Radius der Standortgewichtung | Strikte Typfilterung |
|---|---|---|---:|---:|
| `selfcare` | `Apotheke` | `pharmacy` | 30 km | ja |
| `doctor` | `Hausarzt Allgemeinmedizin Arztpraxis` | `doctor` | 30 km | ja |
| `specialist` mit Label | `<specialtyLabel> Arztpraxis` | `doctor` | 50 km | nein |
| `specialist` ohne Label | `Hausarzt Allgemeinmedizin Arztpraxis` | `doctor` | 50 km | nein |
| `emergency` | `Notaufnahme Krankenhaus` | `hospital` | 30 km | ja |

Der Radius wird Google als `locationBias` übergeben. Er ist eine Gewichtung und keine garantierte harte Entfernungsgrenze.

Weitere feste Parameter der Google-Anfrage:

- API: `POST https://places.googleapis.com/v1/places:searchText`
- maximal zehn Roh-Treffer (`pageSize: 10`)
- Sprache: Deutsch (`languageCode: de`)
- Region: Deutschland (`regionCode: DE`)
- angeforderte Felder: ID, Name, Adresse, Koordinaten, Geschäftsstatus, Typen und aktuelle Öffnungszeiten

### Response-Schema

#### Erfolg: `200 OK`

```ts
interface NearbyPlacesResponse {
  facilities: Array<{
    id: string
    name: string
    hasKnownName: true
    type: string
    latitude: number
    longitude: number
    openingHours: ''
    openingHoursText: string[]
    isOpenNow?: boolean
    address: string
    priority: 'recommended'
    distanceMeters: number
  }>
}
```

Beispiel:

```json
{
  "facilities": [
    {
      "id": "google-place-1",
      "name": "Neurologie am Park",
      "hasKnownName": true,
      "type": "Neurologie",
      "latitude": 49.487,
      "longitude": 8.466,
      "openingHours": "",
      "openingHoursText": ["Montag: 08:00–18:00"],
      "isOpenNow": true,
      "address": "Parkstraße 1, 68161 Mannheim",
      "priority": "recommended",
      "distanceMeters": 434
    }
  ]
}
```

Eine erfolgreiche Suche ohne geeignete Treffer liefert:

```json
{
  "facilities": []
}
```

### Ablauf in der Route

#### 1. Request-Validierung

Die Route prüft den Body mit `nearbyPlacesPayloadSchema`. Ungültige Requests werden vom globalen Error-Handler als HTTP `400` ausgegeben.

#### 2. Auswahl der Suchparameter

Aus `careLevel` und optionalem `specialtyLabel` werden Suchtext, Google-Typ, Typfilterung und Suchradius abgeleitet.

#### 3. Google-Places-Anfrage

Das Backend sendet eine Textsuche mit deutschem Sprach- und Regionskontext an Google Places. Der API-Key bleibt dabei im Backend.

#### 4. Normalisierung und Rückgabe

Ein Google-Treffer wird nur übernommen, wenn er Folgendes besitzt:

- ID
- Anzeigename
- formatierte Adresse
- endliche Koordinaten
- keinen Geschäftsstatus `CLOSED_PERMANENTLY`

Danach werden die Treffer:

1. in das Frontend-Datenmodell umgewandelt,
2. per Haversine-Formel nach Luftlinienentfernung sortiert,
3. auf die fünf nächsten Einrichtungen begrenzt.

Der ausgegebene Typ lautet je nach Ergebnis `Apotheke`, `Notaufnahme`, das übergebene Fachrichtungslabel oder `Hausarzt`. `openingHours` bleibt für Google-Treffer leer; strukturierte Wochentexte stehen in `openingHoursText`.

### Fehlerverhalten

| Status | Response | Ursache |
|---|---|---|
| `400` | globaler `VALIDATION_ERROR` | Request entspricht nicht dem Zod-Schema |
| `503` | `{ "message": "Google Maps API key is not configured." }` | `GOOGLE_MAPS_API_KEY` fehlt |
| `429` | `{ "message": "Google Places is unavailable." }` | Google meldet ein Rate Limit |
| `502` | `{ "message": "Google Places is unavailable." }` | Google antwortet mit einem anderen Fehlerstatus |
| `500` | globaler `INTERNAL_SERVER_ERROR` | Netzwerkfehler oder unerwarteter interner Fehler |

Fehlerdetails aus der Google-Antwort werden serverseitig als Warnung protokolliert, aber nicht an den Client weitergegeben.

## API-Beispiele

### Facharztpraxis

```bash
curl -X POST http://localhost:3000/places/nearby \
  -H 'Content-Type: application/json' \
  --data '{
    "latitude": 49.487,
    "longitude": 8.46,
    "careLevel": "specialist",
    "specialtyLabel": "Neurologie"
  }'
```

### Notaufnahme

```bash
curl -X POST http://localhost:3000/places/nearby \
  -H 'Content-Type: application/json' \
  --data '{
    "latitude": 49.487,
    "longitude": 8.46,
    "careLevel": "emergency"
  }'
```

### Apotheke

```bash
curl -X POST http://localhost:3000/places/nearby \
  -H 'Content-Type: application/json' \
  --data '{
    "latitude": 49.487,
    "longitude": 8.46,
    "careLevel": "selfcare"
  }'
```

## Zusammenspiel mit dem Frontend

`NearbyPracticeSearch.tsx` übergibt den aktuellen Browserstandort und die Versorgungsempfehlung an `/places/nearby`. Für Facharzt-Empfehlungen wird die erste empfohlene Fachrichtung in ein deutsches `specialtyLabel` übersetzt.

Das Frontend enthält daneben eine eigene OpenStreetMap-/Overpass-Suche. Diese läuft direkt im Browser und ist nicht Teil des Backend-Moduls `places`. Bei Änderungen muss daher geprüft werden, ob Google- und OSM-Treffer weiterhin dasselbe `Facility`-Modell erfüllen.

## Betrieb, Debugging und Grenzen

### Datenschutz und Grenzen

- Der Endpunkt besitzt aktuell keine Authentifizierung oder Autorisierung.
- Die Koordinaten werden zur Suche an Google Places weitergegeben.
- Das Modul persistiert den Standort nicht selbst.
- Die Entfernung ist Luftlinie und keine Straßen-, Fahrzeit- oder Routendistanz.
- Öffnungszeiten und der Status `isOpenNow` stammen von Google und können fehlen oder veraltet sein.
- Die Route prüft keine medizinische Eignung einzelner Einrichtungen.
- Der Endpunkt implementiert kein eigenes Caching, Timeout und Retry.
- Der Suchradius ist nur eine Google-Standortgewichtung; Treffer können außerhalb liegen.

### Debugging-Hinweise

Bei Problemen sollten folgende Punkte geprüft werden:

- Ist `GOOGLE_MAPS_API_KEY` im Backend gesetzt?
- Ist die Google Places API für den verwendeten Key aktiviert?
- Sind Abrechnung, Quoten und Key-Einschränkungen korrekt konfiguriert?
- Verwendet das Frontend den aktuellen Pfad `/places/nearby` ohne `/api/v1`?
- Sind `latitude`, `longitude` und `careLevel` im Request vorhanden?
- Liefert Google die im `X-Goog-FieldMask` angeforderten Felder?
- Handelt es sich um einen Google-Fehler, ein Rate Limit oder einen Netzwerkfehler?

### Tests

```bash
cd backend
npm test -- tests/integration/routes/places.routes.test.ts
```

Die Integrationstests prüfen die Normalisierung der Google-Treffer sowie Sortierung und Begrenzung auf die fünf nächsten Einrichtungen. Die Google API wird dabei gemockt; für die Tests ist kein echter API-Key erforderlich.

### Erweiterungspunkte

Sinnvolle Weiterentwicklungen wären:

- ein gemeinsames Request-/Response-Schema für Frontend und Backend
- Versionierung des Endpunkts unter `/api/v1`
- Wertebereichsprüfung für geografische Koordinaten
- Timeout, Retry und kurzfristiges Caching für Google-Anfragen
- ein expliziter Service statt der gesamten Logik im Route-Handler
- klar definierte Zusammenführung von Google- und OSM-Treffern

## Fazit

Das Modul `places` übersetzt eine Versorgungsempfehlung und einen Browserstandort in normalisierte Einrichtungstreffer. Google Places übernimmt die externe Suche; das Backend schützt den API-Key, filtert unvollständige Treffer und liefert höchstens fünf nach Luftlinie sortierte Ergebnisse über `POST /places/nearby`.
