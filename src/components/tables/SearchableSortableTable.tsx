import { useMemo, useState, type ReactNode } from 'react'
import { EmptyState } from '../ui/Card'

export type SortPrimitive = string | number | boolean | Date | null
type SortDirection = 'none' | 'asc' | 'desc'

export interface DashboardTableColumn<Row> {
  id: string
  header: string
  cell: (row: Row) => ReactNode
  searchValue: (row: Row) => readonly (string | number | null)[]
  sortValue: (row: Row) => SortPrimitive
  align?: 'left' | 'right' | 'center'
}

interface SearchableSortableTableProps<Row> {
  tableLabel: string
  rows: readonly Row[]
  columns: readonly DashboardTableColumn<Row>[]
  rowId: (row: Row) => string
  selectedRowId?: string
  onSelectRow?: (row: Row) => void
  onRowContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>, row: Row) => void
  searchPlaceholder?: string
  initialSortBy?: string
  initialSortDirection?: Exclude<SortDirection, 'none'>
}

function normalizeTableSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim()
    .replace(/\s+/g, ' ')
}

function nextDirection(direction: SortDirection): SortDirection {
  if (direction === 'none') return 'asc'
  if (direction === 'asc') return 'desc'
  return 'none'
}

function comparePrimitive(left: SortPrimitive, right: SortPrimitive): number {
  if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime()
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right)
  return new Intl.Collator('vi', { numeric: true, sensitivity: 'base' }).compare(String(left), String(right))
}

export function SearchableSortableTable<Row>({
  tableLabel,
  rows,
  columns,
  rowId,
  selectedRowId,
  onSelectRow,
  onRowContextMenu,
  searchPlaceholder = 'Tìm kiếm trong bảng',
  initialSortBy,
  initialSortDirection = 'asc',
}: SearchableSortableTableProps<Row>) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(initialSortBy ?? null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortBy ? initialSortDirection : 'none')

  const visibleRows = useMemo(() => {
    const terms = normalizeTableSearch(query).split(' ').filter(Boolean)
    const filtered = terms.length === 0
      ? [...rows]
      : rows.filter((row) => {
          const index = normalizeTableSearch(
            columns.flatMap((column) => column.searchValue(row)).filter((value) => value !== null).join(' '),
          )
          return terms.every((term) => index.includes(term))
        })

    if (!sortBy || sortDirection === 'none') return filtered
    const column = columns.find((item) => item.id === sortBy)
    if (!column) return filtered

    return filtered
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const leftValue = column.sortValue(left.row)
        const rightValue = column.sortValue(right.row)
        if (leftValue === null && rightValue === null) return rowId(left.row).localeCompare(rowId(right.row), 'vi')
        if (leftValue === null) return 1
        if (rightValue === null) return -1
        const result = comparePrimitive(leftValue, rightValue)
        if (result === 0) return rowId(left.row).localeCompare(rowId(right.row), 'vi')
        return sortDirection === 'asc' ? result : -result
      })
      .map(({ row }) => row)
  }, [columns, query, rowId, rows, sortBy, sortDirection])

  const toggleSort = (columnId: string) => {
    if (sortBy !== columnId) {
      setSortBy(columnId)
      setSortDirection('asc')
      return
    }
    const next = nextDirection(sortDirection)
    setSortDirection(next)
    if (next === 'none') setSortBy(null)
  }

  return (
    <div className="searchable-table">
      <div className="table-toolbar">
        <label className="table-search-label">
          <span>Tìm kiếm trong bảng</span>
          <input
            className="table-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`Tìm kiếm trong ${tableLabel}`}
          />
        </label>
        {query && (
          <button className="btn btn-ghost btn--xs" type="button" onClick={() => setQuery('')} aria-label="Xóa nội dung tìm kiếm">
            Xóa tìm kiếm
          </button>
        )}
        <span className="table-result-count" role="status" aria-live="polite">{visibleRows.length} kết quả</span>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          title="Không có kết quả phù hợp"
          detail={query ? `Không có dữ liệu khớp “${query}”. Bộ lọc toàn cục vẫn được giữ nguyên.` : 'Không có dữ liệu theo bộ lọc hiện tại.'}
          action={query ? <button className="btn btn-secondary" type="button" onClick={() => setQuery('')}>Xóa nội dung tìm kiếm</button> : undefined}
        />
      ) : (
        <div className="table-wrap">
          <table aria-label={tableLabel}>
            <thead>
              <tr>
                {columns.map((column) => {
                  const active = sortBy === column.id ? sortDirection : 'none'
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}
                      style={{ textAlign: column.align ?? 'left' }}
                    >
                      <button
                        className="table-sort-button"
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        aria-label={`${column.header}. ${active === 'asc' ? 'Đang sắp xếp tăng dần' : active === 'desc' ? 'Đang sắp xếp giảm dần' : 'Chưa sắp xếp'}`}
                      >
                        <span>{column.header}</span>
                        <span className="sort-icon" aria-hidden="true">{active === 'asc' ? '▲' : active === 'desc' ? '▼' : '↕'}</span>
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const id = rowId(row)
                return (
                  <tr
                    key={id}
                    data-analysis-unit={`table-row-${id}`}
                    className={`${onSelectRow ? 'selectable' : ''}${selectedRowId === id ? ' selected' : ''}`}
                    tabIndex={onSelectRow ? 0 : undefined}
                    onClick={() => onSelectRow?.(row)}
                    onContextMenu={(event) => onRowContextMenu?.(event, row)}
                    onKeyDown={(event) => {
                      if (!onSelectRow || (event.key !== 'Enter' && event.key !== ' ')) return
                      event.preventDefault()
                      onSelectRow(row)
                    }}
                  >
                    {columns.map((column) => <td key={column.id} style={{ textAlign: column.align ?? 'left' }}>{column.cell(row)}</td>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
