import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PatientData } from '../../src/types/assessment';

const ASSESSMENT_STORAGE_KEY = 'heptacheck.assessment.v1';
const ASSESSMENT_STORAGE_TTL_MS = 10 * 60 * 1000;

const patientData: PatientData = {
  birthMonth: '01',
  birthYear: '1990',
  height: '180',
  weight: '80',
  gender: 'male',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: '',
  medications: '',
  medicationDuration: '',
  substanceInfluence: '',
  recentAbroad: '',
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: '',
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
};

function storeActiveAssessment() {
  window.sessionStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify({
    state: {
      patientData,
      selectedSymptoms: [{ region: 'Kopf' }],
      symptomText: '',
      symptomDetails: [
        {
          id: 'symptom-1',
          region: 'Kopf',
          active: true,
          measurementType: 'pain',
          measurementValue: 5,
          duration: 'today',
        },
      ],
      assessmentResult: {
        careLevel: 'doctor',
        reasons: ['Mock reason'],
        reviewSummary: {
          plainLanguage: 'Plain',
          professionalSummary: 'Professional',
        },
      },
      assessmentRequestKey: null,
    },
    expiresAt: Date.now() + ASSESSMENT_STORAGE_TTL_MS,
  }));
}

describe('assessment expiry routing', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('returns from the result page to the landing page when the assessment expires', async () => {
    vi.useFakeTimers();
    window.scrollTo = vi.fn();
    window.history.pushState({}, '', '/result');
    storeActiveAssessment();

    const { default: App } = await import('../../src/app/App');

    render(<App />);

    expect(window.location.pathname).toBe('/result');

    await act(async () => {
      vi.advanceTimersByTime(ASSESSMENT_STORAGE_TTL_MS);
    });

    expect(window.location.pathname).toBe('/');
  }, 10_000);

  it('keeps the current assessment when the keep-session button is clicked', async () => {
    vi.useFakeTimers();
    window.scrollTo = vi.fn();
    window.history.pushState({}, '', '/patient-data');
    storeActiveAssessment();

    const { default: App } = await import('../../src/app/App');

    render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(ASSESSMENT_STORAGE_TTL_MS - 30_000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sitzung behalten' }));

    expect(window.location.pathname).toBe('/patient-data');
    expect(screen.queryByRole('button', { name: 'Sitzung behalten' })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(ASSESSMENT_STORAGE_KEY)).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(window.location.pathname).toBe('/patient-data');
  }, 10_000);
});
