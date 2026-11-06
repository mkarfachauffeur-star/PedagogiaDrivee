import { Search } from 'lucide-react'

export default function ListSearchField({ value, onChange, className = '', placeholder = 'Rechercher…' }) {
  return (
    <label className={`relative block w-full max-w-md ${className}`}>
      <span className="sr-only">Rechercher</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#1769FF] focus:ring-2 focus:ring-[#1769FF]/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </label>
  )
}
