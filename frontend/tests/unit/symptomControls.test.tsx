import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DurationSelector from '../../src/features/symptoms/DurationSelector';
import PainScaleSelector from '../../src/features/symptoms/PainScaleSelector';
import SymptomButtonGrid from '../../src/features/symptoms/SymptomButtonGrid';
import SymptomDetailsForm from '../../src/features/symptoms/SymptomDetailsForm';
import { getMeasurementConfigByType, type BodyRegion } from '../../src/features/symptoms/symptoms.constants';
import type { SymptomDraft } from '../../src/types/assessment';

const regions: BodyRegion[] = [
  {
    id: 'kopf',
    name: 'Kopf',
    icon: '/head.png',
    options: ['Stirn', 'Gesicht'],
  },
  {
    id: 'fieber',
    name: 'Fieber',
    icon: '/fever.png',
  },
];

function createSymptom(overrides: Partial<SymptomDraft> = {}): SymptomDraft {
  return {
    id: 'symptom-1',
    region: 'Kopfschmerzen',
    side: undefined,
    details: 'dumpfer Druck',
    measurementType: 'pain',
    measurementValue: 5,
    duration: undefined,
    active: true,
    isNameEditable: true,
    ...overrides,
  };
}

describe('symptom control components', () => {
  it('lets users select a symptom duration and exposes validation errors', async () => {
    const user = userEvent.setup();
    const onDurationChange = vi.fn();

    render(
      <DurationSelector
        selectedDuration={undefined}
        onDurationChange={onDurationChange}
        showError
      />,
    );

    expect(screen.getByText('Bitte auswählen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Seit heute' }));

    expect(onDurationChange).toHaveBeenCalledWith('today');
  });

  it('lets users choose pain and temperature values', async () => {
    const user = userEvent.setup();
    const onPainChange = vi.fn();
    const onTemperatureChange = vi.fn();

    const { rerender } = render(
      <PainScaleSelector
        config={getMeasurementConfigByType('pain')}
        value={5}
        onValueChange={onPainChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: '8' }));
    expect(onPainChange).toHaveBeenCalledWith(8);

    await user.click(screen.getByRole('button', { name: 'Informationen zur Schmerzskala' }));
    expect(screen.getByRole('heading', { name: 'Numerische Rating-Skala' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verstanden' }));
    expect(screen.queryByRole('heading', { name: 'Numerische Rating-Skala' })).not.toBeInTheDocument();

    rerender(
      <PainScaleSelector
        config={getMeasurementConfigByType('temperature')}
        value={38}
        onValueChange={onTemperatureChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: '39.5' }));
    expect(onTemperatureChange).toHaveBeenCalledWith(39.5);
  });

  it('supports direct, option, inline-option and other symptom selections', async () => {
    const user = userEvent.setup();
    const onRegionSelect = vi.fn();
    const onOtherClick = vi.fn();

    const { rerender } = render(
      <SymptomButtonGrid
        regions={regions}
        onRegionSelect={onRegionSelect}
        showOtherOption
        onOtherClick={onOtherClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Fieber' }));
    expect(onRegionSelect).toHaveBeenCalledWith('Fieber');

    await user.click(screen.getByRole('button', { name: 'Kopf' }));
    await user.click(screen.getByRole('button', { name: 'Stirn' }));
    expect(onRegionSelect).toHaveBeenCalledWith('Kopf', 'Stirn');

    await user.click(screen.getByRole('button', { name: 'Symptome umschreiben' }));
    expect(onOtherClick).toHaveBeenCalledTimes(1);

    rerender(
      <SymptomButtonGrid
        regions={regions}
        inlineOptions
        onRegionSelect={onRegionSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Kopf\s+Stirn/ }));
    expect(onRegionSelect).toHaveBeenCalledWith('Kopf', 'Stirn');
  });

  it('disables new selections once the maximum number of symptoms is reached', () => {
    render(
      <SymptomButtonGrid
        regions={regions}
        selectedRegions={['Kopf', 'Bauch', 'Brust']}
        onRegionSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Fieber' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kopf' })).not.toBeDisabled();
  });

  it('edits symptom name, details, measurement, duration and removal through the details form', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const onNameUpdate = vi.fn();
    const onRemove = vi.fn();

    render(
      <SymptomDetailsForm
        symptom={createSymptom()}
        onUpdate={onUpdate}
        onNameUpdate={onNameUpdate}
        onRemove={onRemove}
        showDurationError
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Symptomname bearbeiten' }));
    fireEvent.change(screen.getByLabelText('Symptomname bearbeiten'), {
      target: { value: 'Migräne' },
    });
    expect(onNameUpdate).toHaveBeenLastCalledWith('Migräne');

    await user.click(screen.getByRole('button', { name: 'Zusatzdetails bearbeiten' }));
    fireEvent.change(screen.getByLabelText('Zusatzdetails bearbeiten'), {
      target: { value: 'einseitig' },
    });
    expect(onUpdate).toHaveBeenLastCalledWith('details', 'einseitig');

    await user.click(screen.getByRole('button', { name: '9' }));
    expect(onUpdate).toHaveBeenCalledWith('measurementValue', 9);

    await user.click(screen.getByRole('button', { name: 'Seit einer Woche' }));
    expect(onUpdate).toHaveBeenCalledWith('duration', 'week');

    await user.click(screen.getAllByRole('button')[0]);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
