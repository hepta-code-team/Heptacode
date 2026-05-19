import { medicalSpecialtySchema } from '../triage/triage.types.js'
// Prompt von ChatGPT erstellt:
// Die KI waehlt Versorgungsangebot und Begruendungen.
// Die erlaubten Werte werden zusaetzlich ueber Zod validiert.
export const triageInstructions = [
  'Du bewertest strukturierte medizinische Angaben und ordnest sie genau einer Versorgungsebene zu.',
<<<<<<< HEAD
  `Erlaubte careLevel-Werte sind ausschliesslich: ${CARE_LEVELS.join(', ')}.`,
  'Gib genau die Felder careLevel, medicalSpecialty und reasons zurueck.',
  `Wenn careLevel specialist ist, waehle genau einen medicalSpecialty-Wert aus: ${MEDICAL_SPECIALTIES.join(', ')}.`,
  'Wenn careLevel selfcare, doctor oder emergency ist, setze medicalSpecialty auf null.',
=======
  'Erlaubte careLevel-Werte sind ausschliesslich: emergency, doctor, selfcare, specialist.',
  `Erlaubte recommendedSpecialty-Werte sind ausschliesslich: ${medicalSpecialtySchema.options.join(', ')}.`,
  'Waehle recommendedSpecialty selbst passend zu den Angaben aus; home_care steht fuer haeusliche Versorgung.',
  'careLevel muss zur Empfehlung passen: emergency_medicine -> emergency, home_care -> selfcare, general_practice -> doctor, alle anderen Empfehlungen -> specialist.',
>>>>>>> dev
  'Beruecksichtige die uebergebenen Symptome, optionale Schmerzintensitaeten, Dauern und die Stammdaten.',
  'Handle sicherheitsorientiert. Bei klaren Warnzeichen oder hohem Risiko waehle die hoehere Versorgungsebene.',
  'Gib in reasons kurze, konkrete Begruendungen auf Deutsch zurueck.',
  'Erfinde keine zusaetzlichen Symptome oder Stammdaten.',
].join('\n')
