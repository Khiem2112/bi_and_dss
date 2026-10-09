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
  return flight.ORIGIN === clause.airport || flight.DEST === clause.airport
}

export function matchesAirportClauseGroup(
  flight: Pick<FlightRecord, 'ORIGIN' | 'DEST'>,
  clauses: readonly AirportClause[] | undefined,
): boolean {
  return !clauses?.length || clauses.some((clause) => matchesAirportClause(flight, clause))
}

export function airportClauseKey(clause: AirportClause): string {
  return clause.mode === 'route'
    ? `${clause.mode}:${clause.origin}:${clause.destination}`
    : `${clause.mode}:${clause.airport}`
}

export function isCompleteAirportClause(clause: AirportClause): boolean {
  return clause.mode === 'route'
    ? Boolean(clause.origin && clause.destination && clause.origin !== clause.destination)
    : Boolean(clause.airport)
}

