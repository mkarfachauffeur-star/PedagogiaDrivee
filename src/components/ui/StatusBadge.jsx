const TONES = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-blue-50 text-blue-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-700',
}

/** Pastille de statut : même forme partout, la couleur porte le sens. */
export default function StatusBadge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${TONES[tone] || TONES.neutral}`}>
      {children}
    </span>
  )
}
