import type { AirportClause, FlightRecord } from './types'

export function matchesAirportClause(
  flight: Pick<FlightRecord, 'ORIGIN' | 'DEST'>,
  clause: AirportClause,
): boolean {
  if (clause.mode === 'route') {
    return flight.ORIGIN === clause.origin && flight.DEST === clause.destination
  }
  if (clause.mode === 'origin') return flight.ORIGIN === clause.airport
  if (clause.mode === 'destination') return flight.DEST === clause.airport
  if (clause.mode === 'airport') {
    const list = clause.airports && clause.airports.length > 0 ? clause.airports : clause.airport ? [clause.airport] : []
    return list.includes(flight.ORIGIN) || list.includes(flight.DEST)
  }
  return false
}

export function matchesAirportClauseGroup(
  flight: Pick<FlightRecord, 'ORIGIN' | 'DEST'>,
  clauses: readonly AirportClause[] | undefined,
): boolean {
  return !clauses?.length || clauses.some((clause) => matchesAirportClause(flight, clause))
}

export function airportClauseKey(clause: AirportClause): string {
  if (clause.mode === 'route') {
    return `${clause.mode}:${clause.origin}:${clause.destination}`
  }
  if (clause.mode === 'airport') {
    const list = clause.airports && clause.airports.length > 0 ? [...clause.airports].sort() : clause.airport ? [clause.airport] : []
    return `${clause.mode}:${list.join(',')}`
  }
  return `${clause.mode}:${clause.airport}`
}

export function isCompleteAirportClause(clause: AirportClause): boolean {
  if (clause.mode === 'route') {
    return Boolean(clause.origin && clause.destination && clause.origin !== clause.destination)
  }
  if (clause.mode === 'airport') {
    return Boolean((clause.airports && clause.airports.length > 0) || clause.airport)
  }
  return Boolean(clause.airport)
}

