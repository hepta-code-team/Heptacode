import type { CareLevel, TriageResponse } from '../../src/modules/triage/triage.types.js'
import type { TriageEvaluationDiagnostics } from '../../src/modules/triage/triage.service.js'

type ReasoningSource = Pick<TriageResponse, 'reasons' | 'reviewSummary'>

const CARE_LEVEL_REASONING_KEYWORDS: Record<CareLevel, string[]> = {
  emergency: ['notfall', 'sofort', 'umgehend', 'akut', 'notaufnahme', '112'],
  specialist: [
    'fachaerzt',
    'facharzt',
    'fachrichtung',
    'fachklinik',
    'spezialist',
    'spezialisiert',
    'spezialisierte',
    'intern',
    'internistisch',
    'innere medizin',
    'kardiolog',
    'neurolog',
    'orthopaed',
    'orthopad',
    'pneumolog',
    'dermatolog',
    'hautarzt',
    'urolog',
    'gynaekolog',
    'gynakolog',
    'frauenarzt',
    'psychiatr',
    'diabetolog',
    'diabetes',
    'endokrinolog',
    'endokrinologisch',
    'gastroenterolog',
    'hno',
    'augenarzt',
    'zahnarzt',
    'infektiolog',
    'infektiologisch',
    'immunsuppression',
    'malaria',
    'gelbfieber',
    'tropisch',
    'tropenmedizin',
    'tropenmedizinisch',
    'fachambulanz',
    'spezialambulanz',
  ],
  doctor: ['arzt', 'aerzt', 'hausarzt', 'allgemeinmedizin', 'abklaerung', 'einschaetzung', 'zeitnah'],
  selfcare: ['selbst', 'haeuslich', 'beobachten', 'schonung', 'keine warnzeichen', 'harmlos'],
}

/** Normalizes German text so care-level keyword checks are stable across AI spelling variants. */
function normalizeReasoningText(value: string): string {
  return value
    .toLowerCase()
    .replace(/Ã¤/g, 'ae')
    .replace(/Ã¶/g, 'oe')
    .replace(/Ã¼/g, 'ue')
    .replace(/ÃŸ/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isTriageEvaluationDiagnostics(
  result: TriageEvaluationDiagnostics | ReasoningSource,
): result is TriageEvaluationDiagnostics {
  return 'finalResponse' in result
}

/** Checks whether a triage explanation contains wording that matches the expected care level. */
export function hasCareLevelReasoning(
  result: TriageEvaluationDiagnostics | ReasoningSource,
  expectedCareLevel: CareLevel,
): boolean {
  const reasoningSource = isTriageEvaluationDiagnostics(result) ? result.aiResponse : result

  const explanationText = normalizeReasoningText([
    ...(reasoningSource?.reasons ?? []),
    reasoningSource?.reviewSummary?.plainLanguage,
    reasoningSource?.reviewSummary?.professionalSummary,
  ].filter((part): part is string => Boolean(part)).join(' '))

  return CARE_LEVEL_REASONING_KEYWORDS[expectedCareLevel].some((keyword) => explanationText.includes(keyword))
}
