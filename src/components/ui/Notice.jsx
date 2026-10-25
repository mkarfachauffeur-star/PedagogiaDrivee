const TONES = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
}

/** Message d'information, de succès ou d'erreur affiché en haut d'une page. */
export default function Notice({ tone = 'info', children, action }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${TONES[tone] || TONES.info}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <div className="min-w-0">{children}</div>
      {action ? <div className="shrink-0 font-medium">{action}</div> : null}
    </div>
  )
}
