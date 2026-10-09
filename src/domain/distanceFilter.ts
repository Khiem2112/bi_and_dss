import type { DistanceFilter, DistanceRange, FlightRecord } from './types'

export function getDistanceGroup(distance: number): string {
  const group = Math.min(11, Math.max(1, Math.floor(distance / 250) + 1))
  return `G${String(group).padStart(2, '0')}`
}

export function matchesDistanceRange(distance: number, range?: DistanceRange): boolean {
  return !range || (distance >= range.minMiles && distance <= range.maxMiles)
}

export function matchesDistanceFilter(flight: Pick<FlightRecord, 'DISTANCE'>, filter?: DistanceFilter | null): boolean {
  if (!filter) return true
  if (filter.mode === 'groups') {
    return filter.groups.length === 0 || filter.groups.includes(getDistanceGroup(flight.DISTANCE))
  }
  return matchesDistanceRange(flight.DISTANCE, filter)
}

export function cloneDistanceFilter(filter?: DistanceFilter | null): DistanceFilter | null {
  if (!filter) return null
  return filter.mode === 'groups' ? { mode: 'groups', groups: [...filter.groups] } : { ...filter }
}

export function formatDistanceRange(range: DistanceRange): string {
  return `${range.minMiles.toLocaleString('vi-VN')}–${range.maxMiles.toLocaleString('vi-VN')} dặm`
}

export function formatDistanceFilter(filter?: DistanceFilter | null): string {
  if (!filter) return 'Tất cả cự ly'
  if (filter.mode === 'groups') {
    return filter.groups.length <= 3 ? filter.groups.join(', ') : `${filter.groups.length} nhóm chuẩn`
  }
  return formatDistanceRange(filter)
}
