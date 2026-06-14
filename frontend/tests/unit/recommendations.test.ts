import { describe, expect, it } from 'vitest';
import {
  createSpecialtyConfig,
  isCareLevel,
  isMedicalSpecialty,
} from '../../src/features/results/result.config';
import { getFrontendTriageRecommendation } from '../../src/lib/specialtyRecommendation';
import type { PatientData, Symptom } from '../../src/types/assessment';

const basePatient: PatientData = {
  birthMonth: '01',
  birthYear: '1990',
  height: '170',
  weight: '70',
  gender: 'female',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: '',
  medications: '',
  substanceInfluence: '',
  recentAbroad: false,
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: false,
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
};

function symptom(region: string, measurementValue = 5): Symptom {
  return {
    id: region,
    region,
    active: true,
    measurementType: 'pain',
    measurementValue,
    duration: 'today',
  };
}

describe('recommendation helpers', () => {
  it('validates care levels and medical specialties', () => {
    expect(isCareLevel('doctor')).toBe(true);
    expect(isCareLevel('unknown')).toBe(false);
    expect(isMedicalSpecialty('cardiology')).toBe(true);
    expect(isMedicalSpecialty('unknown')).toBe(false);
  });

  it('creates specialty-specific result configuration', () => {
    expect(createSpecialtyConfig('cardiology')).toMatchObject({
      title: 'Fachärztliche Versorgung: Kardiologie',
      titleSupplement: 'Herzmedizin',
      color: '#3B82F6',
    });
  });

  it('routes administrative requests to general practice', () => {
    const result = getFrontendTriageRecommendation({
      patientData: basePatient,
      selectedSymptoms: [{ region: 'Krankmeldung' }],
      symptomDetails: [],
    });

    expect(result.careLevel).toBe('doctor');
    expect(result.recommendedSpecialties?.[0].specialty).toBe('general_practice');
  });

  it('prioritizes emergency evidence over specialist matches', () => {
    const result = getFrontendTriageRecommendation({
      patientData: basePatient,
      selectedSymptoms: [{ region: 'Brust Druckgefühl Atemnot' }],
      symptomDetails: [symptom('Brust', 8)],
    });

    expect(result.careLevel).toBe('emergency');
    expect(result.recommendedSpecialties?.[0].specialty).toBe('emergency_medicine');
    expect(result.reasons).toContain('Ein kritisches Warnsymptom wurde angegeben.');
  });

  it('recommends specialists and selfcare based on symptom text and intensity', () => {
    const specialist = getFrontendTriageRecommendation({
      patientData: basePatient,
      selectedSymptoms: [{ region: 'Bauch Krämpfe' }],
      symptomDetails: [symptom('Bauch', 6)],
    });

    expect(specialist.careLevel).toBe('specialist');
    expect(specialist.recommendedSpecialty).toBe('gastroenterology');

    const selfcare = getFrontendTriageRecommendation({
      patientData: basePatient,
      selectedSymptoms: [{ region: 'unklare leichte Beschwerden' }],
      symptomDetails: [symptom('Allgemein', 2)],
    });

    expect(selfcare.careLevel).toBe('selfcare');
    expect(selfcare.recommendedSpecialties?.[0].specialty).toBe('general_practice');
  });
});

