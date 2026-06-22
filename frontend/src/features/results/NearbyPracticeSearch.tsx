import { useState } from "react";
import type { FormEvent } from "react";
import { Clock, LocateFixed, MapPin, Navigation, Search } from "lucide-react";
import { MEDICAL_SPECIALTY_LABELS } from "./result.config";
import type { CareLevel, MedicalSpecialty } from "../../types/triage";
import type { NearbyPlace, NearbyPlacesResponse } from "../../../../shared/nearbyPlaces.types";
import { apiClient } from "../../lib/apiClient";

// Gesamtlogik dieser Komponente:
// 1. Versorgungsebene aus dem Triage-Ergebnis entgegennehmen.
// 2. Standort entweder per Browser-Geolocation oder manueller PLZ/Adresse bestimmen.
// 3. Passende Einrichtungen bevorzugt ueber Google Places suchen.
// 4. Rohdaten in UI-Objekte normalisieren und nach Qualitaet filtern.
// 5. Bei einem Google-Ausfall auf OpenStreetMap/Overpass zurueckfallen.
interface NearbyPracticeSearchProps {
  // careLevel kommt aus dem Triage-Ergebnis und steuert, welche Art von Einrichtung gesucht wird.
  careLevel: CareLevel;
  // specialties ist nur bei Facharzt-Empfehlungen relevant und kann leer bleiben.
  specialties?: MedicalSpecialty[];
}

// Interne, normalisierte Darstellung eines Overpass-Treffers fuer die UI.
type Facility = {
  id: string;
  name: string;
  hasKnownName: boolean;
  type: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  address: string;
  priority: "recommended" | "additional";
  distanceMeters: number;
  source: "google" | "osm";
  openNow?: boolean;
  weekdayDescriptions?: string[];
  nextCloseTime?: string;
};

// Die einzelnen Statuswerte trennen Standortabfrage, externe Suche und Fehlermeldungen sauber.
type LocationStatus =
  | "idle"
  | "loading"
  | "geocoding"
  | "searching"
  | "ready"
  | "empty"
  | "denied"
  | "unsupported"
  | "not_found"
  | "error";

// Browser-Geolocation liefert zusaetzlich eine Genauigkeit; manuelle Suche nutzt geocodierte Koordinaten.
type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: "browser" | "manual";
  label?: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

function createGoogleMapsRouteUrl(facility: Facility, origin: UserLocation) {
  // Ziel ist die gefundene Einrichtung.
  const destination = `${facility.latitude},${facility.longitude}`;
  // Start ist der freigegebene oder manuell geocodierte Standort des Nutzers.
  const start = `${origin.latitude},${origin.longitude}`;

  // Google Maps bekommt Start, Ziel und Verkehrsmittel als URL-Parameter.
  return `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${destination}&travelmode=driving`;
}

function calculateDistanceMeters(from: Coordinates, to: Coordinates) {
  // Erdradius in Metern; Grundlage fuer die Distanzberechnung auf einer Kugel.
  const earthRadiusMeters = 6371000;
  // Hilfsfunktion: Gradwerte in Radiant umrechnen, weil Math.sin/cos Radiant erwarten.
  const toRadians = (value: number) => (value * Math.PI) / 180;
  // Differenz zwischen Start- und Zielbreitengrad.
  const latDelta = toRadians(to.latitude - from.latitude);
  // Differenz zwischen Start- und Ziellaengengrad.
  const lonDelta = toRadians(to.longitude - from.longitude);
  // Startbreitengrad in Radiant.
  const fromLat = toRadians(from.latitude);
  // Zielbreitengrad in Radiant.
  const toLat = toRadians(to.latitude);
  // Zwischenergebnis der Haversine-Formel.
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  // Haversine-Formel: berechnet die Luftlinienentfernung zwischen zwei Geo-Koordinaten.
  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

function formatDistance(distanceMeters: number) {
  // Unter einem Kilometer ist Meter-Anzeige fuer Nutzer meist greifbarer.
  if (distanceMeters < 1000) {
    // Beispiel: 850 -> "850 m".
    return `${distanceMeters} m`;
  }

  // Ab einem Kilometer wird in Kilometer mit maximal einer Nachkommastelle formatiert.
  return `${(distanceMeters / 1000).toLocaleString("de-DE", {
    maximumFractionDigits: 1,
  })} km`;
}

function extractGermanPostalCode(value: string) {
  return value.match(/(?:^|\D)(\d{5})(?:\D|$)/)?.[1] ?? null;
}

function addressMatchesPostalCode(address: string, postalCode: string) {
  return address.match(/\b\d{5}\b/)?.[0] === postalCode;
}

const OSM_DAY_LABELS: Record<string, string> = {
  Mo: "Mo",
  Tu: "Di",
  We: "Mi",
  Th: "Do",
  Fr: "Fr",
  Sa: "Sa",
  Su: "So",
  PH: "Feiertage",
};

function localizeOpeningHoursPart(value: string) {
  // OSM nutzt englische Tageskuerzel; die UI soll deutsche Kuerzel anzeigen.
  return value
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (day) => OSM_DAY_LABELS[day] ?? day)
    // Leerzeichen nach Kommas vereinheitlichen, z. B. "Mo,Tu" -> "Mo, Tu".
    .replace(/\s*,\s*/g, ", ")
    // Leerzeichen um Bereiche entfernen, z. B. "Mo - Fr" -> "Mo-Fr".
    .replace(/\s*-\s*/g, "-")
    // Fuehrende/abschliessende Leerzeichen entfernen.
    .trim();
}

function getFacilityType(careLevel: CareLevel, specialties: MedicalSpecialty[]) {
  // Fallback-Label, falls ein OSM-Eintrag keinen genaueren Typ liefert.
  if (careLevel === "emergency") return "Notaufnahme";
  if (careLevel === "specialist" && specialties.length > 0) return MEDICAL_SPECIALTY_LABELS[specialties[0]];
  if (careLevel === "selfcare") return "Apotheke";
  return "Hausarzt";
}

const WEEKDAY_INDEX: Record<string, number> = {
  // Date.getDay() nutzt Sonntag als 0; OSM nutzt englische Tageskuerzel.
  Su: 0,
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
};

function parseTimeToMinutes(value: string) {
  // Minuten seit Tagesbeginn erleichtern spaetere Vergleiche mit Zeitfenstern.
  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  // Ungueltige Zeitangaben koennen nicht verglichen werden.
  if (!match) {
    return null;
  }

  // Stundenanteil aus dem Regex-Match lesen.
  const hours = Number(match[1]);
  // Minutenanteil aus dem Regex-Match lesen.
  const minutes = Number(match[2]);

  // "24:00" ist erlaubt, "24:30" aber nicht.
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes !== 0)) {
    return null;
  }

  // Beispiel: "14:30" -> 870 Minuten.
  return hours * 60 + minutes;
}

