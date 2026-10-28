export default function ListSearchField({ value, onChange, className = '' }) {
  return (
    <label className={`block w-full max-w-md ${className}`}>
      <span className="sr-only">Rechercher</span>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        type="search"
        value={value}
      />
    </label>
  )
}
