import { useState } from "react";
import { Clock, ExternalLink, LocateFixed, MapPin, Navigation } from "lucide-react";
import {
  MEDICAL_SPECIALTY_LABELS,
} from "../../types/triage";
import type { CareLevel, MedicalSpecialty } from "../../types/triage";

interface NearbyPracticeSearchProps {
  careLevel: CareLevel;
  specialties?: MedicalSpecialty[];
}

type Facility = {
  id: string;
  name: string;
  type: string;
  distanceMeters: number;
  openingHours: string;
  address: string;
};

function createMapsRouteUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function getFacilityType(careLevel: CareLevel, specialties: MedicalSpecialty[]) {
  if (careLevel === "emergency") return "Notaufnahme";
  if (careLevel === "specialist" && specialties.length > 0) return MEDICAL_SPECIALTY_LABELS[specialties[0]];
  if (careLevel === "selfcare") return "Apotheke";
  return "Hausarzt";
}

function createMockFacilities(careLevel: CareLevel, specialties: MedicalSpecialty[]): Facility[] {
  const primaryType = getFacilityType(careLevel, specialties);

  if (careLevel === "emergency") {
    return [
      {
        id: "emergency-1",
        name: "Zentrale Notaufnahme Klinikum Mitte",
        type: "Notaufnahme",
        distanceMeters: 840,
        openingHours: "24 Stunden geöffnet",
        address: "Charitéplatz 1, 10117 Berlin",
      },
      {
        id: "emergency-2",
        name: "Rettungsstelle St. Marien",
        type: "Notaufnahme",
        distanceMeters: 1650,
        openingHours: "24 Stunden geöffnet",
        address: "Große Hamburger Straße 5, 10115 Berlin",
      },
    ];
  }

  if (careLevel === "specialist") {
    return [
      {
        id: "specialist-1",
        name: `Praxis ${primaryType} am Stadtpark`,
        type: primaryType,
        distanceMeters: 420,
        openingHours: "Heute 08:00-13:00, 14:00-17:00",
        address: "Invalidenstraße 118, 10115 Berlin",
      },
      {
        id: "specialist-2",
        name: `MVZ ${primaryType} Zentrum`,
        type: primaryType,
        distanceMeters: 980,
        openingHours: "Heute 09:00-18:00",
        address: "Friedrichstraße 90, 10117 Berlin",
      },
      {
        id: "doctor-1",
        name: "Hausarztpraxis Dr. Weber",
        type: "Hausarzt",
        distanceMeters: 1260,
        openingHours: "Heute 08:30-12:30",
        address: "Torstraße 52, 10119 Berlin",
      },
    ];
  }

  if (careLevel === "doctor") {
    return [
      {
        id: "doctor-1",
        name: "Hausarztpraxis Dr. Weber",
        type: "Hausarzt",
        distanceMeters: 310,
        openingHours: "Heute 08:30-12:30, 15:00-18:00",
        address: "Torstraße 52, 10119 Berlin",
      },
      {
        id: "doctor-2",
        name: "Gemeinschaftspraxis am Markt",
        type: "Hausarzt",
        distanceMeters: 760,
        openingHours: "Heute 09:00-16:00",
        address: "Rosenthaler Straße 41, 10178 Berlin",
      },
      {
        id: "pharmacy-1",
        name: "Apotheke am Park",
        type: "Apotheke",
        distanceMeters: 920,
        openingHours: "Heute 08:00-20:00",
        address: "Brunnenstraße 12, 10119 Berlin",
      },
    ];
  }

  return [
    {
      id: "pharmacy-1",
      name: "Apotheke am Park",
      type: "Apotheke",
      distanceMeters: 360,
      openingHours: "Heute 08:00-20:00",
      address: "Brunnenstraße 12, 10119 Berlin",
    },
    {
      id: "doctor-1",
      name: "Hausarztpraxis Dr. Weber",
      type: "Hausarzt",
      distanceMeters: 940,
      openingHours: "Heute 08:30-12:30",
      address: "Torstraße 52, 10119 Berlin",
    },
  ];
}

export default function NearbyPracticeSearch({
  careLevel,
  specialties = [],
}: NearbyPracticeSearchProps) {
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");

  const facilities = createMockFacilities(careLevel, specialties)
    .sort((first, second) => first.distanceMeters - second.distanceMeters);

  const handleLocationRequest = () => {
    setLocationStatus("loading");

    if (!navigator.geolocation) {
      setHasLocationPermission(true);
      setLocationStatus("fallback");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setHasLocationPermission(true);
        setLocationStatus("ready");
      },
      () => {
        setHasLocationPermission(true);
        setLocationStatus("fallback");
      },
      { timeout: 2500 },
    );
  };

  return (
    <div className="rounded-[16px] bg-[#eff2f6] p-5 md:p-6 mb-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#486284]">
          <MapPin className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg">
            Passende Einrichtungen in Ihrer Nähe
          </p>
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#3e3e3e] text-sm leading-relaxed">
            Geben Sie freiwillig Ihren Standort frei, um passende Einrichtungen nach Entfernung sortiert anzuzeigen.
          </p>
        </div>
      </div>

      {!hasLocationPermission ? (
        <button
          type="button"
          onClick={handleLocationRequest}
          disabled={locationStatus === "loading"}
          className="mx-auto flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] bg-[#486284] px-5 py-3 text-white transition-all hover:bg-[#3a4d68] disabled:bg-gray-300 disabled:text-gray-500"
        >
          <LocateFixed className="size-5" aria-hidden="true" />
          <span className="font-['DM_Sans:Bold',sans-serif] font-bold text-sm">
            {locationStatus === "loading" ? "Standort wird angefragt..." : "Standort freigeben"}
          </span>
        </button>
      ) : (
        <div>
          {locationStatus === "ready" && (
            <div className="mb-3 rounded-[12px] bg-white px-4 py-3 text-sm font-medium text-[#486284]">
              Standort freigegeben. Einrichtungen werden nach Entfernung sortiert.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {facilities.map((facility) => (
              <a
                key={facility.id}
                href={createMapsRouteUrl(facility.address)}
                target="_blank"
                rel="noreferrer"
                className="rounded-[14px] bg-white p-4 transition-all hover:bg-[#dde3ea]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm">
                      {facility.name}
                    </p>
                    <p className="mt-1 font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-xs">
                      {facility.type} · {facility.distanceMeters} m entfernt
                    </p>
                  </div>
                  <ExternalLink className="size-4 flex-shrink-0 text-[#486284]" aria-hidden="true" />
                </div>

                <div className="mt-3 grid gap-2 text-xs font-medium text-[#3e3e3e] sm:grid-cols-2">
                  <span className="flex items-center gap-2">
                    <Clock className="size-4 text-[#486284]" aria-hidden="true" />
                    {facility.openingHours}
                  </span>
                  <span className="flex items-center gap-2">
                    <Navigation className="size-4 text-[#486284]" aria-hidden="true" />
                    Route in Karten-App öffnen
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
