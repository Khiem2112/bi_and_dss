import { useCallback, useEffect, useState, type DependencyList } from 'react'
import type { DashboardMetadata, QueryState } from '../domain/types'

type MetadataPayload = { metadata: DashboardMetadata }

export function useRepositoryQuery<T extends MetadataPayload>(
  query: () => Promise<T>,
  dependencies: DependencyList,
): QueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((value) => value + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setData(null)
    query()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason : new Error('Lỗi dữ liệu không xác định'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
    // Query dependencies are deliberately supplied by each domain hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadToken])

  const isEmpty = !isLoading && !error && !data

  return {
    data,
    isLoading,
    isError: Boolean(error),
    error,
    isEmpty,
    refetch,
    metadata: data?.metadata ?? null,
  }
}
