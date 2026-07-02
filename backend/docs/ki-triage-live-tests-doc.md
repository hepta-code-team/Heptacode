# Live-Tests der KI-Triage

## Ziel

Die Live-Tests pruefen die KI-Triage gegen die tatsaechlich konfigurierten
externen Modelle. Sie ergaenzen die deterministischen Unit- und
Integrationstests, ersetzen diese aber nicht.

Unit- und Integrationstests testen die lokale Backend-Logik mit gemockten
KI-Antworten. Die Live-Tests senden dagegen echte Triage-Faelle an die KI. Damit
kann nach Prompt-, Modell- oder Konfigurationsaenderungen nachvollzogen werden,
ob die Qualitaet der KI-Antworten besser, schlechter oder unveraendert ist.

Die Tests sind bewusst separat konfiguriert, weil sie:

- echte KI-Endpunkte aufrufen
- laenger dauern als normale Tests
- von Modellverfuegbarkeit und Antwortverhalten abhaengen
- nicht bei jedem lokalen Testlauf automatisch laufen sollen

Die technische Konfiguration liegt in [backend/vitest.live.config.ts]. Die npm-
Befehle funktionieren dadurch unter Windows und Linux ohne zusaetzliches
Runner-Skript.

## Voraussetzungen

Das Backend laedt die KI-Konfiguration aus `.env.local` oder `.env`.

Relevante Variablen sind:

- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `FALLBACK_MODEL`

Die Live-Suites aktivieren die Fallauswertung nur, wenn die Live-Testumgebung
gesetzt ist. Die npm-Skripte setzen die passende Vitest-Konfiguration; die Tests
selbst verwenden intern `RUN_AI_TRIAGE_EVAL`, damit sie ausserhalb der
Live-Konfiguration uebersprungen werden koennen.

## Test-Suites

### Fachrichtungs-Zuordnung

Datei: [backend/tests/live/triage-specialty.live.test.ts]

Diese Suite prueft, ob die KI fuer typische Beschwerdebilder die erwartete
fachaerztliche Disziplin auswaehlt. Die Testfaelle liegen in
[backend/tests/fixtures/triageSpecialtyCases.ts].

Geprueft wird insbesondere:

- erwartete Versorgungsebene `specialist`
- erwartete `recommendedSpecialty`
- Abdeckung aller unterstuetzten fachaerztlichen Disziplinen

### Plausibilitaetsfaelle

Datei: [backend/tests/live/triage-plausibility.live.test.ts]

Diese Suite prueft medizinisch relevante Triage-Faelle ueber mehrere
Versorgungsebenen hinweg. Die Testfaelle liegen in
[backend/tests/fixtures/triagePlausibilityLiveCases.ts].

Abgedeckte Kategorien:

- `emergency`
- `specialist`
- `doctor`
- `selfcare`
- `false_positive`

Die Suite prueft:

- direkte KI-Einstufung
- finales Systemergebnis nach Plausibilitaetspruefung und Fallback
- Begruendung der KI-Antwort
- moegliche Plausibilitaetsfehler
- Kategoriequoten und Gesamtquoten

### Freitext-Notfallfaelle

Datei: [backend/tests/live/triage-freetext.live.test.ts]

Diese Suite prueft, ob eindeutig formulierte Notfallsymptome auch nach
Freitext-Extraktion korrekt als `emergency` eingestuft werden. Die Testfaelle
liegen in [backend/tests/fixtures/triageFreetextLiveCases.ts].

Damit wird nicht nur die Triage selbst, sondern auch der Zusammengang aus
Freitext, Symptom-Extraction und anschliessender Triage sichtbar.

## Auswertung der Plausibilitaets-Suite

Die Plausibilitaets-Suite unterscheidet bewusst zwischen direkter KI-Antwort und
finalem Systemergebnis.

### `directAi`

`directAi` ist die Trefferquote der normalisierten KI-Antwort vor der lokalen
Plausibilitaetspruefung.

Diese Quote zeigt, ob Prompt und Modell selbst die erwartete Versorgungsebene
treffen.

### `finalSystem`

`finalSystem` ist die Trefferquote des finalen Backend-Ergebnisses nach
Plausibilitaetspruefung und Sicherheitsfallback.