function dayMatches(ruleDays: string | undefined, currentDay: number) {
  // Ohne Tagesangabe gilt die Regel fuer jeden Tag.
  if (!ruleDays) {
    return true;
  }

  // OSM-Oeffnungszeiten koennen einzelne Tage ("Mo") oder Bereiche ("Mo-Fr") enthalten.
  return ruleDays.split(",").some((dayPart) => {
    // Einzelnen Tagesausdruck bereinigen.
    const trimmedDayPart = dayPart.trim();
    // Bereich erkennen, z. B. "Mo-Fr".
    const rangeMatch = trimmedDayPart.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/);
    // Einzelnen Tag in Date.getDay()-Index uebersetzen.
    const singleDay = WEEKDAY_INDEX[trimmedDayPart];

    // Wenn es ein einzelner Tag ist, reicht ein direkter Vergleich.
    if (singleDay !== undefined) {
      return singleDay === currentDay;
    }

    // Ist es weder einzelner Tag noch Bereich, wird die Regel nicht als Treffer gewertet.
    if (!rangeMatch) {
      return false;
    }

    // Starttag des Bereichs.
    const startDay = WEEKDAY_INDEX[rangeMatch[1]];
    // Endtag des Bereichs.
    const endDay = WEEKDAY_INDEX[rangeMatch[2]];

    // Falls ein Tageskuerzel unbekannt ist, kann der Bereich nicht ausgewertet werden.
    if (startDay === undefined || endDay === undefined) {
      return false;
    }

    // Normaler Bereich innerhalb derselben Woche, z. B. Mo-Fr.
    if (startDay <= endDay) {
      return currentDay >= startDay && currentDay <= endDay;
    }

    // Bereich ueber den Wochenwechsel, z. B. Fr-Mo.
    return currentDay >= startDay || currentDay <= endDay;
  });
}

type OpeningHoursDisplay = {
  hoursLabel: string;
  statusLabel: "Geöffnet" | "Schließt bald" | "Geschlossen" | "Status unbekannt";
  statusColor: string;
};

function getOpeningHoursDisplay(openingHours: string, now = new Date()): OpeningHoursDisplay {
  const normalizedOpeningHours = openingHours.trim();

  if (normalizedOpeningHours === "24/7") {
    return {
      hoursLabel: "Heute: Durchgehend geöffnet",
      statusLabel: "Geöffnet",
      statusColor: "#65A30D",
    };
  }

  const currentDay = now.getDay();
  const previousDay = (currentDay + 6) % 7;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDayKey = Object.keys(WEEKDAY_INDEX).find((day) => WEEKDAY_INDEX[day] === currentDay) ?? "";
  const todayLabel = OSM_DAY_LABELS[currentDayKey] ?? "Heute";
  const todaysTimes: string[] = [];
  let activeTimes: string | null = null;
  let minutesUntilClosing: number | null = null;

  normalizedOpeningHours.split(";").forEach((rule) => {
    const trimmedRule = rule.trim();
    const timeMatch = trimmedRule.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})*/);

    if (!timeMatch || /\boff\b/i.test(trimmedRule)) {
      return;
    }

    const dayExpression = trimmedRule.slice(0, timeMatch.index).trim();
    const ruleTimes = timeMatch[0].replace(/\s/g, "");

    if (dayMatches(dayExpression || undefined, currentDay)) {
      todaysTimes.push(localizeOpeningHoursPart(ruleTimes));
    }

    ruleTimes.split(",").forEach((timePart) => {
      const intervalMatch = timePart.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);

      if (!intervalMatch) {
        return;
      }

      const startMinutes = parseTimeToMinutes(intervalMatch[1]);
      const endMinutes = parseTimeToMinutes(intervalMatch[2]);

      if (startMinutes === null || endMinutes === null) {
        return;
      }

      const startsToday = dayMatches(dayExpression || undefined, currentDay);
      const startedYesterday = dayMatches(dayExpression || undefined, previousDay);
      const isOvernight = startMinutes > endMinutes;
      const isActiveToday = startsToday && !isOvernight && currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      const isActiveBeforeMidnight = startsToday && isOvernight && currentMinutes >= startMinutes;
      const isActiveAfterMidnight = startedYesterday && isOvernight && currentMinutes <= endMinutes;

      if (!isActiveToday && !isActiveBeforeMidnight && !isActiveAfterMidnight) {
        return;
      }

      activeTimes = localizeOpeningHoursPart(ruleTimes);
      minutesUntilClosing = isActiveBeforeMidnight
        ? 24 * 60 - currentMinutes + endMinutes
        : endMinutes - currentMinutes;
    });
  });

  const uniqueTodaysTimes = todaysTimes.filter((times, index) => todaysTimes.indexOf(times) === index);
  const displayTimes = uniqueTodaysTimes.length > 0 ? uniqueTodaysTimes : activeTimes ? [activeTimes] : [];
  const closesSoon = minutesUntilClosing !== null && minutesUntilClosing <= 60;

  return {
    hoursLabel: `${todayLabel}: ${displayTimes.join(", ") || "Geöffnet"}`,
    statusLabel: closesSoon ? "Schließt bald" : "Geöffnet",
    statusColor: closesSoon ? "#EAB308" : "#65A30D",
  };
}

function getGoogleOpeningHoursDisplay(facility: Facility, now = new Date()): OpeningHoursDisplay {
  if (facility.openNow === false) {
    return {
      hoursLabel: "Öffnungszeiten",
      statusLabel: "Geschlossen",
      statusColor: "#DC2626",
    };
  }

  if (facility.openNow === undefined) {
    return {
      hoursLabel: "Öffnungszeiten nicht verfügbar",
      statusLabel: "Status unbekannt",
      statusColor: "#64748B",
    };
  }

  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(now).toLowerCase();
  const todayDescription = facility.weekdayDescriptions?.find((description) =>
    description.toLowerCase().startsWith(weekday),
  );
  const closingTime = facility.nextCloseTime ? new Date(facility.nextCloseTime).getTime() : null;
  const millisecondsUntilClosing = closingTime === null ? null : closingTime - now.getTime();
  const closesSoon =
    millisecondsUntilClosing !== null &&
    millisecondsUntilClosing >= 0 &&
    millisecondsUntilClosing <= 60 * 60 * 1000;

  return {
    hoursLabel: todayDescription?.replace(/^[^:]+:/, "Heute:") ?? "Heute: Geöffnet",
    statusLabel: closesSoon ? "Schließt bald" : "Geöffnet",
    statusColor: closesSoon ? "#EAB308" : "#65A30D",
  };
}

