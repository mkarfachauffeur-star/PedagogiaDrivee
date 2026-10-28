import { useMemo, useState } from 'react'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function toIso(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIso(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

// Sélecteur de date au design PEDAGOGIA DRIVE.
// Les dimanches sont grisés et non sélectionnables (disableSundays).
export default function WeekdayDatePicker({ label, value, onChange, disableSundays = true }) {
  const [open, setOpen] = useState(false)
  const selected = parseIso(value)
  const [view, setView] = useState(() => {
    const base = parseIso(value) || new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const days = useMemo(() => {
    const firstDay = new Date(view.getFullYear(), view.getMonth(), 1)
    const startOffset = (firstDay.getDay() + 6) % 7 // semaine commençant le lundi
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const cells = []
    for (let index = 0; index < startOffset; index += 1) cells.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(view.getFullYear(), view.getMonth(), day))
    }
    return cells
  }, [view])

  const changeMonth = (delta) =>
    setView((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))

  const pick = (date) => {
    if (!date) return
    if (disableSundays && date.getDay() === 0) return
    onChange(toIso(date))
    setOpen(false)
  }

  const displayValue = selected
    ? `${String(selected.getDate()).padStart(2, '0')}/${String(selected.getMonth() + 1).padStart(2, '0')}/${selected.getFullYear()}`
    : 'Choisir une date'

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 text-left text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        >
          <span className={selected ? '' : 'text-slate-400'}>{displayValue}</span>
          <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="17" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 z-20 mt-2 w-72 rounded-2xl border border-slate-300 bg-white p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-xl text-lg font-semibold text-slate-500 transition hover:bg-slate-100"
                  onClick={() => changeMonth(-1)}
                  aria-label="Mois précédent"
                >
                  ‹
                </button>
                <p className="text-sm font-semibold text-slate-900">
                  {MONTHS[view.getMonth()]} {view.getFullYear()}
                </p>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-xl text-lg font-semibold text-slate-500 transition hover:bg-slate-100"
                  onClick={() => changeMonth(1)}
                  aria-label="Mois suivant"
                >
                  ›
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-400">
                {WEEKDAYS.map((day, index) => (
                  <span key={day} className={index === 6 ? 'text-slate-300' : ''}>{day}</span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) return <span key={`empty-${index}`} />
                  const sunday = disableSundays && date.getDay() === 0
                  const isSelected = selected && toIso(date) === toIso(selected)
                  return (
                    <button
                      key={toIso(date)}
                      type="button"
                      disabled={sunday}
                      onClick={() => pick(date)}
                      className={`grid h-9 place-items-center rounded-xl text-sm font-semibold transition ${
                        sunday
                          ? 'cursor-not-allowed text-slate-300'
                          : isSelected
                            ? 'bg-[#1769FF] text-white'
                            : 'text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>

              <p className="mt-3 text-[11px] font-semibold text-slate-400">
                Les dimanches ne sont pas disponibles.
              </p>
            </div>
          </>
        )}
      </div>
    </label>
  )
}
