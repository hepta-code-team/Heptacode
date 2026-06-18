import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '../../src/pages/LandingPage';
import MedicalDataPage from '../../src/pages/MedicalDataPage';
import PatientDataPage from '../../src/pages/PatientDataPage';
import ResultPage from '../../src/pages/ResultPage';
import SymptomDetailsPage from '../../src/pages/SymptomDetailsPage';
import SymptomSelectionPage from '../../src/pages/SymptomSelectionPage';
import { extractSymptomsFromText, validateSymptomDetailInput, validateSymptomInput } from '../../src/lib/symptomExtractionApi';
import type { PatientData } from '../../src/types/assessment';

const navigateMock = vi.fn();
const setPatientDataMock = vi.fn();
const setAssessmentResultMock = vi.fn();
const resetAssessmentMock = vi.fn();
const setSearchParamsMock = vi.fn();
const submitAssessmentMock = vi.fn();
const locationState = { current: null as unknown };

const basePatientData: PatientData = {
  birthMonth: '01',
  birthYear: '1990',
  height: '180',
  weight: '80',
  gender: 'Weiblich',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: '',
  medications: '',
  medicationDuration: '',
  substanceInfluence: 'Nein',
  recentAbroad: false,
  recentAbroadDetails: '',
  conditions: [],
  isSmoker: false,
  smokingSinceYears: '',
  cigarettesPerDay: '',
  conditionDetails: {},
};

const assessmentState = {
  patientData: null as PatientData | null,
  selectedSymptoms: [] as Array<{ region: string; side?: string }>,
  setSelectedSymptoms: vi.fn(),
  symptomText: '',
  setSymptomText: vi.fn(),
  symptomDetails: [] as Array<{
    id: string;
    region: string;
    side?: string;
    details?: string;
    active: boolean;
    measurementType: 'pain' | 'temperature' | 'feeling' | 'severity';
    measurementValue: number;
    duration: 'today' | 'days' | 'week' | 'weeks';
  }>,
  setSymptomDetails: vi.fn(),
  assessmentResult: null as null | {
    careLevel: 'selfcare' | 'doctor' | 'specialist' | 'emergency';
    recommendedSpecialty?: string;
    reasons: string[];
    reviewSummary: {
      plainLanguage: string;
      professionalSummary: string;
    };
    aiUnavailable?: boolean;
    aiModel?: string;
    createdAt?: string;
  },
  setAssessmentResult: setAssessmentResultMock,
  setPatientData: setPatientDataMock,
  submitAssessment: submitAssessmentMock,
  resetAssessment: resetAssessmentMock,
};

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ pathname: '/patient-data', state: locationState.current }),
  useSearchParams: () => [new URLSearchParams(), setSearchParamsMock],
}));

vi.mock('../../src/lib/symptomExtractionApi', () => ({
  extractSymptomsFromText: vi.fn(),
  validateSymptomDetailInput: vi.fn(),
  validateSymptomInput: vi.fn(),
}));

vi.mock('../../src/lib/AssessmentContext', () => ({
  useAssessment: () => {
    const [symptomText, setSymptomText] = useState(assessmentState.symptomText);

    return {
      ...assessmentState,
      symptomText,
      setSymptomText: (text: string) => {
        assessmentState.symptomText = text;
        setSymptomText(text);
      },
    };
  },
}));

const extractSymptomsFromTextMock = vi.mocked(extractSymptomsFromText);
const validateSymptomDetailInputMock = vi.mocked(validateSymptomDetailInput);
const validateSymptomInputMock = vi.mocked(validateSymptomInput);

