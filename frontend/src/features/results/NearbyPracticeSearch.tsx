import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { RecommendedSpecialty } from "../../types/triage";

interface NearbyPracticeSearchProps {
  specialties: RecommendedSpecialty[];
}

function createGoogleMapsSearchUrl(location: string, specialtyLabel: string) {
  const query = `${specialtyLabel} Praxis in der Nähe von ${location}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function NearbyPracticeSearch({ specialties }: NearbyPracticeSearchProps) {
  const [location, setLocation] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const searchableSpecialties = specialties.filter((specialty) => specialty.specialty !== "emergency");

  if (searchableSpecialties.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#eff2f6] rounded-[16px] p-5 md:p-6 mb-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#486284]">
          <MapPin className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#486284] text-lg">
            Praxen in Ihrer Nähe finden
          </p>
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-sm">
            Geben Sie Ihren Standort ein. Später kann hier das Backend echte Praxen liefern.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
        <input
          value={location}
          onChange={(event) => {
            setLocation(event.target.value);
            setHasSearched(false);
          }}
          placeholder="z.B. Musterstraße 1, Berlin oder 10115 Berlin"
          className="h-11 rounded-[12px] bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[#486284]/30"
        />

        <button
          type="button"
          onClick={() => setHasSearched(true)}
          disabled={location.trim().length < 3}
          className="h-11 rounded-[12px] bg-[#486284] px-5 text-white transition-all hover:bg-[#3a4d68] disabled:bg-gray-300 disabled:text-gray-500"
        >
          <span className="flex items-center justify-center gap-2 font-['DM_Sans:Bold',sans-serif] font-bold text-sm">
            <Search className="size-4" aria-hidden="true" />
            Suchen
          </span>
        </button>
      </div>

      {hasSearched && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {searchableSpecialties.slice(0, 3).map((specialty) => (
            <a
              key={specialty.specialty}
              href={createGoogleMapsSearchUrl(location, specialty.label)}
              target="_blank"
              rel="noreferrer"
              className="rounded-[14px] bg-white p-4 transition-all hover:bg-[#dde3ea]"
            >
              <p className="font-['DM_Sans:Bold',sans-serif] font-bold text-[#3e3e3e] text-sm">
                {specialty.label}
              </p>
              <p className="mt-1 font-['DM_Sans:Medium',sans-serif] font-medium text-[#486284] text-xs">
                In Google Maps nach passenden Praxen suchen
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
