import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSubmitAssessment } from '../../src/features/symptoms/handleSubmitAssessment';
import { validateSymptomConsistency } from '../../src/lib/symptomExtractionApi';
import type { SymptomDraft } from '../../src/types/assessment';

vi.mock('../../src/lib/symptomExtractionApi', () => ({
  validateSymptomConsistency: vi.fn(),
}));

const validateSymptomConsistencyMock = vi.mocked(validateSymptomConsistency);

function createConsistencyResult(overrides: Partial<Awaited<ReturnType<typeof validateSymptomConsistency>>> = {}) {
  return {
    isRegionMeaningful: true,
    hasClearContradiction: false,
    selectedLocationIds: [],
    detailLocationIds: [],
    selectedLocationConfidence: 'none' as const,
    detailLocationConfidence: 'none' as const,
    ...overrides,
  };
}

function createSetters() {
  return {
    navigate: vi.fn(),
    setShowValidationErrors: vi.fn(),
    setSubmitError: vi.fn(),
    setIsSubmitting: vi.fn(),
  };
}

function createSymptomDraft(overrides: Partial<SymptomDraft> = {}): SymptomDraft {
  return {
    id: 'symptom-1',
    region: 'Kopfschmerzen',
    side: undefined,
    measurementType: 'pain',
    measurementValue: 6,
    duration: 'today',
    active: true,
    ...overrides,
  };
}

