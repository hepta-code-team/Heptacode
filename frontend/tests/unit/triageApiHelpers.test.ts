import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PatientData, SelectedSymptom, Symptom } from '../../src/types/assessment';
import {
  extractSymptomsFromText,
  validateSymptomConsistency,
  validateSymptomDetailInput,
  validateSymptomInput,
} from '../../src/lib/symptomExtractionApi';
import {
  buildTriageRequest,
  requestTriageRecommendation,
} from '../../src/lib/triageRecommendation';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('../../src/lib/apiClient', () => ({
  apiClient: {
    post: postMock,
  },
}));

const patientData: PatientData = {
  birthMonth: '03',
  birthYear: '1985',
  height: '172',
  weight: '68',
  gender: 'Weiblich',
  mood: 'angespannt',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: 'Penicillin',
  medications: 'Ibuprofen',
  medicationDuration: '',
  substanceInfluence: '',
  recentAbroad: 'Nein',
  recentAbroadDetails: '',
  conditions: ['Asthma/COPD'],
  isSmoker: 'Nein',
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {
    'Asthma/COPD': {
      condition: 'Asthma/COPD',
      detail: 'Asthma',
      duration: 'seit Kindheit',
    },
  },
};

const patientDataWithoutMood = {
  ...patientData,
  mood: undefined,
};
delete patientDataWithoutMood.mood;

describe('symptom extraction API helpers', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({});
  });

  it('omits mood from extraction and validation patient payloads', async () => {
    await extractSymptomsFromText('Kopfschmerzen und Uebelkeit', 'speech', patientData);
    await validateSymptomInput('Kopfschmerzen', undefined, patientData);

    expect(postMock).toHaveBeenNthCalledWith(1, '/api/v1/symptoms/extraction', {
      symptomText: 'Kopfschmerzen und Uebelkeit',
      inputType: 'speech',
      patientData: patientDataWithoutMood,
    });
    expect(postMock).toHaveBeenNthCalledWith(2, '/api/v1/symptoms/validation', {
      symptomText: 'Kopfschmerzen',
      inputType: 'text',
      patientData: patientDataWithoutMood,
    });
  });

  it('keeps full patient data for detail validation', async () => {
    await validateSymptomDetailInput('pulsierend seit gestern', 'text', patientData);

    expect(postMock).toHaveBeenCalledWith('/api/v1/symptoms/detail-validation', {
      symptomText: 'pulsierend seit gestern',
      inputType: 'text',
      patientData,
    });
  });

  it('passes undefined patient data when no patient context is available', async () => {
    await extractSymptomsFromText('Kopfschmerzen');

    expect(postMock).toHaveBeenCalledWith('/api/v1/symptoms/extraction', {
      symptomText: 'Kopfschmerzen',
      inputType: 'text',
      patientData: undefined,
    });
  });

  it('trims optional consistency fields and omits empty details', async () => {
    await validateSymptomConsistency({
      region: 'Kopf',
      side: ' Stirn ',
      details: '   ',
    }, patientData);

    expect(postMock).toHaveBeenCalledWith('/api/v1/symptoms/consistency', {
      region: 'Kopf',
      side: 'Stirn',
      patientData: patientDataWithoutMood,
    });
  });
});

describe('triage recommendation helpers', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({
      careLevel: 'doctor',
      title: 'Hausarzt',
      color: '#486284',
      bgColor: '#eff2f6',
      description: 'Bitte aerztlich abklaeren lassen.',
      reasons: ['Persistierende Beschwerden.'],
    });
  });

  it('builds a triage request without dropping optional free text', () => {
    const selectedSymptoms: SelectedSymptom[] = [{ region: 'Kopf', side: 'Stirn' }];
    const symptomDetails: Symptom[] = [{
      id: 'symptom-1',
      region: 'Kopf',
      side: 'Stirn',
      active: true,
      measurementType: 'pain',
      measurementValue: 7,
      duration: 'today',
    }];

    expect(buildTriageRequest({
      patientData,
      selectedSymptoms,
      symptomDetails,
      freeText: 'Starke Kopfschmerzen seit heute.',
    })).toEqual({
      patientData,
      selectedSymptoms,
      symptomDetails,
      freeText: 'Starke Kopfschmerzen seit heute.',
    });
  });

  it('posts triage requests to the recommendation endpoint', async () => {
    const payload = buildTriageRequest({
      patientData: null,
      selectedSymptoms: [{ region: 'Brust' }],
      symptomDetails: [],
    });

    await expect(requestTriageRecommendation(payload)).resolves.toMatchObject({
      careLevel: 'doctor',
      reasons: ['Persistierende Beschwerden.'],
    });
    expect(postMock).toHaveBeenCalledWith('/triage/recommendation', payload);
  });
});
