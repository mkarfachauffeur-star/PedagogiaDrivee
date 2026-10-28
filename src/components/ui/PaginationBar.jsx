export default function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) {
  if (totalItems <= pageSize) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-xs font-semibold text-slate-500">
        {from}–{to} sur {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Précédent
        </button>
        <span className="text-xs font-semibold text-slate-600">
          Page {page} / {totalPages}
        </span>
        <button
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
