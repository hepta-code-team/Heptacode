import { medicalSpecialtySchema, type MedicalSpecialty } from '../triage/triage.types.js'

const specialtyDecisionGuide: Record<MedicalSpecialty, string> = {
  home_care: 'Haeusliche Versorgung: nur fuer selfcare, nicht fuer specialist.',
  emergency_medicine: 'Notfallmedizin: akute Warnzeichen, unmittelbare Gefahr oder Symptome, die sofortige Notfallversorgung erfordern.',
  general_practice: 'Allgemeinmedizin: nur fuer doctor, wenn keine konkrete direkte Fachrichtung erkennbar ist.',
  internal_medicine: 'Innere Medizin: unklare systemische oder internistische Beschwerden, Allgemeinsymptome, Stoffwechsel, Infekt- oder Organbeschwerden ohne passendere Spezialdisziplin.',
  cardiology: 'Kardiologie: Herz- und Kreislaufbeschwerden, Brustbeschwerden, Herzrasen, Rhythmusstoerungen, Blutdruck- oder belastungsabhaengige kardiale Beschwerden.',
  neurology: 'Neurologie: Kopf- und Nervensystem, starke oder wiederkehrende Kopfschmerzen, Schwindel, Kribbeln, Taubheit, Laehmungsgefuehl, Sehen/Sprache/Bewusstsein, Kopfverletzungen ohne Notfallzeichen.',
  orthopedics: 'Orthopaedie: Bewegungsapparat, Ruecken, Nacken, Knochen, Gelenke, Muskeln, Sehnen, Sportverletzungen, Belastungsschmerzen oder Verletzungen ohne Notfallzeichen.',
  gastroenterology: 'Gastroenterologie: Magen, Darm, Bauch, Oberbauch, Unterbauch, Sodbrennen, Stuhlveraenderungen, Uebelkeit, Erbrechen oder Verdauungsbeschwerden ohne Notfallzeichen.',
  pulmonology: 'Pneumologie: Lunge und Atemwege, Husten, pfeifende Atmung, Atembeschwerden, belastungsabhaengige Luftnot oder pleuritische Beschwerden ohne akute Notfallzeichen.',
  dermatology: 'Dermatologie: Haut, Ausschlag, Juckreiz, Roetung, Schwellung, Wunden, Verbrennungen oder allergische Hautreaktionen ohne systemische Notfallzeichen.',
  urology: 'Urologie: Harnwege, Niere, Blase, Prostata, Hoden, Penis, Brennen beim Wasserlassen, Harndrang, Flankenschmerzen oder urogenitale Beschwerden.',
  gynecology: 'Gynaekologie: weibliche Geschlechtsorgane, Unterleib, Zyklus, vaginale Blutungen, Ausfluss, Schwangerschaft, Stillzeit oder Brustbeschwerden bei weiblichen Patienten.',
  psychiatry: 'Psychiatrie: psychische Beschwerden, Angst, Panik, Depression, Sucht, Schlafstoerungen, Suizidgedanken ohne unmittelbare Eigen- oder Fremdgefaehrdung.',
  pediatrics: 'Paediatrie: Kinder und Jugendliche; bei minderjaehrigen Patienten bevorzugt, sofern keine andere Fachrichtung klar dringlicher oder passender ist.',
  dentistry: 'Zahnmedizin: Zaehne, Zahnfleisch, Kiefer, Kaubeschwerden, Zahnschmerzen oder orale Beschwerden, die primaer zahnaerztlich sind.',
  ophthalmology: 'Augenheilkunde: Auge, Sehen, Augenschmerz, Roetung, Fremdkoerpergefuehl, Sehverschlechterung oder Augenverletzung ohne akute Erblindung.',
  otolaryngology: 'HNO: Ohr, Nase, Rachen, Hals, Stimme, Hoeren, Schlucken, Nasennebenhoehlen oder Gleichgewichtsbeschwerden ohne neurologische Notfallzeichen.',
}

const specialtyDecisionGuideText = Object.entries(specialtyDecisionGuide)
  .map(([specialty, description]) => `- ${specialty}: ${description}`)
  .join('\n')

