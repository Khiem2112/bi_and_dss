import type { MultiSelectItem } from '../atoms/Combobox/MultiSelectCombobox'

export const DISTANCE_SLIDER_MIN = 0
export const DISTANCE_SLIDER_MAX = 5000
export const DISTANCE_SLIDER_STEP = 10

export const DISTANCE_GROUP_OPTIONS: readonly MultiSelectItem[] = [
  { value: 'G01', label: 'G01', subLabel: '0–249 dặm' },
  { value: 'G02', label: 'G02', subLabel: '250–499 dặm' },
  { value: 'G03', label: 'G03', subLabel: '500–749 dặm' },
  { value: 'G04', label: 'G04', subLabel: '750–999 dặm' },
  { value: 'G05', label: 'G05', subLabel: '1.000–1.249 dặm' },
  { value: 'G06', label: 'G06', subLabel: '1.250–1.499 dặm' },
  { value: 'G07', label: 'G07', subLabel: '1.500–1.749 dặm' },
  { value: 'G08', label: 'G08', subLabel: '1.750–1.999 dặm' },
  { value: 'G09', label: 'G09', subLabel: '2.000–2.249 dặm' },
  { value: 'G10', label: 'G10', subLabel: '2.250–2.499 dặm' },
  { value: 'G11', label: 'G11', subLabel: 'Từ 2.500 dặm' },
]

export function formatDistanceGroups(groups: readonly string[]): string {
  if (groups.length === 0) return 'Tất cả nhóm chuẩn'
  if (groups.length <= 3) return groups.join(', ')
  return `${groups.length} nhóm chuẩn`
}
