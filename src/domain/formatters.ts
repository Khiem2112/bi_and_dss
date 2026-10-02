import type { SampleFlag } from './types'

export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return dateStr
}

export const sampleFlagLabels: Record<SampleFlag, string> = {
  Sufficient: 'Đủ mẫu',
  'Low sample': 'Cỡ mẫu thấp',
  Uncalibrated: 'Chưa hiệu chỉnh',
}

export function formatSampleFlag(flag: string): string {
  return sampleFlagLabels[flag as SampleFlag] ?? flag
}

export const riskLabels: Record<string, string> = {
  High: 'Cao',
  Elevated: 'Tăng cao',
  Monitor: 'Theo dõi',
}

export function formatRiskLabel(label: string): string {
  return riskLabels[label] ?? label
}

export const decisionLabels: Record<string, string> = {
  'Review first': 'Ưu tiên xem xét',
  Monitor: 'Theo dõi',
  'Insufficient evidence': 'Chưa đủ bằng chứng',
}

export function formatDecision(value: string): string {
  return decisionLabels[value] ?? value
}

export const priorityLabels: Record<string, string> = {
  'Review first': 'Ưu tiên xem xét',
  Monitor: 'Theo dõi',
  Uncalibrated: 'Chưa hiệu chỉnh',
  Locked: 'Đã khóa',
}

export function formatPriority(value: string): string {
  return priorityLabels[value] ?? value
}

export const roleLabels: Record<string, string> = {
  Origin: 'Sân bay đi',
  Destination: 'Sân bay đến',
}

export function formatRole(role: string): string {
  return roleLabels[role] ?? role
}

export const entityTypeLabels: Record<string, string> = {
  Airport: 'Sân bay',
  Route: 'Đường bay',
  Time: 'Thời gian',
}

export function formatEntityType(type: string): string {
  return entityTypeLabels[type] ?? type
}

export const seasonLabels: Record<string, string> = {
  Winter: 'Mùa đông',
  Spring: 'Mùa xuân',
  Summer: 'Mùa hè',
  Autumn: 'Mùa thu',
}

export function formatSeason(season: string): string {
  return seasonLabels[season] ?? season
}

export const monthLabels: Record<string, string> = {
  Jan: 'Tháng 1',
  Feb: 'Tháng 2',
  Mar: 'Tháng 3',
  Apr: 'Tháng 4',
  May: 'Tháng 5',
  Jun: 'Tháng 6',
  Jul: 'Tháng 7',
  Aug: 'Tháng 8',
  Sep: 'Tháng 9',
  Oct: 'Tháng 10',
  Nov: 'Tháng 11',
  Dec: 'Tháng 12',
}

export function formatMonth(month: string): string {
  return monthLabels[month] ?? month
}

export const timeBlockLabels: Record<string, string> = {
  'Early Morning': 'Sáng sớm',
  Morning: 'Buổi sáng',
  Afternoon: 'Buổi chiều',
  Evening: 'Buổi tối',
}

export function formatTimeBlock(block: string): string {
  return timeBlockLabels[block] ?? block
}

export const causeLabels: Record<string, string> = {
  'Late aircraft': 'Máy bay đến trễ',
  Carrier: 'Hãng bay',
  NAS: 'Hệ thống vùng trời quốc gia (NAS)',
  Weather: 'Thời tiết',
  Security: 'An ninh',
}

export function formatCauseLabel(label: string): string {
  return causeLabels[label] ?? label
}

export function formatTemporalCell(cell: string): string {
  return cell
    .replace('Friday', 'Thứ Sáu')
    .replace('Saturday', 'Thứ Bảy')
    .replace('Sunday', 'Chủ Nhật')
    .replace('Monday', 'Thứ Hai')
    .replace('Tuesday', 'Thứ Ba')
    .replace('Wednesday', 'Thứ Tư')
    .replace('Thursday', 'Thứ Năm')
    .replace('Early Morning', 'Sáng sớm')
    .replace('Morning', 'Buổi sáng')
    .replace('Afternoon', 'Buổi chiều')
    .replace('Evening', 'Buổi tối')
}
