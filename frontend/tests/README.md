# Frontend Tests

This frontend currently uses Vitest + React Testing Library.

The goal is not maximum coverage by number. Tests should protect user-visible behavior: navigation, form validation, input changes, mocked backend/AI flows, result rendering, and relevant payloads.

## Commands

```bash
npm test
npm test -- --run
npm run test:coverage -- --run
npm run check
```

## Covered Areas

- Landing disclaimer, emergency info, and navigation.
- Patient-data validation, correction, saving, and navigation.
- Medical-data inputs such as allergies, medication, travel, smoking, pregnancy, and conditions.
- Symptom selection, removal, free-text AI extraction with mocks, and invalid input handling.
- Symptom details, duration selection, submit behavior, and result navigation.
- Result page rendering, explanation toggle, summary editing, reset, and PDF export payload.
- Interactive symptom/result components where they affect user behavior.
- Assessment context, API client error handling, and recommendation logic.

## Mocking

Backend and AI boundaries are mocked in frontend tests:

- `/api/v1/symptoms/extraction`
- `/api/v1/symptoms/validation`
- `/assessments`
- `/api/v1/pdf/export`

Frontend tests should verify that the UI sends and handles the expected data shape. Real backend behavior belongs in backend or integration tests.


## Testing Style

Prefer user-facing queries:

```ts
screen.getByRole('button', { name: 'Weiter' })
screen.getByLabelText('Geburtsjahr')
await screen.findByText('Fehlermeldung')
```

Use:

- `getBy...` when the element must exist immediately.
- `queryBy...` when checking absence.
- `findBy...` when waiting for async UI.

The correct Jest-DOM matcher is:

```ts
expect(element).toBeInTheDocument();
```

## Not Tested On Purpose

These are intentionally not covered unless a bug appears:

- Tailwind classes and purely visual styling.
- Every SVG path in the anatomy figure.
- Static shell rendering without user behavior.
- Trivial passthrough wrappers.
- Browser speech-recognition internals.