Diese Quote zeigt, ob das Gesamtsystem am Ende die erwartete Versorgungsebene
liefert. Sie kann besser sein als `directAi`, wenn eine falsche KI-Antwort lokal
korrigiert wird. Sie kann aber auch schlechter sein, wenn eine eigentlich
korrekte KI-Antwort faelschlicherweise verworfen wird.

### `reasoning`

`reasoning` prueft, ob die KI-Begruendung sprachlich zur erwarteten
Versorgungsebene passt. Dadurch werden Prompt-Aenderungen nicht nur anhand der
reinen Einstufung, sondern auch anhand der Erklaerbarkeit bewertet.

## Fehler- und Fallback-Verhalten

Ein Live-Fall gilt nicht automatisch als erfolgreich, nur weil das finale
Backend einen Sicherheitsfallback liefert.

Wichtig ist:

- `aiUnavailable: true` zeigt, dass die KI-Antwort nicht direkt genutzt werden
  konnte.
- `fallbackType: 'availability'` weist auf technische KI-Verfuegbarkeit hin.
- `fallbackType: 'plausibility'` zeigt, dass eine formal erhaltene KI-Antwort
  durch die Plausibilitaetspruefung verworfen wurde.
- `plausibilityIssues` enthaelt die lokal erkannten Plausibilitaetsgruende.

Wenn beide konfigurierten KI-Modelle nicht erreichbar sind, bricht die Suite vor
der Fallauswertung ab. Dadurch wird keine irrefuehrende Korrektheitsquote
berechnet.

## Nachvollziehbarkeit im Terminal

Jeder Live-Testfall gibt Diagnoseinformationen aus, unter anderem:

- Fall-ID
- Kategorie
- erwartete Versorgungsebene
- direkte KI-Versorgungsebene
- finale System-Versorgungsebene
- verwendetes KI-Modell
- KI-Begruendung
- finale Begruendung
- Plausibilitaetsfehler

Diese Ausgabe ist bewusst ausfuehrlich, damit einzelne Faelle bei einer
Prompt-Aenderung nachvollziehbar erklaert werden koennen.

## Befehle

Alle Live-Evaluationen der KI-Triage ausfuehren:

```powershell
npm run test:ai-triage
```

Nur die Zuordnung der Fachrichtungen ausfuehren:

```powershell
npm run test:ai-triage:specialties
```

Nur die Versorgungsebenen und Plausibilitaetsfaelle ausfuehren:

```powershell
npm run test:ai-triage:plausibility
```

Nur die Freitext-Notfallfaelle ausfuehren:

```powershell
npm run test:ai-triage:freetext
```

## Einzelne Faelle ausfuehren

### Einzelner Plausibilitaetsfall

```powershell
$env:TRIAGE_LIVE_CASE_ID="doctor-hyperthyroidism-signs"
npm run test:ai-triage:plausibility
```

Die Fall-IDs stehen in:

```txt
backend/tests/fixtures/triagePlausibilityLiveCases.ts
```

Nach dem Lauf kann die Auswahl wieder entfernt werden:

```powershell
Remove-Item Env:TRIAGE_LIVE_CASE_ID
```

### Einzelner Freitextfall

```powershell
$env:TRIAGE_FREETEXT_LIVE_CASE_ID="freetext-emergency-chest-pain"
npm run test:ai-triage:freetext
```

Die Fall-IDs stehen in:

```txt
backend/tests/fixtures/triageFreetextLiveCases.ts
```

Nach dem Lauf kann die Auswahl wieder entfernt werden:

```powershell
Remove-Item Env:TRIAGE_FREETEXT_LIVE_CASE_ID
```

## Typischer Einsatz

Die Live-Tests sollten vor allem dann ausgefuehrt werden, wenn sich eines dieser
Elemente aendert:

- Triage-Prompt
- KI-Modell
- KI-Timeouts oder Fallback-Modell
- Plausibilitaetslogik
- Symptom-Extraction fuer Freitextfaelle
- medizinische Testfall-Fixtures

Vor und nach Prompt-Aenderungen sollten dieselben Testfaelle verwendet werden,
damit sich das Modellverhalten vergleichen laesst.

## Einordnung

Die Live-Tests sind kein Ersatz fuer medizinische Validierung. Sie sind ein
technisches Qualitaetsinstrument, um KI-Verhalten reproduzierbarer zu beobachten
und Regressionen bei Prompting, Modellverhalten oder Backend-Fallbacks frueh zu
erkennen.
