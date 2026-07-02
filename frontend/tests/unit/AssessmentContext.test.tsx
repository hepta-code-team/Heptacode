import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentProvider, useAssessment } from '../../src/lib/AssessmentContext';
import { apiClient } from '../../src/lib/apiClient';
import type { PatientData } from '../../src/types/assessment';

vi.mock('../../src/lib/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const apiPostMock = vi.mocked(apiClient.post);
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

function Harness() {
  const assessment = useAssessment();

  return (
    <div>
      <p>Patient: {assessment.patientData?.birthYear ?? 'none'}</p>
      <p>Symptoms: {assessment.selectedSymptoms.length}</p>
      <p>Result: {assessment.assessmentResult?.careLevel ?? 'none'}</p>
      <p>Countdown: {assessment.expiryWarningSecondsRemaining ?? 'none'}</p>
      <p>Expired: {assessment.hasAssessmentExpired ? 'yes' : 'no'}</p>
      <button type="button" onClick={() => assessment.setPatientData(patientData)}>
        set patient
      </button>
      <button
        type="button"
        onClick={() => assessment.setSelectedSymptoms([{ region: 'Kopf' }])}
      >
        set symptom
      </button>
      <button
        type="button"
        onClick={() => {
          void assessment.submitAssessment([
            {
              id: 'symptom-1',
              region: 'Kopf',
              active: true,
              measurementType: 'pain',
              measurementValue: 5,
              duration: 'today',
            },
          ]);
        }}
      >
        submit
      </button>
      <button type="button" onClick={assessment.resetAssessment}>
        reset
      </button>
      <button type="button" onClick={assessment.refreshAssessmentExpiry}>
        refresh expiry
      </button>
    </div>
  );
}

describe('AssessmentContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    apiPostMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores wizard data, reuses identical results and resets state', async () => {
    const user = userEvent.setup();
    apiPostMock.mockResolvedValue({
      careLevel: 'doctor',
      reasons: ['Mock reason'],
      reviewSummary: {
        plainLanguage: 'Plain',
        professionalSummary: 'Professional',
      },
    });

    render(
      <AssessmentProvider>
        <Harness />
      </AssessmentProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'set patient' }));
    await user.click(screen.getByRole('button', { name: 'set symptom' }));
    expect(screen.getByText('Patient: 1990')).toBeInTheDocument();
    expect(screen.getByText('Symptoms: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('Result: doctor')).toBeInTheDocument();
    });
    expect(apiPostMock).toHaveBeenCalledWith('/assessments', {
      patientData,
      selectedSymptoms: [{ region: 'Kopf' }],
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
    });

    await user.click(screen.getByRole('button', { name: 'submit' }));
    expect(apiPostMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'reset' }));
    expect(screen.getByText('Patient: none')).toBeInTheDocument();
    expect(screen.getByText('Symptoms: 0')).toBeInTheDocument();
    expect(screen.getByText('Result: none')).toBeInTheDocument();
  });

  it('discards persisted assessment data after its expiration time', () => {
    const removeItemSpy = vi.spyOn(window.sessionStorage, 'removeItem');

    window.sessionStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify({
      state: {
        patientData,
        selectedSymptoms: [{ region: 'Kopf' }],
        symptomText: '',
        symptomDetails: [],
        assessmentResult: null,
        assessmentRequestKey: null,
      },
      expiresAt: Date.now() - 1,
    }));

    render(
      <AssessmentProvider>
        <Harness />
      </AssessmentProvider>,
    );

    expect(screen.getByText('Patient: none')).toBeInTheDocument();
    expect(screen.getByText('Symptoms: 0')).toBeInTheDocument();
    expect(removeItemSpy).toHaveBeenCalledWith(ASSESSMENT_STORAGE_KEY);

    removeItemSpy.mockRestore();
  });

  it('clears active assessment data when its expiration time passes without a reload', () => {
    vi.useFakeTimers();

    render(
      <AssessmentProvider>
        <Harness />
      </AssessmentProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'set patient' }));
    fireEvent.click(screen.getByRole('button', { name: 'set symptom' }));

    expect(screen.getByText('Patient: 1990')).toBeInTheDocument();
    expect(screen.getByText('Symptoms: 1')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(ASSESSMENT_STORAGE_TTL_MS);
    });

    expect(screen.getByText('Patient: none')).toBeInTheDocument();
    expect(screen.getByText('Symptoms: 0')).toBeInTheDocument();
    expect(screen.getByText('Result: none')).toBeInTheDocument();
    expect(screen.getByText('Countdown: none')).toBeInTheDocument();
    expect(screen.getByText('Expired: yes')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ASSESSMENT_STORAGE_KEY)).toBeNull();
  });

  it('shows the expiration countdown during the final 30 seconds', () => {
    vi.useFakeTimers();

    render(
      <AssessmentProvider>
        <Harness />
      </AssessmentProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'set patient' }));

    expect(screen.getByText('Countdown: none')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(ASSESSMENT_STORAGE_TTL_MS - 30_000);
    });

    expect(screen.getByText('Countdown: 30')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText('Countdown: 29')).toBeInTheDocument();
  });

  it('resets the expiration timer when the warning is dismissed', () => {
    vi.useFakeTimers();

    render(
      <AssessmentProvider>
        <Harness />
      </AssessmentProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'set patient' }));

    act(() => {
      vi.advanceTimersByTime(ASSESSMENT_STORAGE_TTL_MS - 30_000);
    });

    expect(screen.getByText('Countdown: 30')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'refresh expiry' }));

    expect(screen.getByText('Countdown: none')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText('Patient: 1990')).toBeInTheDocument();
    expect(screen.getByText('Expired: no')).toBeInTheDocument();
    expect(screen.getByText('Countdown: none')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(ASSESSMENT_STORAGE_TTL_MS - 60_000);
    });

    expect(screen.getByText('Countdown: 30')).toBeInTheDocument();
  });

  it('throws a clear error when submitting without patient data', async () => {
    function SubmitWithoutPatient() {
      const assessment = useAssessment();
      const [error, setError] = useState('');
      return (
        <>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              void assessment.submitAssessment([]).catch((submitError: unknown) => {
                setError(submitError instanceof Error ? submitError.message : 'unknown');
              });
            }}
          >
            submit
          </button>
        </>
      );
    }

    render(
      <AssessmentProvider>
        <SubmitWithoutPatient />
      </AssessmentProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'submit' }));

    expect(
      await screen.findByText(/Bitte füllen Sie zuerst alle Pflichtfelder der Stammdaten vollständig aus/),
    ).toBeInTheDocument();
  });
});