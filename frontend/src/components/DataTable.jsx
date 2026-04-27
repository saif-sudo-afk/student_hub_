import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function DataTable({ columns, rows = [], filters = [], pageSize = 8, emptyKey = 'common.noData' }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [filterValues, setFilterValues] = useState({})

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows.filter(row => {
      const matchesSearch = !normalized || JSON.stringify(row).toLowerCase().includes(normalized)
      const matchesFilters = filters.every(filter => {
        const selected = filterValues[filter.key]
        if (!selected) return true
        return String(row[filter.key] ?? '') === String(selected)
      })
      return matchesSearch && matchesFilters
    })
  }, [rows, query, filters, filterValues])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = visibleRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
          <input
            className="input-field pl-10"
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder={t('common.search')}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <select
              key={filter.key}
              className="input-field min-w-36 py-2"
              value={filterValues[filter.key] || ''}
              onChange={event => {
                setFilterValues(prev => ({ ...prev, [filter.key]: event.target.value }))
                setPage(1)
              }}
            >
              <option value="">{t(filter.labelKey)}</option>
              {filter.options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)]">
            <thead className="bg-slate-500/5">
              <tr>
                {columns.map(column => (
                  <th key={column.key} className="table-header">{t(column.labelKey)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {paginated.map((row, index) => (
                <motion.tr
                  key={row.id || index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-slate-500/5"
                >
                  {columns.map(column => (
                    <td key={column.key} className="table-cell">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </motion.tr>
              ))}
              {!paginated.length && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                    {t(emptyKey)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>{t('common.pageOf', { page: safePage, total: totalPages })}</span>
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2" type="button" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            {t('common.previous')}
          </button>
          <button className="btn-secondary px-3 py-2" type="button" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            {t('common.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
