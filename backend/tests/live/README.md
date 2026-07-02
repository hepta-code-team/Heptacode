# Live-Evaluation der KI-Triage

Diese Tests rufen die konfigurierten externen KI-Modelle auf. Sie sind bewusst
von den deterministischen Unit- und Integrationstests getrennt.
Die Datei `vitest.live.config.ts` aktiviert die Live-Tests und enthaelt die dafuer
benoetigten Timeouts. Die npm-Befehle funktionieren dadurch unter Windows und
Linux ohne zusaetzliches Runner-Skript.

## Test-Suites

- `triage-specialty.live.test.ts` prueft die Zuordnung zu allen unterstuetzten
  fachaerztlichen Disziplinen.
- `triage-plausibility.live.test.ts` prueft die Versorgungsebene fuer Emergency-,
  Specialist-, Doctor-, Selfcare- und False-Positive-Faelle. Zusaetzlich wird
  geprueft, ob die KI-Begruendung zur erwarteten Versorgungsebene passt.
- `triage-freetext.live.test.ts` prueft, ob eindeutig genannte
  Notfallsymptome auch nach Freitext-Extraktion als Emergency eingestuft werden
  und ob die KI-Begruendung zur erwarteten Versorgungsebene passt.

Die Plausibilitaets-Suite wertet einen Fall nur dann als korrekt, wenn die
erwartete Versorgungsebene direkt vom KI-Ablauf zurueckgegeben wird. Ein Ergebnis
mit `aiUnavailable: true` nach einer abgelehnten Plausibilitaetspruefung wird als
Fehler gewertet. Wenn beide konfigurierten KI-Modelle nicht erreichbar sind,
bricht die Suite vor der Fallauswertung ab und berechnet keine irrefuehrende
Korrektheitsquote.

Die Zusammenfassung enthaelt zwei getrennte Quoten:

- `directAi`: Trefferquote der normalisierten KI-Antwort vor der
  Plausibilitaetspruefung.
- `finalSystem`: Trefferquote des Ergebnisses nach Plausibilitaetspruefung und
  Sicherheitsfallback.

Dadurch wird sichtbar, ob eine Prompt-Aenderung die KI selbst verbessert oder ob
das Backend eine fehlerhafte KI-Einstufung erst durch den Fallback korrigiert.

## Nachvollziehbarkeit

Jeder Live-Testfall gibt die erwartete Versorgungsebene, das tatsaechliche
Ergebnis, die verwendete KI-Begruendung und moegliche Plausibilitaetsfehler aus.
Die Freitext-Suite prueft zusaetzlich, ob Notfallsymptome nach der
Freitext-Extraktion weiterhin als Emergency eingestuft werden.

Die `reasoning`-Quote zeigt, ob die KI-Begruendung sprachlich zur erwarteten
Versorgungsebene passt. Dadurch koennen Prompt-Aenderungen nicht nur anhand der
reinen Einstufung, sondern auch anhand der Erklaerbarkeit der Antwort verglichen
werden.

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

Einen einzelnen Plausibilitaetsfall per ID ausfuehren:

```powershell
$env:TRIAGE_LIVE_CASE_ID="doctor-hyperthyroidism-signs"
npm run test:ai-triage:plausibility
```

Die Fall-IDs stehen in:

```txt
backend/tests/fixtures/triagePlausibilityLiveCases.ts
```

Wenn `TRIAGE_LIVE_CASE_ID` gesetzt ist, wird nur dieser Fall ausgewertet. Bei
einer unbekannten ID bricht die Suite mit einer Fehlermeldung ab. Nach dem Lauf
kann die Auswahl wieder entfernt werden:

```powershell
Remove-Item Env:TRIAGE_LIVE_CASE_ID
```

Einen einzelnen Freitextfall per ID ausfuehren:

```powershell
$env:TRIAGE_FREETEXT_LIVE_CASE_ID="freetext-emergency-chest-pain"
npm run test:ai-triage:freetext
```

Die Freitext-Fall-IDs stehen in:

```txt
backend/tests/fixtures/triageFreetextLiveCases.ts
```

Nach dem Lauf kann die Auswahl wieder entfernt werden:

```powershell
Remove-Item Env:TRIAGE_FREETEXT_LIVE_CASE_ID
```

Das Backend laedt die KI-Konfiguration aus `.env.local` oder `.env`. Jeder Lauf
gibt das Ergebnis fuer jeden Fall sowie eine gesamte Korrektheitsquote und die
Quoten der einzelnen Kategorien aus. Vor und nach Prompt-Aenderungen sollten
dieselben Testfaelle verwendet werden, damit sich das Modellverhalten vergleichen
laesst.