function getFacilityOpeningHoursDisplay(facility: Facility) {
  return facility.source === "google"
    ? getGoogleOpeningHoursDisplay(facility)
    : getOpeningHoursDisplay(facility.openingHours);
}

function isOpenNow(openingHours: string | undefined, now = new Date()) {
  // Ohne Oeffnungszeiten wird der Eintrag bewusst ausgeblendet,
  // damit keine geschlossenen Einrichtungen als Hilfe erscheinen.
  if (!openingHours) {
    return false;
  }

  const normalizedOpeningHours = openingHours.trim();

  if (normalizedOpeningHours === "24/7") {
    return true;
  }

  const currentDay = now.getDay();
  const previousDay = (currentDay + 6) % 7;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Unterstuetzt die wichtigsten OSM-Formate wie "Mo-Fr 08:00-18:00; Sa 09:00-12:00".
  // Einzelne "off"-Regeln zaehlen nur fuer die Anzeige, nicht als geoeffnete Zeit.
  return normalizedOpeningHours.split(";").some((rule) => {
    // Jede Semikolon-Regel einzeln auswerten.
    const trimmedRule = rule.trim();
    // Geschlossen-Regel erkennen.
    const offMatch = trimmedRule.match(/^(.*)\boff\b$/i);

    // Geschlossen-Regeln duerfen nie als "jetzt offen" zaehlen.
    if (offMatch) {
      return false;
    }

    // Tagesausdruck und Zeitfenster aus der Regel lesen.
    const match = trimmedRule.match(/^(?:(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)?\s*(\d{1,2}:\d{2}-\d{1,2}:\d{2}(?:,\d{1,2}:\d{2}-\d{1,2}:\d{2})*)$/);

    // Unbekannte Syntax wird vorsichtig als "nicht offen" behandelt.
    if (!match) {
      return false;
    }

    // Alles vor dem Zeitfenster ist der Tagesausdruck.
    const dayExpression = trimmedRule.slice(0, trimmedRule.length - match[3].length).trim();

    return match[3].split(",").some((timePart) => {
      const timeMatch = timePart.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);

      if (!timeMatch) {
        return false;
      }

      const startMinutes = parseTimeToMinutes(timeMatch[1]);
      const endMinutes = parseTimeToMinutes(timeMatch[2]);

      if (startMinutes === null || endMinutes === null) {
        return false;
      }

      if (startMinutes <= endMinutes) {
        return (
          dayMatches(dayExpression || undefined, currentDay) &&
          currentMinutes >= startMinutes &&
          currentMinutes <= endMinutes
        );
      }

      return (
        (dayMatches(dayExpression || undefined, currentDay) && currentMinutes >= startMinutes) ||
        (dayMatches(dayExpression || undefined, previousDay) && currentMinutes <= endMinutes)
      );
    });
  });
}

function isNightTime(now = new Date()) {
  const hour = now.getHours();

  // Nachtmodus: ab 20 Uhr bis vor 6 Uhr werden Apotheken staerker beruecksichtigt.
  return hour >= 20 || hour < 6;
}

// Reduzierter Ausschnitt der Overpass-Antwort, nur mit Feldern, die diese Komponente braucht.
type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type NominatimPlace = {
  lat: string;
  lon: string;
  display_name?: string;
};

const OVERPASS_API_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
// Stammdatenregel fuer die BDZ Ludwigshafen.
// Die Regel ist eng ueber Name/Adresse begrenzt und betrifft keine anderen Einrichtungen.
const BDZ_LUDWIGSHAFEN_OPENING_HOURS = "Mo off; Tu off; We 14:00-22:00; Th off; Fr 16:00-22:00; Sa-Su 09:00-22:00";

function getSearchIntro(careLevel: CareLevel, includeNightPharmacies: boolean) {
  // Die Beschreibung im UI soll zur aktuellen Versorgungsebene passen.
  if (careLevel === "emergency") {
    return "Auf Wunsch zeigen wir Notaufnahmen und Notfallapotheken in Ihrer Nähe, sortiert nach Entfernung.";
  }

  // Bei Selbstversorgung interessieren zuerst Apotheken.
  if (careLevel === "selfcare") {
    return "Auf Wunsch zeigen wir Apotheken in Ihrer Nähe, sortiert nach Entfernung.";
  }

  // Bei Facharzt-Empfehlungen wird die Beschreibung auf Fachstellen ausgerichtet.
  if (careLevel === "specialist") {
    return includeNightPharmacies
      ? "Auf Wunsch zeigen wir Fachstellen und ergänzend Nacht-Apotheken in Ihrer Nähe."
      : "Auf Wunsch zeigen wir Fachstellen in Ihrer Nähe, sortiert nach Entfernung.";
  }

  // Standardfall: Hausarzt/Praxis, nachts mit Apotheke als Zusatzoption.
  return includeNightPharmacies
    ? "Auf Wunsch zeigen wir Praxen und ergänzend Nacht-Apotheken in Ihrer Nähe."
    : "Auf Wunsch zeigen wir Praxen in Ihrer Nähe, sortiert nach Entfernung.";
}

function getEmptyMessage(careLevel: CareLevel) {
  // Leerer Zustand fuer Notfall soll ausdruecklich Notaufnahmen nennen.
  if (careLevel === "emergency") {
    return "Für die empfohlene Versorgungsebene wurden in Ihrer Nähe keine Notaufnahmen mit vollständiger Adresse gefunden.";
  }

  // Allgemeiner leerer Zustand fuer alle anderen Versorgungsebenen.
  return "Für die empfohlene Versorgungsebene wurden in Ihrer Nähe keine Einträge mit vollständiger Adresse gefunden.";
}

function getSearchRadius(careLevel: CareLevel, includeNightPharmacies: boolean) {
  // Jede Versorgungsebene hat einen eigenen Suchradius.
  // Seltene Treffer wie Fachstellen oder Nachtversorgung brauchen einen groesseren Radius.
  if (careLevel === "emergency") return 12000;
  if (includeNightPharmacies) return 20000;
  if (careLevel === "specialist") return 15000;
  return 8000;
}

