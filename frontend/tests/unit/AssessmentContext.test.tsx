import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentProvider, useAssessment } from '../../src/lib/AssessmentContext';
import { apiClient } from '../../src/lib/apiClient';
import type { PatientData } from '../../src/types/assessment';

vi.mock('../../src/lib/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const apiPostMock = vi.mocked(apiClient.post);

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
  recentAbroad: false,
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: false,
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
    </div>
  );
}

describe('AssessmentContext', () => {
  it('stores wizard data, submits assessment payloads and resets state', async () => {
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

    await user.click(screen.getByRole('button', { name: 'reset' }));
    expect(screen.getByText('Patient: none')).toBeInTheDocument();
    expect(screen.getByText('Symptoms: 0')).toBeInTheDocument();
    expect(screen.getByText('Result: none')).toBeInTheDocument();
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