describe('handleSubmitAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation errors and does not submit when an active symptom has no duration', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn();

    await handleSubmitAssessment({
      symptomDetails: [createSymptomDraft({ duration: undefined })],
      submitAssessment,
      ...setters,
    });

    expect(setters.setShowValidationErrors).toHaveBeenCalledWith(true);
    expect(submitAssessment).not.toHaveBeenCalled();
    expect(setters.navigate).not.toHaveBeenCalled();
    expect(setters.setIsSubmitting).not.toHaveBeenCalled();
  });

  it('submits normalized active symptoms and navigates to the result page', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn().mockResolvedValue({});
    validateSymptomConsistencyMock.mockResolvedValue(createConsistencyResult());

    await handleSubmitAssessment({
      symptomDetails: [
        createSymptomDraft({
          region: '  Kopfschmerzen  ',
          details: '  seit dem Aufwachen  ',
        }),
        createSymptomDraft({
          id: 'inactive-symptom',
          active: false,
          region: 'Bauchschmerzen',
        }),
      ],
      submitAssessment,
      ...setters,
    });

    expect(setters.setSubmitError).toHaveBeenCalledWith(null);
    expect(setters.setIsSubmitting).toHaveBeenNthCalledWith(1, true);
    expect(submitAssessment).toHaveBeenCalledWith([
      {
        id: 'symptom-1',
        region: 'Kopfschmerzen',
        side: undefined,
        details: 'seit dem Aufwachen',
        measurementType: 'pain',
        measurementValue: 6,
        duration: 'today',
        active: true,
      },
    ]);
    expect(setters.navigate).toHaveBeenCalledWith('/result');
    expect(setters.setIsSubmitting).toHaveBeenLastCalledWith(false);
  });

  it('validates editable AI-extracted symptoms before submitting', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn().mockResolvedValue({});
    validateSymptomConsistencyMock.mockResolvedValue(createConsistencyResult());

    await handleSubmitAssessment({
      symptomDetails: [
        createSymptomDraft({
          isNameEditable: true,
          details: 'starker Druck',
        }),
      ],
      submitAssessment,
      ...setters,
    });

    expect(validateSymptomConsistencyMock).toHaveBeenCalledTimes(1);
    expect(validateSymptomConsistencyMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Kopfschmerzen', details: 'starker Druck' }),
      undefined,
    );
    expect(submitAssessment).toHaveBeenCalledTimes(1);
    expect(setters.navigate).toHaveBeenCalledWith('/result');
  });

  it('validates unchanged AI-extracted symptom labels with their original free-text context', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn().mockResolvedValue({});
    validateSymptomConsistencyMock.mockResolvedValue(createConsistencyResult());

    await handleSubmitAssessment({
      symptomDetails: [
        createSymptomDraft({
          region: 'Allgemein',
          isNameEditable: true,
          sourceText: 'Ich habe seit Tagen Schwindel und mir ist uebel.',
          originalRegion: 'Allgemein',
        }),
      ],
      submitAssessment,
      ...setters,
    });

    expect(validateSymptomConsistencyMock).toHaveBeenCalledTimes(1);
    expect(validateSymptomConsistencyMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Allgemein' }),
      undefined,
    );
    expect(submitAssessment).toHaveBeenCalledWith([
      expect.objectContaining({
        region: 'Allgemein',
        active: true,
      }),
    ]);
    expect(setters.navigate).toHaveBeenCalledWith('/result');
  });

  it('blocks clearly contradictory edited AI-extracted region and detail combinations', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn();
    validateSymptomConsistencyMock.mockResolvedValue(createConsistencyResult({
      isRegionMeaningful: true,
      hasClearContradiction: true,
      selectedLocationIds: ['legs'],
      detailLocationIds: ['arms'],
      selectedLocationConfidence: 'high',
      detailLocationConfidence: 'high',
      message: 'Bitte prüfen Sie Region und Zusatzdetails. Die Angaben widersprechen sich eindeutig.',
    }));

    await handleSubmitAssessment({
      symptomDetails: [
        createSymptomDraft({
          region: 'Bein',
          details: 'Schnittwunde in Hand',
          isNameEditable: true,
          sourceText: 'Ich hab mir in die Hand geschnitten',
          originalRegion: 'Hand',
          originalDetails: 'Schnittwunde in Hand',
        }),
      ],
      submitAssessment,
      ...setters,
    });

    expect(validateSymptomConsistencyMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Bein', details: 'Schnittwunde in Hand' }),
      undefined,
    );
    expect(submitAssessment).not.toHaveBeenCalled();
    expect(setters.navigate).not.toHaveBeenCalled();
    expect(setters.setSubmitError).toHaveBeenCalledWith(
      'Bitte prüfen Sie Region und Zusatzdetails. Die Angaben widersprechen sich eindeutig.',
    );
  });

  it('blocks clear region-detail contradictions even when editable metadata is missing', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn();
    validateSymptomConsistencyMock.mockResolvedValue(createConsistencyResult({
      isRegionMeaningful: true,
      hasClearContradiction: true,
      selectedLocationIds: ['legs'],
      detailLocationIds: ['arms'],
      selectedLocationConfidence: 'high',
      detailLocationConfidence: 'high',
      message: 'Bitte prüfen Sie Region und Zusatzdetails. Die Angaben widersprechen sich eindeutig.',
    }));

    await handleSubmitAssessment({
      symptomDetails: [
        createSymptomDraft({
          region: 'Bein',
          details: 'Schnittwunde in der Hand',
          isNameEditable: undefined,
        }),
      ],
      submitAssessment,
      ...setters,
    });

    expect(validateSymptomConsistencyMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Bein', details: 'Schnittwunde in der Hand' }),
      undefined,
    );
    expect(submitAssessment).not.toHaveBeenCalled();
    expect(setters.navigate).not.toHaveBeenCalled();
    expect(setters.setSubmitError).toHaveBeenCalledWith(
      'Bitte prüfen Sie Region und Zusatzdetails. Die Angaben widersprechen sich eindeutig.',
    );
  });

  it('blocks non-medical symptom names even when the details look medical', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn();
    validateSymptomConsistencyMock.mockResolvedValue(createConsistencyResult({
      isRegionMeaningful: false,
      hasClearContradiction: false,
      message: 'Bitte prüfen Sie die Symptom- oder Regionsangabe. Die Angabe wirkt nicht medizinisch sinnvoll.',
    }));

    await handleSubmitAssessment({
      symptomDetails: [
        createSymptomDraft({
          region: 'Besen',
          details: 'Schnittwunde in der Hand',
          isNameEditable: true,
        }),
      ],
      submitAssessment,
      ...setters,
    });

    expect(validateSymptomConsistencyMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Besen', details: 'Schnittwunde in der Hand' }),
      undefined,
    );
    expect(submitAssessment).not.toHaveBeenCalled();
    expect(setters.navigate).not.toHaveBeenCalled();
    expect(setters.setSubmitError).toHaveBeenCalledWith(
      'Bitte prüfen Sie die Symptom- oder Regionsangabe. Die Angabe wirkt nicht medizinisch sinnvoll.',
    );
  });

  it('allows edited AI-extracted symptoms when there is no clear region-detail contradiction', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn().mockResolvedValue({});
    validateSymptomConsistencyMock.mockResolvedValue(createConsistencyResult());

    await handleSubmitAssessment({
      symptomDetails: [
        createSymptomDraft({
          region: 'Schnittwunde',
          details: 'Schnittwunde in Hand',
          isNameEditable: true,
          sourceText: 'Ich hab mir in die Hand geschnitten',
          originalRegion: 'Hand',
          originalDetails: 'Schnittwunde in Hand',
        }),
      ],
      submitAssessment,
      ...setters,
    });

    expect(submitAssessment).toHaveBeenCalledTimes(1);
    expect(setters.navigate).toHaveBeenCalledWith('/result');
  });

  it('shows an error and stays on the current page when editable symptom validation fails', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn();
    validateSymptomConsistencyMock.mockResolvedValue(createConsistencyResult({
      isRegionMeaningful: false,
      hasClearContradiction: false,
      message: 'Bitte beschreiben Sie ein medizinisches Symptom.',
    }));

    await handleSubmitAssessment({
      symptomDetails: [createSymptomDraft({ isNameEditable: true })],
      submitAssessment,
      ...setters,
    });

    expect(submitAssessment).not.toHaveBeenCalled();
    expect(setters.navigate).not.toHaveBeenCalled();
    expect(setters.setSubmitError).toHaveBeenCalledWith('Bitte beschreiben Sie ein medizinisches Symptom.');
    expect(setters.setIsSubmitting).toHaveBeenLastCalledWith(false);
  });
});
