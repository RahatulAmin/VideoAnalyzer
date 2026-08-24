import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORY_LABELS, upgradeLegacyDefaultCategories } from './categories'
import type { Category } from '../types'

const legacyLabels = [
  'Ignores robot', 'Glances', 'Sustained attention', 'Changes trajectory', 'Stops',
  'Smiles / laughs', 'Startles', 'Greets robot', 'Speaks about robot', 'Speaks to robot',
  'Approaches', 'Follows', 'Other',
]

describe('observation categories', () => {
  it('contains the requested 23 categories in order', () => {
    expect(DEFAULT_CATEGORY_LABELS).toHaveLength(23)
    expect(DEFAULT_CATEGORY_LABELS.at(-2)).toBe('Reads what is written')
    expect(DEFAULT_CATEGORY_LABELS.at(-1)).toBe('Comes back to the robot')
  })

  it('upgrades an unchanged legacy list', () => {
    const legacy: Category[] = legacyLabels.map((label) => ({ id: label, label, enabled: true }))
    expect(upgradeLegacyDefaultCategories(legacy).map((category) => category.label)).toEqual(DEFAULT_CATEGORY_LABELS)
  })

  it('preserves customized project categories', () => {
    const custom: Category[] = [{ id: 'custom', label: 'Custom reaction', enabled: true }]
    expect(upgradeLegacyDefaultCategories(custom)).toBe(custom)
  })
})
