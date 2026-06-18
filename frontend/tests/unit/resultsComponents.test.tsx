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
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 49.487,
            lon: 8.466,
            tags: {
              name: 'Praxis Kardiologie am Stadtpark',
              healthcare: 'doctor',
              opening_hours: '24/7',
              'addr:street': 'Parkstraße',
              'addr:housenumber': '1',
              'addr:postcode': '68161',
              'addr:city': 'Mannheim',
            },
          },
          {
            type: 'node',
            id: 2,
            lat: 49.49,
            lon: 8.47,
            tags: {
              name: 'Kardiologie Zentrum',
              healthcare: 'doctor',
              opening_hours: '24/7',
              'addr:street': 'Hauptstraße',
              'addr:housenumber': '2',
              'addr:postcode': '68159',
              'addr:city': 'Mannheim',
            },
          },
        ],
      }),
    } as Response));

    render(<NearbyPracticeSearch careLevel="specialist" specialties={['cardiology']} />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    await waitFor(() => {
      expect(screen.getByText(/2 offene Einrichtungen gefunden/)).toBeInTheDocument();
    });

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
