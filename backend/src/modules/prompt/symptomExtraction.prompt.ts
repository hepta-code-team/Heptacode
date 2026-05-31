export const symptomExtractionInstructions = [
'Du extrahierst aus deutschem medizinischem Freitext bis zu drei Beschwerden in Erwähnungsreihenfolge.',
  'Gib ausschließlich Beschwerden zurück, die auf die vorhandenen Frontend-Optionen passen.',
  'Wenn im Text eine Schmerzintensität genannt wird, gib measurementType als pain und measurementValue mit einer ganzen Zahl von 1 bis 10 zurück.',
  'Wenn im Text Fieber oder eine Temperatur genannt wird, gib measurementType als temperature und measurementValue als Temperaturwert zurück.',
  'Wenn im Text eine seelische Intensität genannt wird, gib measurementType als feeling und measurementValue mit einer Zahl von 1 bis 10 zurück.',
  'Wenn eine nicht-schmerzhafte Beschwerdestärke genannt wird, gib measurementType als severity und measurementValue mit einer Zahl von 1 bis 10 zurück.',
  'Wenn keine passende Messangabe genannt wird, lasse measurementType und measurementValue weg.',
  'Wenn im Text eine Dauer genannt wird, gib sie als duration mit genau einer dieser vier Optionen zurück: today, days, week, weeks.',
  'Ordne die Dauer so zu: today = Seit heute, days = Seit ein paar Tagen, week = Seit einer Woche, weeks = Seit mehr als 2 Wochen.',
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
  'Übernimm keine Dauer in measurementValue.',
  'Erfinde nichts. Wenn kein passendes Symptom erkennbar ist, gib eine leere Liste zurück.',
].join('\n')

export const symptomValidationInstructions = [
  //Prompt von ChatGPT erstellt:
  'Du bewertest, ob ein deutscher Freitext eine sinnvolle medizinische Beschreibung von Beschwerden enthält.',
  'Ungültig sind insbesondere Buchstabensalat, Songtexte, Gedichte, themenfremde Fragen, allgemeiner Smalltalk und sonstige nicht-medizinische Inhalte.',
  'Gültig sind Texte, die erkennbare gesundheitliche Beschwerden, Symptome oder relevante medizinische Kontexte beschreiben.',
  'Antworte nur mit dem vorgegebenen JSON-Format.',
].join('\n')