function getOverpassFilters(careLevel: CareLevel, includeNightPharmacies: boolean) {
  // Die Versorgungsebene wird hier in konkrete OSM-Tags uebersetzt.
  // OSM ist nicht einheitlich gepflegt, deshalb werden mehrere Tag-Varianten abgefragt.
  if (careLevel === "emergency") {
    // Notfall: Notaufnahmen sind Haupttreffer, Apotheken werden spaeter als Zusatzoption markiert.
    return [
      '["amenity"="hospital"]',
      '["healthcare"="hospital"]',
      '["emergency"="yes"]',
      '["emergency"="designated"]',
      '["healthcare:speciality"="emergency"]',
      '["amenity"="pharmacy"]',
      '["healthcare"="pharmacy"]',
    ];
  }

  // Fuer Selbstversorgung werden keine Praxen gesucht, sondern nur Apotheken weiter unten.
  const filters = careLevel === "selfcare" ? [] : [
    '["amenity"="doctors"]',
    '["amenity"="clinic"]',
    '["healthcare"="doctor"]',
    '["healthcare"="clinic"]',
  ];

  // Bei Selbstversorgung oder nachts werden Apotheken als eigene Trefferquelle aufgenommen.
  if (careLevel === "selfcare" || includeNightPharmacies) {
    // OSM kann Apotheken entweder als amenity oder healthcare taggen.
    filters.push(
      '["amenity"="pharmacy"]',
      '["healthcare"="pharmacy"]',
    );
  }

  return filters;
}

function buildOverpassQuery(location: UserLocation, careLevel: CareLevel, includeNightPharmacies: boolean) {
  // Suchradius aus Versorgungsebene und Nachtmodus ableiten.
  const radius = getSearchRadius(careLevel, includeNightPharmacies);
  // OSM-Filter aus Versorgungsebene ableiten.
  const filters = getOverpassFilters(careLevel, includeNightPharmacies);

  // Overpass braucht fuer Nodes, Ways und Relations getrennte Lookups.
  // "out center tags" liefert bei Flaechenobjekten einen Mittelpunkt plus Metadaten.
  const lookups = filters.flatMap((filter) => [
    // Punktobjekte im Radius suchen.
    `node(around:${radius},${location.latitude},${location.longitude})${filter};`,
    // Flaechen/Linien im Radius suchen.
    `way(around:${radius},${location.latitude},${location.longitude})${filter};`,
    // Relationen im Radius suchen.
    `relation(around:${radius},${location.latitude},${location.longitude})${filter};`,
  ]);

  // Query als Overpass-QL zusammensetzen.
  return `[out:json][timeout:15];(${lookups.join("")});out center tags;`;
}

async function geocodeManualLocation(query: string): Promise<UserLocation | null> {
  // Nutzereingabe bereinigen.
  const trimmedQuery = query.trim();

  // Leere Eingaben werden nicht gesucht.
  if (!trimmedQuery) {
    return null;
  }

  // Nominatim-Parameter fuer die Adresssuche.
  const searchParams = new URLSearchParams({
    // Die eingegebene PLZ/Adresse.
    q: trimmedQuery,
    // JSON-Ausgabe im modernen Nominatim-Format.
    format: "jsonv2",
    // Nur der beste Treffer reicht fuer unseren Suchmittelpunkt.
    limit: "1",
    // Adressdetails erlauben spaetere Erweiterungen.
    addressdetails: "1",
    // Suche auf Deutschland begrenzen.
    countrycodes: "de",
  });

  // Manuelle PLZ-/Adresssuche nutzt Nominatim nur zur Koordinaten-Ermittlung.
  // Die eigentlichen Einrichtungen werden danach ueber Google Places gesucht.
  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${searchParams.toString()}`, {
    headers: {
      // Wir erwarten JSON und vermeiden HTML-Fallbacks.
      Accept: "application/json",
    },
  });

  // HTTP-Fehler werden als technische Fehler behandelt.
  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`);
  }

  // Antwort typisiert als Liste moeglicher Orte lesen.
  const places = (await response.json()) as NominatimPlace[];
  // Nur der beste Treffer wird verwendet.
  const place = places[0];

  // Kein Treffer -> UI-Zustand "not_found".
  if (!place) {
    return null;
  }

  // Nominatim liefert Koordinaten als Strings.
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);

  // Ungueltige Koordinaten werden verworfen.
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  // Rueckgabe im selben Format wie Browser-Geolocation, aber mit source "manual".
  return {
    latitude,
    longitude,
    source: "manual",
    label: place.display_name ?? trimmedQuery,
  };
}

