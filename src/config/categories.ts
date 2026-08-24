import type { Category } from '../types'

export const DEFAULT_CATEGORY_LABELS = [
  'Ignores robot',
  'Glances',
  'Sustained attention',
  'Changes trajectory',
  'Stops',
  'Smiles',
  'Laughs',
  'Startles',
  'Greets robot',
  'Speaks about robot',
  'Speaks to robot',
  'Approaches',
  'Follows',
  'Other',
  'Waves',
  'Glances Back to See Robot',
  'Takes Picture',
  "Blocks Robot's Path",
  'Surprised',
  'Interacts with robot',
  'Dances',
  'Reads what is written',
  'Comes back to the robot',
] as const

const LEGACY_DEFAULT_LABELS = [
  'Ignores robot',
  'Glances',
  'Sustained attention',
  'Changes trajectory',
  'Stops',
  'Smiles / laughs',
  'Startles',
  'Greets robot',
  'Speaks about robot',
  'Speaks to robot',
  'Approaches',
  'Follows',
  'Other',
]

export const DEFAULT_CATEGORIES: Category[] = DEFAULT_CATEGORY_LABELS.map((label) => ({
  id: crypto.randomUUID(),
  label,
  enabled: true,
}))

export function upgradeLegacyDefaultCategories(categories: Category[]): Category[] {
  const isLegacyDefault = categories.length === LEGACY_DEFAULT_LABELS.length
    && categories.every((category, index) => category.label === LEGACY_DEFAULT_LABELS[index])

  if (!isLegacyDefault) return categories

  const existingByLabel = new Map(categories.map((category) => [category.label, category]))
  return DEFAULT_CATEGORY_LABELS.map((label) => existingByLabel.get(label) ?? {
    id: crypto.randomUUID(),
    label,
    enabled: true,
  })
}
