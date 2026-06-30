import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Modal from '../../src/components/Modal';
import NearbyPracticeSearch from '../../src/features/results/NearbyPracticeSearch';
import ResultCard from '../../src/features/results/ResultCard';
import { TRIAGE_CONFIGS, createSpecialtyConfig } from '../../src/features/results/result.config';

function mockGeolocation(
  getCurrentPosition: Geolocation['getCurrentPosition'] | undefined,
) {
  Object.defineProperty(navigator, 'geolocation', {
    value: getCurrentPosition ? { getCurrentPosition } : undefined,
    configurable: true,
  });
}

describe('result and shared UI components', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders doctor and psychiatry guidance in result cards', () => {
    const { rerender } = render(
      <ResultCard config={TRIAGE_CONFIGS.doctor} careLevel="doctor" />,
    );

    expect(screen.getByText(/Kontaktieren Sie Ihren Hausarzt/)).toBeInTheDocument();
    expect(screen.getByText(/116 117/)).toBeInTheDocument();

    rerender(
      <ResultCard
        config={createSpecialtyConfig('psychiatry')}
        careLevel="specialist"
        recommendedSpecialty="psychiatry"
      />,
    );

    expect(screen.getByText(/Fachärztliche Versorgung: Psychiatrie/)).toBeInTheDocument();
    expect(screen.getByText(/0800 1110111/)).toBeInTheDocument();
  });

  it('requests location and shows sorted nearby facilities when permission succeeds', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => {
      success({
        coords: {
          latitude: 49.487,
          longitude: 8.46,
          accuracy: 20,
        },
      } as GeolocationPosition);
    });
    mockGeolocation(getCurrentPosition);
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        facilities: [
          {
            id: 'google-1',
            name: 'Praxis Kardiologie am Stadtpark',
            hasKnownName: true,
            type: 'Kardiologie',
            latitude: 49.487,
            longitude: 8.466,
            openingHours: '24/7',
            openingHoursText: ['Donnerstag: 08:00–18:00'],
            isOpenNow: true,
            address: 'Parkstraße 1, 68161 Mannheim',
            priority: 'recommended',
            distanceMeters: 600,
          },
          {
            id: 'google-2',
            name: 'Kardiologie Zentrum',
            hasKnownName: true,
            type: 'Kardiologie',
            latitude: 49.49,
            longitude: 8.47,
            openingHours: 'Mo-Su 08:00-09:00',
            isOpenNow: false,
            address: 'Hauptstraße 2, 68159 Mannheim',
            priority: 'recommended',
            distanceMeters: 900,
          },
        ],
      }),
    } as Response));

    render(<NearbyPracticeSearch careLevel="specialist" specialties={['cardiology']} />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', {
        name: '2 Einrichtungen ausblenden',
      })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Standort aktualisieren/ })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /PLZ oder Adresse/ })).toBeInTheDocument();
    expect(screen.queryByText(/offene Einrichtungen gefunden/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Datenquelle:/)).not.toBeInTheDocument();
    expect(screen.getByText('Praxis Kardiologie am Stadtpark')).toBeInTheDocument();
    expect(screen.getAllByText('Geschlossen')).toHaveLength(2);
    const openFilter = screen.getByRole('button', { name: 'Geöffnet' });
    const closedFilter = screen.getByRole('button', { name: 'Geschlossen' });
    expect(openFilter).toHaveAttribute('aria-pressed', 'false');
    expect(closedFilter).toHaveAttribute('aria-pressed', 'false');

    await user.click(openFilter);

    expect(screen.getByText('Praxis Kardiologie am Stadtpark')).toBeVisible();
    expect(screen.queryByText('Kardiologie Zentrum')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 Einrichtung ausblenden' })).toBeInTheDocument();

    await user.click(closedFilter);

    expect(screen.queryByText('Praxis Kardiologie am Stadtpark')).not.toBeInTheDocument();
    expect(screen.getByText('Kardiologie Zentrum')).toBeVisible();

    await user.click(closedFilter);

    expect(screen.getByText('Praxis Kardiologie am Stadtpark')).toBeVisible();
    expect(screen.getByText('Kardiologie Zentrum')).toBeVisible();
    const facilitiesToggle = screen.getByRole('button', {
      name: '2 Einrichtungen ausblenden',
    });
    expect(facilitiesToggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(facilitiesToggle);

    expect(screen.queryByText('Praxis Kardiologie am Stadtpark')).not.toBeVisible();
    expect(screen.getByRole('button', { name: /Standort aktualisieren/ })).toBeVisible();
    expect(screen.getByRole('searchbox', { name: /PLZ oder Adresse/ })).toBeVisible();
    expect(screen.getByRole('button', {
      name: '2 Einrichtungen einblenden',
    })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', {
      name: '2 Einrichtungen einblenden',
    }));

    expect(screen.getByText('Praxis Kardiologie am Stadtpark')).toBeVisible();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir'),
    );
  });

  it('geocodes manual locations before requesting nearby facilities', async () => {
    const user = userEvent.setup();
    mockGeolocation(undefined);
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{
          lat: '49.4875',
          lon: '8.4660',
          display_name: '68163 Mannheim, Deutschland',
        }]),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          facilities: [{
            id: 'manual-1',
            name: 'Hausarztpraxis am Park',
            hasKnownName: true,
            type: 'Hausarzt',
            latitude: 49.489,
            longitude: 8.468,
            openingHours: 'Mo-Su 08:00-20:00',
            isOpenNow: true,
            address: 'Parkstrasse 4, 68163 Mannheim',
            priority: 'recommended',
            distanceMeters: 250,
          }],
        }),
      } as Response);
    vi.stubGlobal('fetch', fetchMock);

    render(<NearbyPracticeSearch careLevel="doctor" />);

    await user.type(screen.getByRole('searchbox', { name: /PLZ oder Adresse/ }), '68163 Mannheim');
    await user.click(screen.getByRole('button', { name: 'Suchen' }));

    expect(await screen.findByText('Hausarztpraxis am Park')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('nominatim.openstreetmap.org/search'),
      { headers: { Accept: 'application/json' } },
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain('q=68163+Mannheim');
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/places/nearby',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          latitude: 49.4875,
          longitude: 8.466,
          careLevel: 'doctor',
        }),
      }),
    );
    expect(screen.getByRole('link', { name: /Route zu Hausarztpraxis am Park/ })).toHaveAttribute(
      'href',
      expect.stringContaining('origin=49.4875,8.466'),
    );
  });

  it('falls back to OSM results when Google Places returns no facilities', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => {
      success({
        coords: {
          latitude: 49.487,
          longitude: 8.46,
          accuracy: 20,
        },
      } as GeolocationPosition);
    });
    mockGeolocation(getCurrentPosition);
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ facilities: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            {
              id: 1,
              type: 'node',
              lat: 49.487,
              lon: 8.466,
              tags: {
                amenity: 'hospital',
                name: 'Klinikum Mannheim Notaufnahme',
                'addr:street': 'Theodor-Kutzer-Ufer',
                'addr:housenumber': '1',
                'addr:postcode': '68167',
                'addr:city': 'Mannheim',
              },
            },
            {
              id: 2,
              type: 'node',
              lat: 49.5,
              lon: 8.48,
              tags: {
                amenity: 'hospital',
                name: 'Weiteres Krankenhaus',
                'addr:street': 'Klinikstrasse',
                'addr:housenumber': '2',
                'addr:postcode': '68159',
                'addr:city': 'Mannheim',
              },
            },
            {
              id: 3,
              type: 'node',
              lat: 49.487,
              lon: 8.466,
              tags: {
                amenity: 'hospital',
                name: 'Doppelter Eintrag',
                'addr:street': 'Theodor-Kutzer-Ufer',
                'addr:postcode': '68167',
              },
            },
            {
              id: 4,
              type: 'node',
              lat: 49.51,
              lon: 8.49,
              tags: {
                amenity: 'hospital',
                'addr:street': 'Ohne Name',
                'addr:postcode': '68161',
              },
            },
          ],
        }),
      } as Response);
    vi.stubGlobal('fetch', fetchMock);

    render(<NearbyPracticeSearch careLevel="emergency" />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    expect(await screen.findByText('Klinikum Mannheim Notaufnahme')).toBeInTheDocument();
    expect(screen.getByText('Weiteres Krankenhaus')).toBeInTheDocument();
    expect(screen.queryByText('Doppelter Eintrag')).not.toBeInTheDocument();
    expect(screen.queryByText('Ohne Name')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/places/nearby',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(String(fetchMock.mock.calls[1][0])).toContain('overpass-api.de/api/interpreter');
    expect(String(fetchMock.mock.calls[1][1]?.body)).toContain('amenity%22%3D%22hospital');
  });

  it('tries the next OSM mirror and keeps emergency pharmacies as additional options', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => {
      success({
        coords: {
          latitude: 49.487,
          longitude: 8.46,
          accuracy: 20,
        },
      } as GeolocationPosition);
    });
    mockGeolocation(getCurrentPosition);
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('Google Places down'))
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            {
              id: 10,
              type: 'way',
              center: { lat: 49.487, lon: 8.466 },
              tags: {
                healthcare: 'hospital',
                operator: 'Staedtisches Klinikum',
                'addr:street': 'Klinikring',
                'addr:housenumber': '1',
                'addr:postcode': '68167',
                'addr:city': 'Mannheim',
              },
            },
            {
              id: 11,
              type: 'node',
              lat: 49.49,
              lon: 8.47,
              tags: {
                amenity: 'pharmacy',
                name: 'Notdienst Apotheke',
                opening_hours: '24/7',
                'addr:street': 'Apothekenweg',
                'addr:housenumber': '4',
                'addr:postcode': '68161',
                'addr:city': 'Mannheim',
              },
            },
            {
              id: 12,
              type: 'node',
              tags: {
                amenity: 'hospital',
                name: 'Ohne Koordinaten',
                'addr:street': 'Nirgends',
                'addr:postcode': '68161',
              },
            },
          ],
        }),
      } as Response);
    vi.stubGlobal('fetch', fetchMock);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    render(<NearbyPracticeSearch careLevel="emergency" />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    expect(await screen.findByText('Staedtisches Klinikum')).toBeInTheDocument();
    expect(screen.getByText('Notdienst Apotheke')).toBeInTheDocument();
    expect(screen.getAllByText(/Notaufnahme/).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Notfallapotheke/).length).toBeGreaterThan(1);
    expect(screen.queryByText('Ohne Koordinaten')).not.toBeInTheDocument();
    expect(infoSpy).toHaveBeenCalledWith(
      'Google Places unavailable, falling back to OpenStreetMap.',
      expect.any(Error),
    );
    expect(String(fetchMock.mock.calls[1][0])).toContain('overpass-api.de/api/interpreter');
    expect(String(fetchMock.mock.calls[2][0])).toContain('overpass.kumi.systems/api/interpreter');
  });

  it('shows an error when every facility provider fails', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => {
      success({
        coords: {
          latitude: 49.487,
          longitude: 8.46,
          accuracy: 20,
        },
      } as GeolocationPosition);
    });
    mockGeolocation(getCurrentPosition);
    vi.stubGlobal('fetch', vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('Google Places down'))
      .mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response));
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<NearbyPracticeSearch careLevel="doctor" />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    expect(await screen.findByText(/Kartensuche ist gerade/)).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
  });

  it('shows an error when manual geocoding fails technically', async () => {
    const user = userEvent.setup();
    mockGeolocation(undefined);
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<NearbyPracticeSearch careLevel="doctor" />);

    await user.type(screen.getByRole('searchbox', { name: /PLZ oder Adresse/ }), '68163 Mannheim');
    await user.click(screen.getByRole('button', { name: 'Suchen' }));

    expect(await screen.findByText(/Kartensuche ist gerade/)).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
  });

  it('shows a helpful message when geolocation is unavailable', async () => {
    const user = userEvent.setup();
    mockGeolocation(undefined);

    render(<NearbyPracticeSearch careLevel="selfcare" />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    expect(screen.getByText('Ihr Browser unterstützt keine Standortfreigabe.')).toBeInTheDocument();
  });

  it('shows manual search and permission error states', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((_success, error) => {
      error?.({} as GeolocationPositionError);
    });
    mockGeolocation(getCurrentPosition);
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response));

    render(<NearbyPracticeSearch careLevel="selfcare" />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));
    expect(screen.getByText(/Standortfreigabe wurde nicht erlaubt/)).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /PLZ oder Adresse/ }), '00000 Nirgendwo');
    await user.click(screen.getByRole('button', { name: 'Suchen' }));

    expect(await screen.findByText('Diese PLZ oder Adresse konnte nicht gefunden werden.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('closes modal via backdrop and close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <Modal isOpen={false} onClose={onClose} title="Nicht sichtbar">
        Inhalt
      </Modal>,
    );

    expect(screen.queryByText('Nicht sichtbar')).not.toBeInTheDocument();

    rerender(
      <Modal isOpen onClose={onClose} title="Fenster" subtitle="Untertitel" showCloseButton>
        <button>Aktion</button>
      </Modal>,
    );

    expect(screen.getByRole('heading', { name: 'Fenster' })).toBeInTheDocument();
    expect(screen.getByText('Untertitel')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fenster schließen' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Fenster').parentElement!.previousElementSibling as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
