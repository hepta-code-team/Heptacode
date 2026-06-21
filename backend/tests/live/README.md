# Live-Evaluation der KI-Triage

Diese Tests rufen die konfigurierten externen KI-Modelle auf. Sie sind bewusst
von den deterministischen Unit- und Integrationstests getrennt.
Die Datei `vitest.live.config.ts` aktiviert die Live-Tests und enthält die dafür
benötigten Timeouts. Die npm-Befehle funktionieren dadurch unter Windows und
Linux ohne zusätzliches Runner-Skript.

## Test-Suites

- `triage-specialty.live.test.ts` prüft die Zuordnung zu allen unterstützten
  fachärztlichen Disziplinen.
- `triage-plausibility.live.test.ts` prüft die Versorgungsebene für Emergency-,
  Doctor-, Selfcare- und False-Positive-Fälle.

Die Plausibilitäts-Suite wertet einen Fall nur dann als korrekt, wenn die
erwartete Versorgungsebene direkt vom KI-Ablauf zurückgegeben wird. Ein Ergebnis
mit `aiUnavailable: true` nach einer abgelehnten Plausibilitätsprüfung wird als
Fehler gewertet. Wenn beide konfigurierten KI-Modelle nicht erreichbar sind,
bricht die Suite vor der Fallauswertung ab und berechnet keine irreführende
Korrektheitsquote.

## Befehle

Alle Live-Evaluationen der KI-Triage ausführen:

```powershell
npm run test:ai-triage
```

Nur die Zuordnung der Fachrichtungen ausführen:

```powershell
npm run test:ai-triage:specialties
```

Nur die Versorgungsebenen und Plausibilitätsfälle ausführen:

```powershell
npm run test:ai-triage:plausibility
```

Das Backend lädt die KI-Konfiguration aus `.env.local` oder `.env`. Jeder Lauf
gibt das Ergebnis für jeden Fall sowie eine gesamte Korrektheitsquote und die
Quoten der einzelnen Kategorien aus. Vor und nach Prompt-Änderungen sollten
dieselben Testfälle verwendet werden, damit sich das Modellverhalten vergleichen
lässt.
