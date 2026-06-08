import type {SymptomInputType} from '../../../../shared/symptomExtraction.types.js'

type SymptomExtractionPromptInput = {
  text: String
  inputType: SymptomInputType
}

export const symptomExtractionInstructions = [
'Du extrahierst aus deutschem medizinischem Freitext bis zu drei medizinisch relevante Probleme in Erwähnungsreihenfolge.',
  'Als medizinisch relevante Probleme gelten Symptome, Beschwerden, Verletzungen, Unfälle, Wunden, Fremdkoerper, Vergiftungen, Blutungen, Schwellungen, Verbrennungen, Funktionsverluste, Gefuehlsstoerungen und Verlust oder Abtrennung von Koerperteilen.',
  'Arbeite pro Beschwerde in dieser Reihenfolge:',
  '1. Pruefe zuerst, ob das medizinische Problem sinngemaess zu einer vorhandenen Region oder Unteroption der Liste passt. Die Benennung muss nicht 1:1 gleich sein.',
  '2. Wenn das Problem inhaltlich ausreichend von der Liste abgedeckt ist, nutze die passende vorhandene Region und, wenn passend, die passende Unteroption als side.',
  '3. Wenn keine vorhandene Region oder Unteroption das Problem ohne relevanten Informationsverlust abdeckt, verwende einen kurzen, eindeutigen und medizinisch richtigen Freitextnamen als eigene region.',
  'Der Name in region muss fuer die Anzeige auf der Detailseite eindeutig und medizinisch richtig sein.',
  'Formuliere eigene Freitext-region-Namen knapp als medizinisches Problem, nicht als ganzen Satz. Bewahre die wichtige Ursache oder Art der Verletzung, wenn sie fuer die Einschaetzung relevant ist.',
  'Erkenne selbstständig, ob pro Beschwerde eine Schmerzintensität genannt wird. Wenn ja, gib measurementType als pain und measurementValue mit einer ganzen Zahl von 1 bis 10 zurück.',
  'Wenn im Text Fieber oder eine Temperatur genannt wird, gib measurementType als temperature und measurementValue als Temperaturwert zurück.',
  'Wenn im Text eine seelische Intensität genannt wird, gib measurementType als feeling und measurementValue mit einer Zahl von 1 bis 10 zurück.',
  'Wenn eine nicht-schmerzhafte Beschwerdestärke genannt wird, gib measurementType als severity und measurementValue mit einer Zahl von 1 bis 10 zurück.',
  'Setze measurementValue nur, wenn die Stärke ausdrücklich genannt wird, zum Beispiel als Zahl, "leicht", "mittel", "stark" oder vergleichbar.',
  'Leite keine Stärke aus medizinischer Dringlichkeit ab. Blut, Atemnot, Erbrechen oder andere Warnzeichen sind keine Messangabe.',
  'Wenn keine passende Messangabe genannt wird, lasse measurementValue weg.',
  'Erkenne selbstständig, ob pro Beschwerde eine Dauer genannt wird. Wenn ja, gib sie als duration mit genau einer dieser vier Optionen zurück: today, days, week, weeks.',
  'Ordne die Dauer so zu: today = Seit heute (0-1 Tag), days = Seit ein paar Tagen (2-6 Tage), week = Seit einer Woche (7-13 Tage), weeks = Seit mehr als 2 Wochen (ab 14 Tagen).',
  'Wenn keine Dauer genannt wird oder sie nicht sicher zuordenbar ist, lasse duration weg.',
  'Vorhandene Regionen und Unteroptionen:',
  'Kopf: Stirn, Schläfen, Hinterkopf, Gesicht.',
  'Brust: Brustmitte, Linksseitig, Rechtsseitig, Rippen, Atemabhängig.',
  'Rücken: Nacken, Oberer Rücken, Mittlerer Rücken, Unterer Rücken, Steißbein.',
  'Arme: Schulter, Oberarm, Ellenbogen, Unterarm, Hand/Handgelenk, Finger.',
  'Bauch: Oberbauch, Unterbauch, Rechts oben, Rechts unten, Links oben, Links unten.',
  'Beine: Hüfte, Oberschenkel, Knie, Wade, Fuß/Knöchel, Zehen.',
  'Verbrennung: Große Fläche, Kleine Fläche, Blasenbildung.',
  'Allgemein: Fieber, Übelkeit/Schwindel, Schwäche, Verwirrtheit.',
  'Psychische Probleme: Angst/Panik, Suizidgedanken, Niedergeschlagenheit.',
  'Beispiele fuer Mapping auf vorhandene Eintraege: "Kopfschmerzen" -> region "Kopf"; "Fieber" -> region "Allgemein", side "Fieber"; "Schmerzen im unteren Ruecken" -> region "Rücken", side "Unterer Rücken".',
  'Beispiele fuer eigene Freitext-region, weil die Liste es nicht ausreichend abdeckt: "Husten", "Halsschmerzen", "Hautausschlag", "Blutiger Auswurf", "Blutiges Erbrechen", "Nageltrittverletzung", "Amputierter Arm".',
  'Bewahre medizinisch relevante Qualifikatoren im Freitext-Symptomnamen, zum Beispiel blutig, eitrig, brennend, anfallsartig, taub, geschwollen, juckend, ausstrahlend, offen, tief, durchtrennt, eingetreten, abgetrennt oder verschluckt.',
  'Fasse spezifische Freitext-Beschwerden nicht zu Allgemein, Bauch, Brust oder einer anderen groben vorhandenen Region zusammen, wenn dadurch Inhalt verloren geht.',
  'Wenn du ein eigenes Freitext-Symptom verwendest, muss region der Symptomname sein, nicht eine grobe Kategorie. Nutze side dann nur fuer eine eindeutige Lokalisation oder Zusatzangabe.',
  'Wenn keine Unteroption sicher ist, gib nur die Region zurück.',
  'Übernimm keine Dauer in measurementValue.',
  'Erfinde nichts. Wenn kein passendes Symptom erkennbar ist, gib eine leere Liste zurück.',
].join('\n')

export function createSymptomExtractionPrompt(input: SymptomExtractionPromptInput): string {
  return [
    `Input-Typ: ${input.inputType}`,
    `Freitext: ${input.text}`,
  ].join('\n')
}

export const symptomValidationInstructions = [
  //Prompt von ChatGPT erstellt:
  'Du bewertest, ob ein deutscher Freitext eine sinnvolle medizinische Beschreibung oder einen medizinisch relevanten Kontext enthält.',
  'Ungültig sind insbesondere Buchstabensalat, Songtexte, Gedichte, themenfremde Fragen, allgemeiner Smalltalk und sonstige nicht-medizinische Inhalte.',
  'Gültig sind Texte, die erkennbare gesundheitliche Beschwerden, Symptome, Verletzungen, Unfälle, Wunden, Fremdkoerper, Vergiftungen, Blutungen, Funktionsverluste oder andere relevante medizinische Kontexte beschreiben.',
  'Antworte nur mit dem vorgegebenen JSON-Format.',
].join('\n')

export function createSymptomValidationPrompt(input: SymptomExtractionPromptInput): string {
  return [
    `Input-Typ: ${input.inputType}`,
    `Freitext: ${input.text}`,
  ].join('\n')
}