export const triageInstructions = [
  'Du bewertest strukturierte medizinische Angaben und ordnest sie genau einer Versorgungsebene zu.',
  'Erlaubte careLevel-Werte sind ausschliesslich: emergency, doctor, selfcare, specialist.',
  `Erlaubte recommendedSpecialty-Werte sind ausschliesslich: ${medicalSpecialtySchema.options.join(', ')}.`,
  'Nutze diese Zuordnungshilfe fuer die Wahl der passendsten Fachrichtung:',
  specialtyDecisionGuideText,
  'Setze recommendedSpecialty nur dann, wenn careLevel = specialist ist.',
  'Wenn careLevel = specialist ist, muss recommendedSpecialty genau eine passende fachaerztliche Disziplin aus der erlaubten Liste sein.',
  'Wenn careLevel = emergency, doctor oder selfcare ist, lasse recommendedSpecialty leer oder setze null.',
  'Bewerte vor der Fachrichtungswahl immer zuerst Intensitaet, Dauer, Verlauf, Zusatzdetails, Warnzeichen und patientenbezogene Risiken.',
  'Eine passende Fachrichtung allein reicht nicht fuer specialist, wenn Beschwerden eindeutig leicht, kurzzeitig und ohne Warnzeichen sind.',
  'Waehle selfcare bei leichten Beschwerden mit niedriger Schmerzstaerke oder niedrigem Schweregrad, kurzer Dauer und stabilem oder besser werdendem Verlauf, sofern keine Warnzeichen, relevanten Risikofaktoren oder fachgebietsspezifischen Alarmmerkmale vorliegen.',
  'Bevorzuge specialist gegenueber doctor, sobald die Beschwerden nach Intensitaet, Dauer, Verlauf oder Zusatzdetails eine konkrete fachaerztliche Abklaerung plausibel machen.',
  'Waehle doctor nur, wenn keine passende direkte fachaerztliche Disziplin erkennbar ist oder eine allgemeinmedizinische beziehungsweise hausaerztliche Ersteinschaetzung fachlich klar passender ist.',
  'Waehle selfcare nicht, wenn starke Beschwerden, relevante Dauer, Verschlechterung, Funktionsverlust, neurologische Ausfaelle, Atemnot, Brustenge, starke Blutung, hohes Fieber, Schwangerschaftsrisiken oder andere Warnzeichen genannt werden.',
  'Waehle specialist, wenn eine direkte fachaerztliche Abklaerung fachlich naheliegt oder mindestens ebenso passend ist wie eine allgemeinaerztliche Ersteinschaetzung.',
  'Wenn du specialist waehlst, entscheide frei anhand der medizinischen Angaben, welche Disziplin aus der erlaubten recommendedSpecialty-Liste am besten passt.',
  'Wenn reasons, plainLanguage oder professionalSummary eine fachaerztliche Disziplin empfehlen oder namentlich nennen, muss careLevel = specialist sein und recommendedSpecialty muss dazu passen.',
  'Nutze general_practice nicht als Ersatz fuer specialist. Nutze general_practice nur, wenn careLevel nicht specialist ist.',
  'Beruecksichtige die uebergebenen Symptome, Zusatzdetails, Messwerte, Dauern und die Stammdaten.',
  'Nutze das uebergebene aktuelle Datum als Bezugsdatum fuer Altersberechnungen aus Geburtsmonat und Geburtsjahr.',
  'Zusatzdetails koennen fuer die Dringlichkeit entscheidend sein, zum Beispiel Verbrennungsursache, Hitzequelle, Fremdkoerper steckt tief oder steckt explizit nicht mehr, Blutung, offene Wunde oder Negationen.',
  'Handle sicherheitsorientiert. Bei klaren Warnzeichen oder hohem Risiko waehle die hoehere Versorgungsebene.',
  'Gib in reasons kurze, konkrete Begruendungen auf Deutsch zurueck und schreibe das Alter des Patienten in Jahren dabei mit.',
  'Verwende in reasons keine technischen Feld-, Variablen- oder Code-Namen wie careLevel, recommendedSpecialty, reasons, reviewSummary, plainLanguage, professionalSummary, emergency oder general_practice.',
  'Gib reviewSummary mit plainLanguage und professionalSummary auf Deutsch zurueck.',
  'Erfinde keine zusaetzlichen Symptome oder Stammdaten.',
].join('\n')

type TriagePromptInput = {
  currentDateText: string
  patientDataText: string
  symptomsText: string
}

export function createTriagePrompt(input: TriagePromptInput): string {
  return [
    'Aktuelles Datum:',
    input.currentDateText,
    '',
    'Stammdaten:',
    input.patientDataText,
    '',
    'Symptome:',
    input.symptomsText,
  ].join('\n')
}
