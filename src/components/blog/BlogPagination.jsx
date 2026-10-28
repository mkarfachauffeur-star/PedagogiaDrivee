import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function BlogPagination({ page, totalPages, onPageChange, isDark }) {
  if (totalPages <= 1) return null

  const btnClass = (disabled) =>
    [
      'inline-flex h-10 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold transition',
      disabled
        ? 'cursor-not-allowed opacity-40'
        : isDark
          ? 'border-white/10 text-slate-200 hover:bg-white/5'
          : 'border-slate-300 text-slate-700 hover:bg-slate-50',
    ].join(' ')

  const pageBtnClass = (active) =>
    [
      'inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition',
      active
        ? isDark
          ? 'border-blue-400/40 bg-blue-500/15 text-blue-200'
          : 'border-blue-400 bg-blue-50 text-blue-700'
        : isDark
          ? 'border-white/10 text-slate-300 hover:bg-white/5'
          : 'border-slate-300 text-slate-600 hover:bg-slate-50',
    ].join(' ')

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <nav aria-label="Pagination du blog" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button
        aria-label="Page précédente"
        className={btnClass(page <= 1)}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        Préc.
      </button>
      {pages.map((pageNumber) => (
        <button
          aria-current={pageNumber === page ? 'page' : undefined}
          aria-label={`Page ${pageNumber}`}
          className={pageBtnClass(pageNumber === page)}
          key={pageNumber}
          onClick={() => onPageChange(pageNumber)}
          type="button"
        >
          {pageNumber}
        </button>
      ))}
      <button
        aria-label="Page suivante"
        className={btnClass(page >= totalPages)}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Suiv.
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </nav>
  )
}
