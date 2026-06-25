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
            openingHours: '24/7',
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
      expect(screen.getByText(/2 offene Einrichtungen gefunden/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Standort aktualisieren/ })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /PLZ oder Adresse/ })).toBeInTheDocument();
    expect(screen.getByText('Datenquelle: Google Maps')).toBeInTheDocument();
    expect(screen.getByText('Praxis Kardiologie am Stadtpark')).toBeInTheDocument();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir'),
    );
  });

  it('shows a helpful message when geolocation is unavailable', async () => {
    const user = userEvent.setup();
    mockGeolocation(undefined);

    render(<NearbyPracticeSearch careLevel="selfcare" />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    expect(screen.getByText('Ihr Browser unterstützt keine Standortfreigabe.')).toBeInTheDocument();
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
