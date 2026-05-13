# Symptom-Extraction und Triage testen

Diese Anleitung beschreibt, wie die beiden Backend-Funktionen lokal getestet werden:

- `POST /api/v1/symptoms/extraction`
- `POST /api/v1/triage/evaluate`

## Voraussetzungen

Das Backend benötigt Zugriff auf das KI-Modell.

Die KI-URL muss per `http://` oder `https://` erreichbar sein.

Bestehende lokale `.env.local`-Dateien mit den älteren Variablennamen `Base_URL` und `API_KEY`
werden weiterhin unterstützt. Bevorzugt werden aber `AI_API_URL` und `AI_API_KEY`.
Beispiel env.local:

NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173/
AI_API_URL=url
AI_API_KEY=key
AI_MODEL=medgemma:4b

## Erreichbarkeit prüfen

Zuerst prüfen, ob das Backend läuft:

```bash
curl http://localhost:3000/health
```

Erwartete Antwort:

```json
{"status":"ok"}
```

## 1. Symptom-Extraction testen

Mit diesem Request wird Freitext an die Symptom-Extraction geschickt:

```bash
curl -X POST http://localhost:3000/api/v1/symptoms/extraction -H 'Content-Type: application/json' --data '{"text":"Ich habe seit ein paar Tagen starke Kopfschmerzen, etwa 7 von 10, und leichte Übelkeit."}'
```

Erwartet wird eine strukturierte Liste mit bis zu drei Symptomen, zum Beispiel:

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

## 2. Triage direkt mit strukturierter Symptomliste testen

Mit diesem Request wird die Triage direkt mit strukturierten Symptomen aufgerufen:

```bash
curl -X POST http://localhost:3000/api/v1/triage/evaluate -H 'Content-Type: application/json' --data '{"patientData":{"birthMonth":"05","birthYear":"1988","height":"175","weight":"78","gender":"männlich","isPregnant":false,"isBreastfeeding":false,"allergies":"","medications":"","substanceInfluence":"Nein","recentAbroad":false,"recentAbroadDetails":"","conditions":[]},"symptoms":[{"region":"Kopf","painLevel":7,"duration":"days"},{"region":"Allgemein","side":"Übelkeit/Schwindel"}]}'
```

Erwartet wird eine Antwort mit `careLevel`, `recommendedSpecialty` und `reasons`, zum Beispiel:

```json
{
  "careLevel": "doctor",
  "recommendedSpecialty": "neurology",
  "reasons": [
    "Die Beschwerden sollten zeitnah ärztlich abgeklärt werden."
  ]
}
```

## 3. Triage direkt mit Freitext testen

Die Triage kann auch direkt mit Freitext getestet werden. In diesem Fall ruft die Triage intern zuerst die Symptom-Extraction auf und bewertet danach das Ergebnis.

```bash
curl -X POST http://localhost:3000/api/v1/triage/evaluate -H 'Content-Type: application/json' --data '{"patientData":{"birthMonth":"05","birthYear":"1988","height":"175","weight":"78","gender":"männlich","isPregnant":false,"isBreastfeeding":false,"allergies":"","medications":"","substanceInfluence":"Nein","recentAbroad":false,"recentAbroadDetails":"","conditions":[]},"text":"Ich habe seit ein paar Tagen starke Kopfschmerzen, etwa 7 von 10, und leichte Übelkeit."}'
```

Erwartet wird wieder eine Triage-Antwort:

```json
{
  "careLevel": "doctor",
  "recommendedSpecialty": "neurology",
  "reasons": [
    "Die Beschwerden sollten zeitnah ärztlich abgeklärt werden."
  ]
}
```

## Sinnvolle Testfälle

### Selfcare

```bash
curl -X POST http://localhost:3000/api/v1/triage/evaluate -H 'Content-Type: application/json' --data '{"text":"Seit heute leichte Kopfschmerzen, 2 von 10."}'
```

### Doctor

```bash
curl -X POST http://localhost:3000/api/v1/triage/evaluate -H 'Content-Type: application/json' --data '{"text":"Ich habe seit ein paar Tagen starke Bauchschmerzen, 7 von 10."}'
```

### Emergency

```bash
curl -X POST http://localhost:3000/api/v1/triage/evaluate -H 'Content-Type: application/json' --data '{"text":"Ich habe seit heute sehr starke Brustschmerzen, 10 von 10."}'
```

## Negativtests

Leerer Request an Symptom-Extraction:

```bash
curl -i -X POST http://localhost:3000/api/v1/symptoms/extraction -H 'Content-Type: application/json' --data '{}'
```

Leerer Request an Triage:

```bash
curl -i -X POST http://localhost:3000/api/v1/triage/evaluate -H 'Content-Type: application/json' --data '{}'
```

## Hinweise zur Fehlersuche

- Wenn `/health` funktioniert, läuft das Backend.
- Wenn die Shell mit `>` oder `quote>` auf weitere Eingaben wartet, ist meist ein Anführungszeichen offen geblieben. Mit `Ctrl+C` abbrechen und den Befehl komplett neu einfügen.
- Wenn `symptom-extraction` oder `triage` einen `500`-Fehler liefern, liegt das meist an der KI-Anbindung oder am Modell.
- Wenn eine Meldung mit `Incorrect API key provided: dummy` erscheint, läuft noch ein alter Prozess ohne die gesetzten Umgebungsvariablen oder ohne `AI_API_KEY`/`API_KEY`.
- Wenn `AI_API_URL is missing` erscheint, prüfe `AI_API_URL` oder den Legacy-Key `Base_URL` in `.env.local`.
- Wenn Port `3000` bereits belegt ist, muss der alte Prozess zuerst beendet werden.