describe('page-level user flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assessmentState.patientData = null;
    assessmentState.selectedSymptoms = [];
    assessmentState.symptomDetails = [];
    assessmentState.assessmentResult = null;
    assessmentState.patientData = null;
    assessmentState.symptomText = '';
    locationState.current = null;
    validateSymptomInputMock.mockResolvedValue({
      text: 'Kopf',
      inputType: 'text',
      isValidMedicalInput: true,
    });
    validateSymptomDetailInputMock.mockResolvedValue({
      text: 'Kopf',
      inputType: 'text',
      isValidMedicalInput: true,
    });
    vi.unstubAllGlobals();
  });

  it('lets users acknowledge the landing disclaimer, open emergency info and continue', async () => {
    const user = userEvent.setup();

    render(<LandingPage />);

    expect(screen.getByRole('dialog', { name: 'Wichtiger Hinweis' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verstanden' }));
    expect(screen.queryByRole('dialog', { name: 'Wichtiger Hinweis' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Informationen zu Notfall-Symptomen' })[0]);
    expect(screen.getByRole('heading', { name: 'Warum diese Symptome?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verstanden' }));
    expect(screen.queryByRole('heading', { name: 'Warum diese Symptome?' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Keines davon/ })[0]);
    expect(navigateMock).toHaveBeenCalledWith('/patient-data');
  });

  it('shows patient-data validation errors before saving and navigating', async () => {
    const user = userEvent.setup();

    render(<PatientDataPage />);
    setPatientDataMock.mockClear();

    await user.click(screen.getAllByRole('button', { name: 'Weiter' }).at(-1)!);
    expect(screen.getByText('Bitte Geschlecht auswählen.')).toBeInTheDocument();
    expect(setPatientDataMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('MM'), { target: { value: '13' } });
    fireEvent.change(screen.getByPlaceholderText('JJJJ'), { target: { value: '1990' } });
    fireEvent.change(screen.getByPlaceholderText('zB. 175'), { target: { value: '180' } });
    fireEvent.change(screen.getByPlaceholderText('zB. 70'), { target: { value: '80' } });
    await user.click(screen.getByRole('button', { name: 'Männlich' }));
    expect(screen.getByText('Bitte Monat zwischen 1-12 wählen.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('MM'), { target: { value: '12' } });
    await user.click(screen.getAllByRole('button', { name: 'Weiter' }).at(-1)!);

    expect(setPatientDataMock).toHaveBeenCalledWith(expect.objectContaining({
      birthMonth: '12',
      birthYear: '1990',
      height: '180',
      weight: '80',
      gender: 'Männlich',
      isPregnant: false,
      isBreastfeeding: false,
    }));
    expect(navigateMock).toHaveBeenCalledWith('/medical-data');
  });

  it('collects optional medical data and continues to symptom selection', async () => {
    const user = userEvent.setup();
    assessmentState.patientData = basePatientData;

    render(<MedicalDataPage />);

    await user.click(screen.getByRole('button', { name: 'Derzeit schwanger' }));
    await user.click(screen.getByRole('button', { name: /Allergien \/ Unverträglichkeiten/ }));
    await user.type(screen.getByLabelText('Allergien / Unverträglichkeiten'), 'Penicillin');
    await user.click(screen.getByRole('button', { name: /Aktuelle Medikamente/ }));
    await user.type(screen.getByLabelText('Aktuelle Medikamente'), 'Ibuprofen');
    await user.click(screen.getByRole('button', { name: /Einfluss durch Alkohol/ }));
    await user.click(screen.getByRole('button', { name: 'Alkohol' }));
    await user.click(screen.getByRole('button', { name: /Auslandsaufenthalt/ }));
    await user.click(screen.getAllByRole('button', { name: 'Ja' })[0]);
    await user.type(screen.getByPlaceholderText('Land / Region, falls bekannt'), 'Italien');
    await user.click(screen.getAllByRole('button', { name: 'Ja' })[1]);
    await user.click(screen.getByRole('button', { name: 'Rauchdauer erhöhen' }));
    await user.click(screen.getByRole('button', { name: 'Zigaretten pro Tag erhöhen' }));
    await user.click(screen.getByRole('button', { name: 'Diabetes' }));
    await user.click(screen.getByRole('button', { name: 'Typ 2' }));
    await user.type(screen.getByLabelText('Sonstige'), 'Migräne');
    await user.click(screen.getAllByRole('button', { name: 'Weiter' }).at(-1)!);

    expect(setPatientDataMock).toHaveBeenCalledWith(expect.objectContaining({
      allergies: 'Penicillin',
      medications: 'Ibuprofen',
      substanceInfluence: 'Alkohol',
      recentAbroad: true,
      recentAbroadDetails: 'Italien',
      isPregnant: true,
      isSmoker: true,
      smokingSinceYears: '1',
      cigarettesPerDay: '1',
      conditions: expect.arrayContaining(['Diabetes', 'Sonstige']),
      conditionDetails: expect.objectContaining({
        Diabetes: {
          condition: 'Diabetes',
          detail: 'Typ 2',
          duration: '',
        },
        Sonstige: {
          condition: 'Sonstige',
          detail: 'Migräne',
          duration: '',
        },
      }),
    }));
    expect(navigateMock).toHaveBeenCalledWith('/symptom-selection');
  });

  it('renders fallback selfcare result and resets the assessment', async () => {
    const user = userEvent.setup();

    render(<ResultPage />);

    expect(screen.getAllByText(/Häusliche Versorgung/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Neue Bewertung starten' }));

    expect(resetAssessmentMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/', {
      flushSync: true,
      replace: true,
    });
  });

  it('selects manual symptoms, removes them and continues to symptom details', async () => {
    const user = userEvent.setup();

    render(<SymptomSelectionPage />);

    expect(screen.getAllByRole('button', { name: 'Weiter' }).at(-1)).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Kopf auswählen' }));
    expect(setSearchParamsMock).toHaveBeenCalledWith({ category: 'head' });

    await user.click(screen.getByRole('button', { name: 'Kopf' }));
    await user.click(screen.getByRole('button', { name: 'Stirn' }));
    expect(screen.getByText('Kopf (Stirn)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kopf (Stirn) entfernen' }));
    expect(screen.queryByText('Kopf (Stirn)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kopf' }));
    await user.click(screen.getAllByRole('button', { name: 'Gesicht' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Weiter' }).at(-1)!);

    expect(assessmentState.setSelectedSymptoms).toHaveBeenCalledWith([{ region: 'Kopf', side: 'Gesicht' }]);
    expect(navigateMock).toHaveBeenCalledWith('/symptom-details');
  });

  it('extracts free-text symptoms via the mocked AI endpoint and navigates with route state', async () => {
    const user = userEvent.setup();
    assessmentState.patientData = basePatientData;
    extractSymptomsFromTextMock.mockResolvedValue({
      text: 'Kopfschmerzen',
      inputType: 'text',
      symptoms: [
        { region: 'Kopf', side: 'Stirn', details: 'stark' },
        { region: 'Kopf', side: 'Stirn' },
        { region: 'Bauch' },
        { region: 'Brust' },
        { region: 'Rücken' },
      ],
    });

    render(<SymptomSelectionPage />);

    await user.click(screen.getAllByRole('button', { name: /Symptome beschreiben/ })[0]);
    expect(screen.getByRole('button', { name: 'Symptombeschreibung übernehmen' })).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText(/Ich habe seit 3 Tagen/),
      'Ich habe starke Kopfschmerzen und Bauchschmerzen.',
    );
    await user.click(screen.getByRole('button', { name: 'Symptombeschreibung übernehmen' }));

    expect(extractSymptomsFromTextMock).toHaveBeenCalledWith(
      'Ich habe starke Kopfschmerzen und Bauchschmerzen.',
      'text',
      basePatientData,
    );
    expect(assessmentState.setSelectedSymptoms).toHaveBeenCalledWith([
      { region: 'Kopf', side: 'Stirn' },
      { region: 'Bauch', side: undefined },
      { region: 'Brust', side: undefined },
    ]);
    expect(navigateMock).toHaveBeenCalledWith('/symptom-details', {
      state: {
        extractedSymptoms: [
          { region: 'Kopf', side: 'Stirn', details: 'stark' },
          { region: 'Bauch' },
          { region: 'Brust' },
        ],
      },
    });
  });

  it('keeps users in the free-text modal when extraction returns invalid input', async () => {
    const user = userEvent.setup();
    extractSymptomsFromTextMock.mockResolvedValue({
      text: 'hallo',
      inputType: 'text',
      symptoms: [],
      invalidInput: true,
      message: 'Bitte medizinische Beschwerden beschreiben.',
    });

    render(<SymptomSelectionPage />);

    await user.click(screen.getAllByRole('button', { name: /Symptome beschreiben/ })[0]);
    await user.type(screen.getByPlaceholderText(/Ich habe seit 3 Tagen/), 'hallo');
    await user.click(screen.getByRole('button', { name: 'Symptombeschreibung übernehmen' }));

    expect(await screen.findByText('Bitte medizinische Beschwerden beschreiben.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith('/symptom-details', expect.anything());
  });

  it('redirects empty symptom details pages back to selection', () => {
    render(<SymptomDetailsPage />);

    expect(navigateMock).toHaveBeenCalledWith('/symptom-selection');
  });

  it('submits route-extracted symptom details after duration selection', async () => {
    const user = userEvent.setup();
    submitAssessmentMock.mockResolvedValue({});
    locationState.current = {
      extractedSymptoms: [{ region: 'Kopf', side: 'Stirn', details: 'pulsierend' }],
    };

    render(<SymptomDetailsPage />);

    expect(screen.getByText('Kopf (Stirn)')).toBeInTheDocument();
    expect(screen.getByText('pulsierend')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Seit heute' }));
    await user.click(screen.getAllByRole('button', { name: 'Weiter' }).at(-1)!);

    expect(assessmentState.setSymptomDetails).toHaveBeenCalledWith([
      expect.objectContaining({
        region: 'Kopf',
        side: 'Stirn',
        details: 'pulsierend',
        active: true,
        duration: 'today',
      }),
    ]);
    expect(submitAssessmentMock).toHaveBeenCalledWith([
      expect.objectContaining({
        region: 'Kopf',
        side: 'Stirn',
        details: 'pulsierend',
        active: true,
        duration: 'today',
      }),
    ]);
    expect(navigateMock).toHaveBeenCalledWith('/result');
  });

  it('opens result explanations, edits the medical summary and exports PDF payloads', async () => {
    const user = userEvent.setup();
    const createObjectUrlMock = vi.fn(() => 'blob:pdf');
    const revokeObjectUrlMock = vi.fn();
    const clickMock = vi.fn();
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
    } as Response));
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;

      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: clickMock });
      }

      return element;
    });
    assessmentState.patientData = {
      ...basePatientData,
      conditions: ['Diabetes'],
      conditionDetails: {
        Diabetes: {
          condition: 'Diabetes',
          detail: 'Typ 2',
          duration: '',
        },
      },
      recentAbroad: true,
      recentAbroadDetails: 'Italien | 2026-01-01 | 2026-01-10',
    };
    assessmentState.symptomDetails = [
      {
        id: 'symptom-1',
        region: 'Kopf',
        side: 'Stirn',
        details: 'pulsierend',
        active: true,
        measurementType: 'pain',
        measurementValue: 7,
        duration: 'today',
      },
    ];
    assessmentState.assessmentResult = {
      careLevel: 'doctor',
      recommendedSpecialty: 'general_practice',
      reasons: ['Ärztliche Abklärung sinnvoll.'],
      reviewSummary: {
        plainLanguage: 'Bitte ärztlich abklären lassen.',
        professionalSummary: 'Beschwerden:\nKopfschmerz mit Übelkeit.',
      },
      aiUnavailable: true,
      aiModel: 'mock-model',
      createdAt: '2026-06-10T10:00:00.000Z',
    };

    render(<ResultPage />);

    const patientDataToggle = screen.getByRole('button', { name: 'Patientendaten' });
    expect(patientDataToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Geburtsdatum')).not.toBeInTheDocument();

    await user.click(patientDataToggle);
    expect(patientDataToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Geburtsdatum')).toBeInTheDocument();

    await user.click(patientDataToggle);
    expect(patientDataToggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'KI-Begründung anzeigen' }));
    expect(screen.getAllByText(/Kopfschmerz mit Übelkeit/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/mock-model/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'medical-summary-bearbeiten' }));
    expect(patientDataToggle).toHaveAttribute('aria-expanded', 'true');
    await user.clear(screen.getByDisplayValue('1990'));
    await user.type(screen.getByLabelText('Geburtsjahr'), '1988');
    await user.clear(screen.getByLabelText('Beschwerden bearbeiten'));
    await user.type(screen.getByLabelText('Beschwerden bearbeiten'), 'Geänderte Beschwerden.');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(setPatientDataMock).toHaveBeenCalledWith(expect.objectContaining({
      birthYear: '1988',
      recentAbroadDetails: 'Italien | 2026-01-01 | 2026-01-10',
    }));
    expect(setAssessmentResultMock).toHaveBeenCalledWith(expect.objectContaining({
      reviewSummary: expect.objectContaining({
        professionalSummary: 'Beschwerden:\nGeänderte Beschwerden.',
      }),
    }));

    await user.click(screen.getByRole('button', { name: 'download-summary' }));

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/pdf/export',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      reviewSummary: {
        plainLanguage: 'Bitte ärztlich abklären lassen.',
      },
      triage: {
        careLevel: 'doctor',
        recommendedSpecialty: 'general_practice',
        reasons: ['Geänderte Beschwerden.'],
      },
      symptoms: [
        {
          region: 'Kopf',
          side: 'Stirn',
          measurementType: 'pain',
          measurementValue: 7,
          duration: 'today',
        },
      ],
    });
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:pdf');
  });
});
