import { describe, expect, it } from 'vitest'
import { normalizeGermanText } from '../../../src/shared/normalizeGermanText.js'

describe('normalizeGermanText', () => {
  /** Display normalization should convert ASCII German fallbacks into readable text. */
  it('ersetzt ASCII-Umschreibungen in angezeigten deutschen Texten', () => {
    expect(
      normalizeGermanText(
        'Die Schmerzstaerke sollte fachaerztlich abgeklärt werden. Die Beschwerden koennen zunaechst beobachtet werden.',
      ),
    ).toBe(
      'Die Schmerzstärke sollte fachärztlich abgeklärt werden. Die Beschwerden können zunächst beobachtet werden.',
    )
  })
})
