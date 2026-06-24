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
    vi.useRealTimers();
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
    const today = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(new Date());
    const otherDay = today === 'Dienstag' ? 'Mittwoch' : 'Dienstag';
    const todayOpeningHours = `${today}: 10:00–16:00`;
    const otherOpeningHours = `${otherDay}: 08:00–18:00`;
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
      status: 200,
      json: async () => ({
        provider: 'google',
        places: [
          {
            id: 'place-1',
            name: 'Praxis Kardiologie am Stadtpark',
            address: 'Parkstraße 1, 68161 Mannheim',
            latitude: 49.487,
            longitude: 8.466,
            primaryType: 'doctor',
            types: ['doctor', 'health'],
            openNow: true,
            weekdayDescriptions: [otherOpeningHours, todayOpeningHours],
          },
        ],
      }),
    } as Response));

    render(<NearbyPracticeSearch careLevel="specialist" specialties={['cardiology']} />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    await waitFor(() => {
      expect(screen.getByText(/1 Einrichtung gefunden/)).toBeInTheDocument();
    });

    expect(screen.getByText('Praxis Kardiologie am Stadtpark')).toBeInTheDocument();
    expect(screen.getByText(todayOpeningHours)).toBeInTheDocument();
    expect(screen.queryByText(otherOpeningHours)).not.toBeInTheDocument();
    expect(screen.getByText(/Datenquelle: Google Maps/)).toBeInTheDocument();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir'),
    );

    const manualLocationInput = screen.getByLabelText('PLZ oder Adresse');
    expect(manualLocationInput).toHaveValue('');
    await user.type(manualLocationInput, '68163 Mannheim');
    expect(manualLocationInput).toHaveValue('68163 Mannheim');
  });

  it('shows a helpful message when geolocation is unavailable', async () => {
    const user = userEvent.setup();
    mockGeolocation(undefined);

    render(<NearbyPracticeSearch careLevel="selfcare" />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    expect(screen.getByText('Ihr Browser unterstützt keine Standortfreigabe.')).toBeInTheDocument();
  });

  it('filters manual searches to the exact entered postal code', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: '49.47', lon: '8.48', display_name: '68163 Mannheim' }],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          provider: 'google',
          places: [
            {
              id: 'matching-place',
              name: 'Praxis in 68163',
              address: 'Musterstraße 1, 68163 Mannheim',
              latitude: 49.47,
              longitude: 8.48,
              primaryType: 'doctor',
              types: ['doctor'],
              openNow: true,
              weekdayDescriptions: [],
            },
            {
              id: 'other-place',
              name: 'Praxis in 68165',
              address: 'Andere Straße 2, 68165 Mannheim',
              latitude: 49.48,
              longitude: 8.49,
              primaryType: 'doctor',
              types: ['doctor'],
              openNow: false,
              weekdayDescriptions: [],
            },
          ],
        }),
      } as Response);
    vi.stubGlobal('fetch', fetchMock);

    render(<NearbyPracticeSearch careLevel="specialist" specialties={['urology']} />);

    await user.type(screen.getByLabelText('PLZ oder Adresse'), '68163');
    await user.click(screen.getByRole('button', { name: 'Suchen' }));

    await waitFor(() => {
      expect(screen.getByText(/1 Einrichtung gefunden/)).toBeInTheDocument();
    });

    expect(screen.getByText('Praxis in 68163')).toBeInTheDocument();
    expect(screen.queryByText('Praxis in 68165')).not.toBeInTheDocument();
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