function formatAddress(tags: Record<string, string>) {
  // Datenqualitaetsregel: Ohne Strasse und PLZ wird kein Treffer angezeigt.
  // Dadurch vermeiden wir Vorschlaege, die nur aus Koordinaten oder einer groben Ortsangabe bestehen.
  if (!tags["addr:street"] || !tags["addr:postcode"]) {
    return null;
  }

  // Strasse und Hausnummer zu einem Strassenteil zusammensetzen.
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  // PLZ und Stadt zu einem Ortsteil zusammensetzen.
  const city = [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");

  // Ergebnis fuer die Karte: "Strasse Hausnummer, PLZ Stadt".
  return [street, city].filter(Boolean).join(", ");
}

function getFacilityName(tags: Record<string, string>, fallbackType: string) {
  // Manche OSM-Eintraege haben keinen Namen, aber einen Betreiber.
  // Falls beides fehlt, bleibt der Einrichtungstyp als technischer Fallback.
  return tags.name || tags.operator || fallbackType;
}

function hasKnownFacilityName(tags: Record<string, string>) {
  // Der Typ allein ("Notaufnahme") ist keine echte Ortsbezeichnung.
  // Deshalb gelten nur name oder operator als bekannter Name.
  return Boolean(tags.name || tags.operator);
}

function getFacilityLabel(
  tags: Record<string, string>,
  careLevel: CareLevel,
  specialties: MedicalSpecialty[],
  includeNightPharmacies: boolean,
) {
  // Aus OSM-Tags und Triage-Kontext entsteht die sichtbare Kategorie der Karte.
  // Apotheken haben Vorrang, weil sie je nach Kontext Apotheke, Nacht-Apotheke oder Notfallapotheke sind.
  if (tags.amenity === "pharmacy" || tags.healthcare === "pharmacy") {
    // Bei Notfallversorgung wird eine Apotheke als Notfallapotheke beschriftet.
    if (careLevel === "emergency") return "Notfallapotheke";
    // Nachts ist sie eine Zusatzoption zur eigentlichen Empfehlung.
    return includeNightPharmacies && careLevel !== "selfcare" ? "Nacht-Apotheke" : "Apotheke";
  }

  // Fuer alle anderen Treffer wird die Kategorie aus Einrichtungstag und Versorgungsebene abgeleitet.
  // Krankenhaeuser oder emergency=yes werden als Notaufnahme angezeigt.
  if (tags.amenity === "hospital" || tags.healthcare === "hospital" || tags.emergency === "yes") return "Notaufnahme";
  // Facharzt-Empfehlungen verwenden das erste empfohlene Fachgebiet als Label.
  if (careLevel === "specialist" && specialties.length > 0) return MEDICAL_SPECIALTY_LABELS[specialties[0]];
  // Kliniken ohne Krankenhaus-Kontext werden neutraler benannt.
  if (tags.amenity === "clinic" || tags.healthcare === "clinic") return "Praxis / Klinik";
  // Letzter Fallback basiert nur auf der Versorgungsebene.
  return getFacilityType(careLevel, specialties);
}

function isBdzLudwigshafen(tags: Record<string, string>) {
  // Erkennung der Stammdatenregel ueber Name oder Adresse.
  // So bleibt die Logik stabil, wenn der OSM-Anzeigename leicht variiert.
  // Name und Alternativname werden gemeinsam durchsucht.
  const name = `${tags.name ?? ""} ${tags.alt_name ?? ""}`.toLowerCase();
  // Adresse wird als zweite Erkennungsstrategie genutzt.
  const street = tags["addr:street"]?.toLowerCase() ?? "";
  const postcode = tags["addr:postcode"] ?? "";

  // Treffer, wenn Name passt oder die bekannte Adresse passt.
  return (
    (name.includes("bereitschaft") && name.includes("ludwigshafen")) ||
    (street.includes("steiermarkstraße") && postcode === "67065")
  );
}

function isPharmacy(tags: Record<string, string>) {
  // OSM kann Apotheken in zwei gaengigen Feldern speichern.
  return tags.amenity === "pharmacy" || tags.healthcare === "pharmacy";
}

function getEffectiveOpeningHours(tags: Record<string, string>, careLevel: CareLevel) {
  // Reihenfolge der Oeffnungszeitenlogik:
  // 1. lokale Stammdatenregeln
  // 2. Notfall-Fallback fuer Krankenhaeuser ohne OSM-Oeffnungszeiten
  // 3. Originalwert aus OSM
  if (isBdzLudwigshafen(tags)) {
    // Fuer diese Einrichtung verwenden wir die interne Stammdatenregel.
    return BDZ_LUDWIGSHAFEN_OPENING_HOURS;
  }

  // Notaufnahmen sind in OSM haeufig ohne opening_hours gepflegt, obwohl sie als Akutversorgung
  // relevant sind. Fuer Notfall-Treffer behandeln wir fehlende Oeffnungszeiten deshalb als 24/7.
  if (careLevel === "emergency" && !isPharmacy(tags) && !tags.opening_hours) {
    // Dieser Fallback gilt nicht fuer Apotheken, weil deren Notdienstzeiten konkret sein muessen.
    return "24/7";
  }

  // Standardfall: OSM-Oeffnungszeiten unveraendert verwenden.
  return tags.opening_hours;
}

async function fetchOverpassData(query: string): Promise<OverpassResponse> {
  // Falls ein Overpass-Spiegelserver ausfaellt, merken wir uns den letzten Fehler.
  let lastError: unknown;

  // Mehrere Spiegelserver nacheinander probieren, damit die Suche robuster ist.
  for (const apiUrl of OVERPASS_API_URLS) {
    try {
      // Overpass wird per POST angesprochen.
      const response = await fetch(apiUrl, {
        method: "POST",
        // Overpass erwartet die Query als Form-Parameter "data".
        body: new URLSearchParams({ data: query }),
      });

      // Erfolgreiche Antwort sofort als JSON zurueckgeben.
      if (response.ok) {
        return (await response.json()) as OverpassResponse;
      }

      // HTTP-Fehler fuer spaetere Fehlermeldung merken.
      lastError = new Error(`Overpass request failed with status ${response.status}`);
    } catch (error) {
      // Netzwerkfehler fuer spaetere Fehlermeldung merken.
      lastError = error;
    }
  }

  // Wenn alle Spiegelserver scheitern, behandeln wir die Kartensuche als temporaer nicht verfuegbar.
  throw lastError instanceof Error ? lastError : new Error("Overpass request failed.");
}

function getGoogleFacilityType(
  place: NearbyPlace,
  careLevel: CareLevel,
  specialties: MedicalSpecialty[],
  includeNightPharmacies: boolean,
) {
  if (place.types.includes("pharmacy") || place.primaryType === "pharmacy") {
    if (careLevel === "emergency") return "Notfallapotheke";
    return includeNightPharmacies && careLevel !== "selfcare" ? "Nacht-Apotheke" : "Apotheke";
  }

  return getFacilityType(careLevel, specialties);
}

async function fetchGoogleFacilities(
  location: UserLocation,
  careLevel: CareLevel,
  specialties: MedicalSpecialty[],
  requiredPostalCode?: string,
): Promise<Facility[]> {
  const includeNightPharmacies = careLevel !== "emergency" && isNightTime();
  const response = await apiClient.post<NearbyPlacesResponse>("/api/v1/places/nearby", {
    latitude: location.latitude,
    longitude: location.longitude,
    careLevel,
    specialties,
    includeNightPharmacies,
  });

  const sortedFacilities = response.places
    .map((place) => {
      const type = getGoogleFacilityType(place, careLevel, specialties, includeNightPharmacies);

      return {
        id: `google-${place.id}`,
        name: place.name,
        hasKnownName: true,
        type,
        latitude: place.latitude,
        longitude: place.longitude,
        openingHours: "24/7",
        address: place.address,
        priority:
          (type === "Nacht-Apotheke" || type === "Notfallapotheke") && careLevel !== "selfcare"
            ? "additional" as const
            : "recommended" as const,
        distanceMeters: calculateDistanceMeters(location, place),
        source: "google" as const,
        ...(typeof place.openNow === "boolean" ? { openNow: place.openNow } : {}),
        weekdayDescriptions: place.weekdayDescriptions,
        ...(place.nextCloseTime ? { nextCloseTime: place.nextCloseTime } : {}),
      };
    })
    .filter((facility) =>
      requiredPostalCode ? addressMatchesPostalCode(facility.address, requiredPostalCode) : true,
    )
    .sort((first, second) => first.distanceMeters - second.distanceMeters);

  const recommendedFacilities = sortedFacilities.filter((facility) => facility.priority === "recommended");
  const additionalFacilities = sortedFacilities.filter((facility) => facility.priority === "additional");

  return [...recommendedFacilities.slice(0, 4), ...additionalFacilities.slice(0, 2)];
}

async function fetchOsmFacilities(
  location: UserLocation,
  careLevel: CareLevel,
  specialties: MedicalSpecialty[],
  requiredPostalCode?: string,
): Promise<Facility[]> {
  // Nachts werden bei Nicht-Notfaellen Apotheken erweitert gesucht, weil Praxen
  // oft geschlossen sind und Apotheken die realistischere Anlaufstelle sein koennen.
  const includeNightPharmacies = careLevel !== "emergency" && isNightTime();
  const data = await fetchOverpassData(buildOverpassQuery(location, careLevel, includeNightPharmacies));
  const seenCoordinates = new Set<string>();

  // Pipeline:
  // 1. Overpass-Rohdaten normalisieren
  // 2. Dubletten und unvollstaendige Eintraege entfernen
  // 3. Nur aktuell geoeffnete Einrichtungen behalten
  // 4. Nach Entfernung sortieren und Haupt-/Zusatztreffer mischen
  const sortedFacilities = (data.elements ?? [])
    .reduce<Facility[]>((facilities, element) => {
      // Nodes haben lat/lon direkt, Ways/Relations liefern den Mittelpunkt in center.
      // Deshalb pruefen wir beide moeglichen Quellen fuer Koordinaten.
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;
      // Tags enthalten Name, Adresse, Typ, Oeffnungszeiten usw.
      const tags = element.tags ?? {};

      // Ohne Koordinaten kann weder Distanz noch Route berechnet werden.
      if (latitude === undefined || longitude === undefined) {
        return facilities;
      }

      // Koordinaten werden gerundet, damit fast identische Doppel-Treffer erkannt werden.
      const coordinateKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

      // OSM liefert dieselbe Einrichtung manchmal mehrfach als Node/Way/Relation.
      // Die gerundeten Koordinaten reichen hier als pragmatische Dubletten-Erkennung.
      if (seenCoordinates.has(coordinateKey)) {
        return facilities;
      }

      // Koordinate als bereits verarbeitet markieren.
      seenCoordinates.add(coordinateKey);

      // Sichtbare Kategorie berechnen.
      const type = getFacilityLabel(tags, careLevel, specialties, includeNightPharmacies);
      // Effektive Oeffnungszeiten bestimmen, inklusive Stammdatenregeln/Fallbacks.
      const openingHours = getEffectiveOpeningHours(tags, careLevel);
      // Adresse aus OSM-Tags zusammensetzen.
      const address = formatAddress(tags);
      // Pruefen, ob ein echter Name/Betreiber vorhanden ist.
      const hasKnownName = hasKnownFacilityName(tags);

      // Nur aktuell geoeffnete Einrichtungen anzeigen, damit die Liste handlungsrelevant bleibt.
      // Name und vollstaendige Adresse sind Pflicht, weil Koordinaten allein keine gute Empfehlung sind.
      if (
        !isOpenNow(openingHours) ||
        !hasKnownName ||
        !address ||
        (requiredPostalCode !== undefined && !addressMatchesPostalCode(address, requiredPostalCode))
      ) {
        return facilities;
      }

      // Normalisierten Treffer fuer die UI in die Ergebnisliste aufnehmen.
      facilities.push({
        // Eindeutige ID aus OSM-Typ und OSM-ID.
        id: `${element.type}-${element.id}`,
        // Anzeigename, bevorzugt OSM name/operator.
        name: getFacilityName(tags, type),
        // Merker fuer UI-Entscheidung, ob ein echter Name existiert.
        hasKnownName,
        // Sichtbare Kategorie.
        type,
        // Koordinaten fuer Entfernung und Kartenlinks.
        latitude,
        longitude,
        // Oeffnungszeiten fuer Anzeige und vorherige Offen-Pruefung.
        openingHours,
        // Fertig formatierte Adresse fuer Anzeige.
        address,
        // Nacht-/Notfallapotheken sind hilfreiche Zusatzoptionen, aber nicht die Hauptempfehlung.
        priority:
          (type === "Nacht-Apotheke" || type === "Notfallapotheke") && careLevel !== "selfcare"
            ? "additional"
            : "recommended",
        // Entfernung vom Nutzerstandort zur Einrichtung.
        distanceMeters: calculateDistanceMeters(location, { latitude, longitude }),
        source: "osm",
      });

      // Reduce-Akkumulator zurueckgeben.
      return facilities;
    }, [])
    // Naechste geoeffnete Treffer zuerst.
    .sort((first, second) => first.distanceMeters - second.distanceMeters);

  // Hauptempfehlungen sind z. B. Notaufnahmen oder Praxen.
  const recommendedFacilities = sortedFacilities.filter((facility) => facility.priority === "recommended");
  // Zusatzoptionen sind z. B. Nacht-/Notfallapotheken.
  const additionalFacilities = sortedFacilities.filter((facility) => facility.priority === "additional");

  // Die Liste bleibt kurz, zeigt aber neben Hauptempfehlungen auch Zusatzoptionen wie Notfallapotheken.
  return [...recommendedFacilities.slice(0, 4), ...additionalFacilities.slice(0, 2)]
    .sort((first, second) => {
      // Hauptempfehlungen sollen vor Zusatzoptionen stehen.
      if (first.priority !== second.priority) {
        return first.priority === "recommended" ? -1 : 1;
      }

      // Innerhalb derselben Prioritaet entscheidet die Entfernung.
      return first.distanceMeters - second.distanceMeters;
    });
}

async function fetchNearbyFacilities(
  location: UserLocation,
  careLevel: CareLevel,
  specialties: MedicalSpecialty[],
  requiredPostalCode?: string,
) {
  try {
    return await fetchGoogleFacilities(location, careLevel, specialties, requiredPostalCode);
  } catch (error) {
    console.warn("Google Places ist nicht verfügbar, OSM-Fallback wird verwendet.", error);
    return fetchOsmFacilities(location, careLevel, specialties, requiredPostalCode);
  }
}

export default function NearbyPracticeSearch({
  // careLevel kommt als Prop von der Ergebnis-Seite.
  careLevel,
  // specialties ist optional; ohne Wert wird eine leere Liste verwendet.
  specialties = [],
}: NearbyPracticeSearchProps) {
  // Status, Standort und Trefferliste bleiben lokal in dieser Komponente,
  // weil sie erst nach Klick auf "Standort freigeben" gebraucht werden.
  // Die Versorgungsebene selbst kommt bereits aus dem Triage-Ergebnis.
  // locationStatus steuert, welche Meldung bzw. welcher UI-Zustand sichtbar ist.
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  // userLocation speichert den Suchmittelpunkt, egal ob Browser oder manuelle Eingabe.
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  // facilities enthaelt die bereits gefilterten und sortierten Treffer fuer die UI.
  const [facilities, setFacilities] = useState<Facility[]>([]);
  // manualLocationQuery ist der kontrollierte Wert des PLZ-/Adressfelds.
  const [manualLocationQuery, setManualLocationQuery] = useState("");
  // Nachts werden fuer Nicht-Notfall-Ebenen Apotheken als Zusatzoption einbezogen.
  const shouldSuggestNightPharmacies = careLevel !== "emergency" && isNightTime();
  // Beschreibungstext passend zur Versorgungsebene.
  const searchIntro = getSearchIntro(careLevel, shouldSuggestNightPharmacies);
  // Leerzustand passend zur Versorgungsebene.
  const emptyMessage = getEmptyMessage(careLevel);

  const loadNearbyFacilities = async (location: UserLocation, requiredPostalCode?: string) => {
    // Zentraler Einstieg fuer beide Standortquellen:
    // Browser-Geolocation und manuell geocodierte PLZ/Adresse landen beide hier.
    setLocationStatus("searching");

    try {
      // Einrichtungen fuer den Suchmittelpunkt laden.
      const nextFacilities = await fetchNearbyFacilities(
        location,
        careLevel,
        specialties,
        requiredPostalCode,
      );

      // Treffer im State ablegen, damit React die Liste rendert.
      setFacilities(nextFacilities);
      // "empty" ist kein technischer Fehler, sondern ein valider leerer Suchzustand.
      setLocationStatus(nextFacilities.length > 0 ? "ready" : "empty");
    } catch (error) {
      // Fehler wird fuer Entwickler sichtbar geloggt.
      console.error(error);
      // Alte Treffer entfernen, damit keine veralteten Daten angezeigt werden.
      setFacilities([]);
      // UI zeigt technische Fehlermeldung.
      setLocationStatus("error");
    }
  };

  const handleLocationRequest = () => {
    // Standortdaten werden erst nach aktiver Zustimmung des Nutzers angefragt.
    // Es wird keine IP-Adresse ausgewertet; die Genauigkeit kommt vom Browser.
    setLocationStatus("loading");
    // Vor einer neuen Suche werden alte Treffer geloescht.
    setFacilities([]);

    // Manche Browser/Umgebungen unterstuetzen Geolocation nicht.
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Die Genauigkeit wird nur angezeigt; die Koordinaten dienen fuer Suche und Sortierung.
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "browser" as const,
        };

        // Standort im State speichern.
        setUserLocation(nextLocation);
        // Danach Suche mit diesem Standort starten.
        void loadNearbyFacilities(nextLocation);
      },
      () => {
        // Browser unterscheidet hier mehrere Fehlerarten; fuer die UI reicht eine verstaendliche Meldung.
        setLocationStatus("denied");
      },
      // maximumAge erlaubt einen kurz zuvor bestimmten Standort und macht die Anfrage schneller.
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  const handleManualLocationSearch = async (event: FormEvent<HTMLFormElement>) => {
    // Browser darf das Formular nicht klassisch abschicken/reloaden.
    event.preventDefault();

    // Leere Eingabe ignorieren.
    if (!manualLocationQuery.trim()) {
      return;
    }

    // UI zeigt, dass gerade die Adresse gesucht wird.
    setLocationStatus("geocoding");
    // Alte Treffer entfernen.
    setFacilities([]);

    try {
      // Erst wird die Eingabe in Koordinaten umgewandelt, danach laeuft dieselbe
      // Einrichtungssuche wie bei einem freigegebenen Browser-Standort.
      const nextLocation = await geocodeManualLocation(manualLocationQuery);

      // Wenn Nominatim nichts findet, zeigen wir "not_found".
      if (!nextLocation) {
        setUserLocation(null);
        setLocationStatus("not_found");
        return;
      }

      // Manuell gefundenen Standort speichern.
      setUserLocation(nextLocation);
      // Danach dieselbe Einrichtungssuche starten.
      const requiredPostalCode = extractGermanPostalCode(manualLocationQuery);
      await loadNearbyFacilities(nextLocation, requiredPostalCode ?? undefined);
    } catch (error) {
      // Technische Fehler loggen.
      console.error(error);
      // Suchmittelpunkt entfernen.
      setUserLocation(null);
      // Alte Treffer entfernen.
      setFacilities([]);
      // UI zeigt technische Fehlermeldung.
      setLocationStatus("error");
    }
  };

  // Beide Zwischenzustaende deaktivieren den Button, damit keine parallelen Suchen starten.
  const isRequestingLocation =
    locationStatus === "loading" || locationStatus === "geocoding" || locationStatus === "searching";
  const statusLabel =
    locationStatus === "searching"
      ? "Einrichtungen werden gesucht..."
      : locationStatus === "geocoding"
        ? "Adresse wird gesucht..."
        : "Standort wird angefragt...";

  const handleChangeLocation = () => {
    setLocationStatus("idle");
    setFacilities([]);
    setUserLocation(null);
    setManualLocationQuery("");
  };

  return (
    // Aeusserer Container der gesamten Suchkarte.
    <div className="rounded-[16px] bg-[#eff2f6] p-5 md:p-6 mb-4">
      {/* Kopfbereich mit Icon, Titel und Erklaertext */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#486284]">
          <MapPin className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg">
            Ärztliche Anlaufstellen in Ihrer Nähe
          </p>
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-relaxed">
            {searchIntro}
          </p>
        </div>
        {locationStatus === "ready" && (
          <button
            type="button"
            onClick={handleChangeLocation}
            className="shrink-0 rounded-[10px] bg-white px-3 py-2 text-sm font-bold text-[#486284] ring-1 ring-[#c8d2dc] transition-colors hover:bg-[#dde3ea]"
          >
            PLZ ändern
          </button>
        )}
      </div>

      {/* Vor erfolgreicher Suche wird der Freigabe-Button mit passenden Statusmeldungen angezeigt. */}
      {locationStatus !== "ready" ? (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            {/* Button fuer praezise Browser-Standortfreigabe */}
            <button
              type="button"
              onClick={handleLocationRequest}
              disabled={isRequestingLocation}
              className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[#486284] px-5 py-3 text-white transition-all hover:bg-[#3a4d68] disabled:bg-gray-300 disabled:text-gray-500"
            >
              <LocateFixed className="size-5" aria-hidden="true" />
              <span className="font-['DM_Sans:Bold',sans-serif] font-bold text-sm">
                {isRequestingLocation ? statusLabel : "Standort freigeben"}
              </span>
            </button>

            <div className="hidden h-12 w-px shrink-0 bg-[#9aabc0] md:block" aria-hidden="true" />

            {/* Alternative Suche per PLZ oder Adresse */}
            <form
              onSubmit={handleManualLocationSearch}
              className="min-w-0 flex-1"
            >
              <label
                htmlFor="manual-location-query"
                className="mb-2 block text-sm font-bold text-[#486284]"
              >
                PLZ oder Adresse
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="manual-location-query"
                  type="search"
                  value={manualLocationQuery}
                  onChange={(event) => setManualLocationQuery(event.target.value)}
                  placeholder="z. B. 68163 Mannheim"
                  disabled={isRequestingLocation}
                  className="min-h-[48px] min-w-0 flex-1 rounded-[10px] border border-[#c8d2dc] bg-white px-3 py-2 text-sm font-medium text-[#3e3e3e] outline-none transition-all placeholder:text-[#7b8a8d] focus:border-[#486284] focus:ring-2 focus:ring-[#486284]/20 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={isRequestingLocation || !manualLocationQuery.trim()}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-white px-4 py-2 text-sm font-bold text-[#486284] ring-1 ring-[#c8d2dc] transition-all hover:bg-[#dde3ea] disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <Search className="size-4" aria-hidden="true" />
                  Suchen
                </button>
              </div>
            </form>
          </div>

          {/* Fehlermeldung, wenn Nutzer Browser-Standort abgelehnt hat */}
          {locationStatus === "denied" && (
            <p className="mt-3 rounded-[12px] bg-white px-4 py-3 text-sm font-medium text-[#8A4B16]">
              Standortfreigabe wurde nicht erlaubt. Sie können die Freigabe in den Browser-Einstellungen aktivieren und es erneut versuchen.
            </p>
          )}

          {/* Fehlermeldung, wenn Browser keine Geolocation anbietet */}
          {locationStatus === "unsupported" && (
            <p className="mt-3 rounded-[12px] bg-white px-4 py-3 text-sm font-medium text-[#8A4B16]">
              Ihr Browser unterstützt keine Standortfreigabe.
            </p>
          )}

          {/* Valider leerer Zustand: Suche erfolgreich, aber keine passenden Treffer */}
          {locationStatus === "empty" && (
            <p className="mt-3 rounded-[12px] bg-white px-4 py-3 text-sm font-medium text-[#8A4B16]">
              {emptyMessage}
            </p>
          )}

          {/* Manuelle Adresse/PLZ konnte nicht in Koordinaten umgewandelt werden */}
          {locationStatus === "not_found" && (
            <p className="mt-3 rounded-[12px] bg-white px-4 py-3 text-sm font-medium text-[#8A4B16]">
              Diese PLZ oder Adresse konnte nicht gefunden werden.
            </p>
          )}

          {/* Technischer Fehler bei Nominatim, Google Places oder Overpass */}
          {locationStatus === "error" && (
            <p className="mt-3 rounded-[12px] bg-white px-4 py-3 text-sm font-medium text-[#8A4B16]">
              Die Kartensuche ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.
            </p>
          )}
        </>
      ) : (
        // Sobald Treffer vorhanden sind, wird die Ergebnisliste gerendert.
        <div>
          {/* Kurze Trefferzusammenfassung */}
          {userLocation && (
            <div className="mb-3 rounded-[12px] bg-white px-4 py-3 text-sm font-medium text-[#486284]">
              {facilities.length} {facilities.length === 1 ? "Einrichtung" : "Einrichtungen"} gefunden.
              {facilities.some((facility) => facility.source === "google") && (
                <span className="ml-1 text-xs text-[#52676B]">Datenquelle: Google Maps.</span>
              )}
              {facilities.some((facility) => facility.source === "osm") && (
                <span className="ml-1 text-xs text-[#52676B]">Datenquelle: OpenStreetMap.</span>
              )}
            </div>
          )}

          {/* Ergebnisliste */}
          <div className="grid grid-cols-1 gap-3">
            {facilities.map((facility) => {
              const openingHoursDisplay = getFacilityOpeningHoursDisplay(facility);
              const openingHoursLines =
                facility.source === "google" && facility.weekdayDescriptions?.length
                  ? facility.weekdayDescriptions
                  : [openingHoursDisplay.hoursLabel];

              return (
                // Einzelne Einrichtungskarte.
                <div
                  key={facility.id}
                  className="rounded-[8px] bg-white p-4"
                >
                  {/* Oberer Kartenbereich: Name, Kategorie, Entfernung, Adresse */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm">
                        {facility.hasKnownName ? facility.name : `${facility.type} (Name nicht verfügbar)`}
                      </p>
                      <p className="mt-1 font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-xs">
                        {facility.type} · {formatDistance(facility.distanceMeters)} entfernt
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#52676B]">
                        {facility.address}
                      </p>
                    </div>
                  </div>

                  {/* Oeffnungszeitenblock */}
                  <div className="mt-3 flex min-w-0 items-start gap-2 text-xs font-medium text-[#3e3e3e]">
                    <Clock className="mt-0.5 size-4 flex-shrink-0 text-[#486284]" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: openingHoursDisplay.statusColor }}
                          aria-hidden="true"
                        />
                        {openingHoursDisplay.statusLabel}
                      </span>
                      <div className="mt-1 space-y-0.5 text-[#52676B]">
                        {openingHoursLines.map((openingHoursLine) => (
                          <p key={openingHoursLine} className="min-w-0 break-words">
                            {openingHoursLine}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Routenlinks werden nur angezeigt, wenn ein Suchmittelpunkt existiert */}
                  {userLocation && (
                    <div className="mt-3 rounded-[8px] bg-[#f4f7fa] px-3 py-2">
                      <p className="mb-2 text-xs font-bold text-[#486284]">Route öffnen:</p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={createGoogleMapsRouteUrl(facility, userLocation)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Route zu ${facility.name} mit Google Maps öffnen`}
                          className="inline-flex min-h-[36px] items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-xs font-bold text-[#486284] transition-all hover:bg-[#dde3ea]"
                        >
                          <Navigation className="size-4 flex-shrink-0" aria-hidden="true" />
                          Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
