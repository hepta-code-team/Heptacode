import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSubmitAssessment } from '../../src/features/symptoms/handleSubmitAssessment';
import { validateSymptomDetailInput } from '../../src/lib/symptomExtractionApi';
import type { SymptomDraft } from '../../src/types/assessment';

vi.mock('../../src/lib/symptomExtractionApi', () => ({
  validateSymptomDetailInput: vi.fn(),
}));

const validateSymptomDetailInputMock = vi.mocked(validateSymptomDetailInput);

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
    validateSymptomDetailInputMock.mockResolvedValue({
      text: 'Kopfschmerzen',
      inputType: 'text',
      isValidMedicalInput: true,
    });

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

    expect(validateSymptomDetailInputMock).toHaveBeenCalledTimes(2);
    expect(validateSymptomDetailInputMock).toHaveBeenNthCalledWith(1, 'Kopfschmerzen', 'text', undefined);
    expect(validateSymptomDetailInputMock).toHaveBeenNthCalledWith(2, 'starker Druck', 'text', undefined);
    expect(submitAssessment).toHaveBeenCalledTimes(1);
    expect(setters.navigate).toHaveBeenCalledWith('/result');
  });

  it('validates unchanged AI-extracted symptom labels with their original free-text context', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn().mockResolvedValue({});
    validateSymptomDetailInputMock.mockResolvedValue({
      text: 'Ich habe seit Tagen Schwindel und mir ist uebel.\nSymptom: Allgemein',
      inputType: 'text',
      isValidMedicalInput: true,
    });

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

    expect(validateSymptomDetailInputMock).toHaveBeenCalledTimes(1);
    expect(validateSymptomDetailInputMock).toHaveBeenCalledWith(
      'Ich habe seit Tagen Schwindel und mir ist uebel.\nSymptom: Allgemein',
      'text',
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

  it('shows an error and stays on the current page when editable symptom validation fails', async () => {
    const setters = createSetters();
    const submitAssessment = vi.fn();
    validateSymptomDetailInputMock.mockResolvedValue({
      text: 'kein medizinischer Kontext',
      inputType: 'text',
      isValidMedicalInput: false,
      message: 'Bitte beschreiben Sie ein medizinisches Symptom.',
    });

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
