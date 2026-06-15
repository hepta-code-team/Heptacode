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
      success({} as GeolocationPosition);
    });
    mockGeolocation(getCurrentPosition);

    render(<NearbyPracticeSearch careLevel="specialist" specialties={['cardiology']} />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    await waitFor(() => {
      expect(screen.getByText(/Standort freigegeben/)).toBeInTheDocument();
    });

    expect(screen.getByText('Praxis Kardiologie am Stadtpark')).toBeInTheDocument();
    expect(screen.getByText(/420 m entfernt/)).toBeInTheDocument();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/dir'),
    );
  });

  it('falls back to mock facilities when geolocation is unavailable or denied', async () => {
    const user = userEvent.setup();
    mockGeolocation(undefined);

    render(<NearbyPracticeSearch careLevel="selfcare" />);

    await user.click(screen.getByRole('button', { name: /Standort freigeben/ }));

    expect(await screen.findByText('Apotheke am Park')).toBeInTheDocument();
    expect(screen.queryByText(/Standort freigegeben/)).not.toBeInTheDocument();
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

