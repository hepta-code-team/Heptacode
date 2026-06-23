# Frontend-Tests

Die Frontend-Tests verwenden **Vitest** und **React Testing Library**. Sie laufen
in einer simulierten Browserumgebung (`jsdom`).

## Was wird getestet?

- Einzelne Komponenten, zum Beispiel Modals, Symptom-Auswahl und Ergebnis-Karten.
- Ganze Seiten und typische Nutzerabläufe, etwa Dateneingabe, Validierung,
  Navigation und PDF-Download.
- Gemeinsamer Zustand im `AssessmentContext`.
- Reine Logik wie API-Client, Empfehlungen und Formularverarbeitung.

Backend, KI, Standortdienste und Browserfunktionen werden in den Tests
nachgebildet (gemockt). Deshalb wird kein echtes Backend benötigt.

## Wie sind die Tests aufgebaut?

Ein Test rendert zuerst eine Komponente oder Seite. Danach werden Aktionen eines
Nutzers simuliert, zum Beispiel:

```tsx
render(<PatientDataPage />);
await user.click(screen.getByRole("button", { name: "Weiter" }));
expect(screen.getByText("Bitte Geschlecht auswählen.")).toBeInTheDocument();
```

Anschließend prüft der Test, ob die erwartete Anzeige, Navigation oder
Datenübertragung stattgefunden hat.

## Befehle

Im Ordner `frontend`:

```bash
npm test                 # Tests im Beobachtungsmodus
npm test -- --run        # Alle Tests einmal ausführen
npm run test:coverage -- --run
npm run check            # TypeScript prüfen
```
