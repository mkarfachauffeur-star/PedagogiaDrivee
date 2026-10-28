export default function LoadingSpinner({ label = 'Chargement…', className = '' }) {
  return (
    <div
      className={`flex min-h-[40vh] flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        aria-hidden="true"
        className="h-11 w-11 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600"
      />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
    </div>
  )
}
