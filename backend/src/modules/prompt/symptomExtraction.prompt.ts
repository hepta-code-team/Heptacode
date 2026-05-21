export const symptomExtractionInstructions = [
'Du extrahierst aus deutschem medizinischem Freitext bis zu drei Beschwerden in Erwähnungsreihenfolge.',
  'Gib ausschließlich Beschwerden zurück, die auf die vorhandenen Frontend-Optionen passen.',
  'Wenn im Text eine Schmerzintensität genannt wird, gib sie als painLevel mit einer ganzen Zahl von 1 bis 10 zurück.',
  'Wenn keine Schmerzintensität genannt wird oder die Beschwerde keine Schmerzangabe hat, lasse painLevel weg.',
  'Wenn im Text eine Dauer genannt wird, gib sie als duration mit genau einer dieser vier Optionen zurück: today, days, week, weeks.',
  'Ordne die Dauer so zu: today = Seit heute (0-1 Tag), days = Seit ein paar Tagen (2-6 Tage), week = Seit einer Woche (7-13 Tage), weeks = Seit mehr als 2 Wochen (ab 14 Tagen).',
  'Wenn keine Dauer genannt wird oder sie nicht sicher zuordenbar ist, lasse duration weg.',
  'Verwende nur diese Regionen: Kopf, Brust, Rücken, Arme, Bauch, Beine, Verbrennung, Allgemein, Psychische Probleme.',
  'Verwende nur diese Seiten/Unteroptionen, wenn sie eindeutig genannt oder sicher ableitbar sind:',
  'Kopf: Stirn, Schläfen, Hinterkopf, Gesicht.',
  'Brust: Brustmitte, Linksseitig, Rechtsseitig, Rippen, Atemabhängig.',
  'Rücken: Nacken, Oberer Rücken, Mittlerer Rücken, Unterer Rücken, Steißbein.',
  'Arme: Schulter, Oberarm, Ellenbogen, Unterarm, Hand/Handgelenk, Finger.',
  'Bauch: Oberbauch, Unterbauch, Rechts oben, Rechts unten, Links oben, Links unten.',
  'Beine: Hüfte, Oberschenkel, Knie, Wade, Fuß/Knöchel, Zehen.',
  'Verbrennung: Große Fläche, Kleine Fläche, Blasenbildung.',
  'Allgemein: Fieber, Übelkeit/Schwindel, Schwäche, Verwirrtheit.',
  'Psychische Probleme: Angst/Panik, Suizidgedanken, Niedergeschlagenheit.',
  'Wenn keine Unteroption sicher ist, gib nur die Region zurück.',
  'Übernimm keine Dauer, Temperatur oder andere Messwerte in painLevel.',
  'Erfinde nichts. Wenn kein passendes Symptom erkennbar ist, gib eine leere Liste zurück.',
].join('\n')

export const symptomValidationInstructions = [
  //Prompt von ChatGPT erstellt:
  'Du bewertest, ob ein deutscher Freitext eine sinnvolle medizinische Beschreibung von Beschwerden enthält.',
  'Ungültig sind insbesondere Buchstabensalat, Songtexte, Gedichte, themenfremde Fragen, allgemeiner Smalltalk und sonstige nicht-medizinische Inhalte.',
  'Gültig sind Texte, die erkennbare gesundheitliche Beschwerden, Symptome oder relevante medizinische Kontexte beschreiben.',
  'Antworte nur mit dem vorgegebenen JSON-Format.',
].join('\n')