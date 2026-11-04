import { createElement } from 'react'
import { CheckCircle2 } from 'lucide-react'

const TONES = {
  blue: { band: 'bg-[#1769FF] text-white', badge: 'bg-[#1769FF] text-white', border: 'border-blue-100', soft: 'bg-blue-50/60' },
  rose: { band: 'bg-rose-600 text-white', badge: 'bg-rose-600 text-white', border: 'border-rose-100', soft: 'bg-rose-50/60' },
  emerald: { band: 'bg-emerald-600 text-white', badge: 'bg-emerald-600 text-white', border: 'border-emerald-100', soft: 'bg-emerald-50/60' },
}

function Row({ icon, label, children }) {
  if (!children) return null
  return (
    <div className="flex gap-2 text-sm leading-6 text-slate-700">
      {icon ? createElement(icon, { 'aria-hidden': true, className: 'mt-1 h-4 w-4 shrink-0 text-slate-400' }) : null}
      <p>
        {label ? <span className="font-medium text-slate-900">{label} : </span> : null}
        {children}
      </p>
    </div>
  )
}

/**
 * Fiche de cours affichée en texte (et non en image) : nette sur tous les écrans,
 * lisible sans zoom sur iPhone et Android, et accessible aux lecteurs d'écran.
 */
export default function LessonInfographic({ infographic }) {
  if (!infographic) return null
  const { title, subtitle, sections = [], tips } = infographic

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4 text-center sm:px-6">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>

      <div className="grid gap-4 p-3 sm:p-4">
        {sections.map((section) => {
          const tone = TONES[section.tone] || TONES.blue
          return (
            <section className={`overflow-hidden rounded-lg border ${tone.border}`} key={section.title}>
              <h4 className={`px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide ${tone.band}`}>{section.title}</h4>
              <ol className="grid gap-px bg-slate-100 sm:grid-cols-3">
                {section.items.map((item) => (
                  <li className="flex flex-col gap-2 bg-white p-4" key={item.number}>
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${tone.badge}`}>
                        {item.number}
                      </span>
                      <h5 className="text-sm font-semibold text-slate-900">{item.title}</h5>
                    </div>
                    {item.lines.map((line) => (
                      <Row icon={line.icon} key={line.text} label={line.label}>
                        {line.text}
                      </Row>
                    ))}
                  </li>
                ))}
              </ol>
            </section>
          )
        })}

        {tips?.items?.length ? (
          <section className={`overflow-hidden rounded-lg border ${TONES.emerald.border}`}>
            <h4 className={`px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide ${TONES.emerald.band}`}>{tips.title}</h4>
            <ul className="grid gap-px bg-slate-100 sm:grid-cols-2">
              {tips.items.map((tip) => (
                <li className="flex gap-2 bg-white p-4 text-sm leading-6 text-slate-700" key={tip}>
                  <CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
