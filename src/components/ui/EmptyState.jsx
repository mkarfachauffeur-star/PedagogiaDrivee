export default function EmptyState({
  title = 'Aucune donnée disponible',
  message = 'Aucune donnée disponible pour le moment.',
  icon = '📭',
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-slate-100">
        {icon}
      </span>
      {title && <p className="text-base font-semibold text-slate-700">{title}</p>}
      {message && <p className="max-w-md text-sm font-medium leading-6 text-slate-500">{message}</p>}
    </div>
  )
}
