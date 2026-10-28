import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import EmptyState from './ui/EmptyState'
const toneStyles = {
  cyan: {
    card: 'border-blue-100 bg-white',
    badge: 'bg-blue-50 text-blue-700 ring-blue-100',
    dot: 'bg-blue-500',
    progress: 'from-blue-600 to-blue-400',
  },
  navy: {
    card: 'border-slate-300 bg-white',
    badge: 'bg-slate-100 text-slate-800 ring-slate-300',
    dot: 'bg-slate-600',
    progress: 'from-slate-700 to-blue-600',
  },
  emerald: {
    card: 'border-emerald-100 bg-white',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    dot: 'bg-emerald-500',
    progress: 'from-emerald-600 to-emerald-400',
  },
  amber: {
    card: 'border-amber-100 bg-white',
    badge: 'bg-amber-50 text-amber-700 ring-amber-100',
    dot: 'bg-amber-500',
    progress: 'from-amber-500 to-orange-400',
  },
  rose: {
    card: 'border-rose-100 bg-white',
    badge: 'bg-rose-50 text-rose-700 ring-rose-100',
    dot: 'bg-rose-500',
    progress: 'from-rose-500 to-pink-400',
  },
  violet: {
    card: 'border-violet-100 bg-white',
    badge: 'bg-violet-50 text-violet-700 ring-violet-100',
    dot: 'bg-violet-500',
    progress: 'from-violet-500 to-indigo-400',
  },
}

function getTone(tone = 'cyan') {
  return toneStyles[tone] || toneStyles.cyan
}

function ActionButton({ children, variant = 'primary', onClick, className = '' }) {
  return (
    <button
      className={`${
        variant === 'secondary'
          ? 'pd-btn-secondary'
          : 'pd-btn-primary'
      } ${className}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ProgressBar({ value = 0, tone = 'cyan' }) {
  const styles = getTone(tone)

  return (
    <motion.div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
      <motion.div
        animate={{ width: `${value}%` }}
        className={`h-full rounded-full bg-gradient-to-r ${styles.progress}`}
        initial={{ width: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </motion.div>
  )
}

function Hero({ hero, onAction }) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="pd-section-card overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.45 }}
    >
      <div className="relative grid grid-cols-1 gap-6 bg-gradient-to-br from-navy-950 via-navy-900 to-blue-900 p-4 text-white sm:p-6 md:grid-cols-[1fr_auto] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(239,68,68,0.18),transparent_42%),radial-gradient(circle_at_10%_90%,rgba(59,130,246,0.14),transparent_38%)]" />
        <div className="relative">
          {hero.eyebrow && (
            <span className="inline-flex rounded-full border border-blue-300/30 bg-blue-300/10 px-4 py-1 text-sm font-semibold text-blue-100">
              {hero.eyebrow}
            </span>
          )}
          <div
            className={
              hero.actions?.length
                ? 'mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
                : 'mt-5'
            }
          >
            <div>
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {hero.title}
              </h1>
              {hero.subtitle && (
                <p className="mt-3 max-w-3xl text-base leading-7 text-blue-50/85">{hero.subtitle}</p>
              )}
            </div>
            {hero.actions?.length > 0 && (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                {hero.actions.map((action) => (
                  <ActionButton
                    key={action.label}
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => onAction(action)}
                    variant={action.variant}
                  >
                    {action.label}
                  </ActionButton>
                ))}
              </div>
            )}
          </div>
        </div>

        {hero.focus && (
          <aside className="relative w-full min-w-0 rounded-xl border border-white/15 bg-white p-5 text-slate-900 shadow-2xl md:min-w-64">
            <p className="text-sm font-semibold text-slate-400">
              {hero.focus.label}
            </p>
            <p className="mt-1 text-5xl font-semibold text-blue-600">{hero.focus.value}</p>
            {hero.focus.progress != null && (
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  animate={{ width: `${hero.focus.progress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                  initial={{ width: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            )}
            <p className="mt-3 text-sm leading-6 text-slate-500">{hero.focus.caption}</p>
          </aside>
        )}
      </div>
    </motion.section>
  )
}

function Metrics({ metrics = [], activeDetail, onSelect }) {
  if (!metrics.length) return null

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const styles = getTone(metric.tone)
        const active = activeDetail?.id === `metric-${metric.label}`

        return (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            className={`card-tile text-left backdrop-blur-md ${styles.card} ${
              active ? 'ring-4 ring-blue-500/25' : ''
            }`}
            initial={{ opacity: 0, y: 10 }}
            key={`${metric.label}-${metric.value}`}
            onClick={() =>
              onSelect({
                id: `metric-${metric.label}`,
                title: metric.label,
                subtitle: metric.value,
                description: metric.trend || 'Indicateur disponible pour le suivi opérationnel.',
                tone: metric.tone,
                meta: [
                  { label: 'Valeur', value: metric.value },
                  { label: 'Tendance', value: metric.trend || 'Stable' },
                ],
              })
            }
            transition={{ duration: 0.4, delay: index * 0.05 }}
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{metric.value}</p>
              </div>
              <span className={`mt-1 h-3 w-3 rounded-full ${styles.dot}`} />
            </div>
            {metric.trend && (
              <p className="mt-4 text-sm font-semibold text-slate-500">{metric.trend}</p>
            )}
          </motion.button>
        )
      })}
    </section>
  )
}

function CardSection({ section, activeDetail, onSelect }) {
  if (!section.items?.length) {
    return (
      <section>
        <SectionHeader section={section} />
        <EmptyState title={section.emptyTitle} message={section.emptyMessage} />
      </section>
    )
  }

  return (
    <section>
      <SectionHeader section={section} />
      <div className={`grid gap-4 ${section.columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        {section.items.map((item, index) => {
          const styles = getTone(item.tone)
          const active = activeDetail?.id === `${section.title}-${item.title}`

          return (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className={`card-tile text-left backdrop-blur-md ${styles.card} ${
                active ? 'ring-4 ring-blue-500/25' : ''
              }`}
              initial={{ opacity: 0, y: 10 }}
              key={`${item.badge || item.title}-${item.title}`}
              onClick={() =>
                onSelect({
                  id: `${section.title}-${item.title}`,
                  title: item.title,
                  subtitle: item.badge || item.status || section.title,
                  description: item.description,
                  tone: item.tone,
                  progress: item.progress,
                  meta: item.meta,
                })
              }
              transition={{ duration: 0.4, delay: index * 0.04 }}
              type="button"
            >
              <div className="flex items-start gap-4">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${styles.dot}`} />
                <div className="min-w-0 flex-1">
                  <motion.div className="flex flex-wrap items-center gap-2">
                    {item.badge && (
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles.badge}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.status && (
                      <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.status}
                      </span>
                    )}
                  </motion.div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  )}
                </div>
              </div>
              {item.progress != null && <ProgressBar value={item.progress} tone={item.tone} />}
              {item.meta?.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {item.meta.map((meta) => (
                    <div
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2"
                      key={`${item.title}-${meta.label}`}
                    >
                      <p className="text-xs font-semibold text-slate-500">
                        {meta.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">{meta.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

function TableSection({ section, activeDetail, onSelect }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <motion.div className="border-b border-slate-300 p-5">
        <SectionHeader section={section} compact />
      </motion.div>
      {!section.rows?.length ? (
        <div className="p-5">
          <EmptyState title={section.emptyTitle} message={section.emptyMessage} />
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="pd-table">
          <thead>
            <tr>
              {section.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, index) => (
              <tr
                className={activeDetail?.id === `${section.title}-${row[0]}` ? 'bg-blue-500/10' : ''}
                key={`${row[0]}-${index}`}
              >
                <td className="p-0" colSpan={section.columns.length}>
                  <button
                    className="grid w-full grid-cols-2 text-left transition focus:outline-none focus:ring-4 focus:ring-inset focus:ring-blue-500/20 sm:grid-cols-4"
                    onClick={() =>
                      onSelect({
                        id: `${section.title}-${row[0]}`,
                        title: row[0],
                        subtitle: section.title,
                        description: `Dossier ouvert : ${row.join(' · ')}`,
                        tone: 'cyan',
                        meta: section.columns.map((column, columnIndex) => ({
                          label: column,
                          value: row[columnIndex],
                        })),
                      })
                    }
                    type="button"
                  >
                    {row.map((cell, cellIndex) => (
                      <span
                        className={`px-5 py-4 ${
                          cellIndex === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'
                        }`}
                        key={`${cell}-${cellIndex}`}
                      >
                        {cell}
                      </span>
                    ))}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  )
}

function TimelineSection({ section, activeDetail, onSelect }) {
  if (!section.items?.length) {
    return (
      <section>
        <SectionHeader section={section} />
        <EmptyState title={section.emptyTitle} message={section.emptyMessage} />
      </section>
    )
  }

  return (
    <section>
      <SectionHeader section={section} />
      <div className="grid gap-3">
        {section.items.map((item, index) => {
          const styles = getTone(item.tone)
          const active = activeDetail?.id === `${section.title}-${item.time}-${item.title}`

          return (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4 text-left transition-all duration-300 hover:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 sm:flex-row sm:items-center ${
                active ? 'border-blue-300 ring-4 ring-blue-500/15' : ''
              }`}
              initial={{ opacity: 0, y: 8 }}
              key={`${item.time}-${item.title}`}
              onClick={() =>
                onSelect({
                  id: `${section.title}-${item.time}-${item.title}`,
                  title: item.title,
                  subtitle: item.time,
                  description: item.description,
                  tone: item.tone,
                  meta: [
                    { label: 'Horaire', value: item.time },
                    { label: 'Statut', value: item.status || 'À suivre' },
                  ],
                })
              }
              transition={{ duration: 0.35, delay: index * 0.04 }}
              type="button"
            >
              <div className={`rounded-2xl px-4 py-3 text-center ring-1 ${styles.badge}`}>
                <p className="text-sm font-semibold">{item.time}</p>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
              {item.status && (
                <span className="w-fit rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {item.status}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

function SectionHeader({ section, compact = false }) {
  return (
    <div className={compact ? '' : 'mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end'}>
      <div>
        <h2 className="pd-title-section">{section.title}</h2>
        {section.description && <p className="mt-1 text-sm text-slate-600">{section.description}</p>}
      </div>
      {section.badge && <span className="pd-badge">{section.badge}</span>}
    </div>
  )
}

function DetailPanel({ detail, onClose }) {
  const [actionForm, setActionForm] = useState({
    responsible: '',
    dueDate: '',
    priority: 'Normale',
    note: '',
    saved: false,
  })

  if (!detail) return null
  const styles = getTone(detail.tone)
  const isAction = detail.subtitle === 'Action simulée'

  const updateActionForm = (field, value) => {
    setActionForm((current) => ({ ...current, [field]: value, saved: false }))
  }

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-5"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles.badge}`}>
            {detail.subtitle || 'Détail'}
          </span>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">{detail.title}</h2>
          {detail.description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{detail.description}</p>
          )}
        </div>
        <button className="pd-btn-ghost" onClick={onClose} type="button">
          Fermer
        </button>
      </div>

      {detail.progress != null && <ProgressBar value={detail.progress} tone={detail.tone} />}

      {detail.meta?.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {detail.meta.map((meta) => (
            <motion.div className="rounded-2xl border border-slate-300 bg-slate-50 p-4" key={meta.label}>
              <p className="text-xs font-semibold text-slate-500">{meta.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{meta.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {isAction && (
        <form
          className="mt-5 rounded-xl border border-blue-300 bg-blue-50 p-4"
          onSubmit={(event) => {
            event.preventDefault()
            setActionForm((current) => ({ ...current, saved: true }))
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Responsable</span>
              <input
                className="pd-input mt-2"
                onChange={(event) => updateActionForm('responsible', event.target.value)}
                placeholder="Nom du collaborateur"
                value={actionForm.responsible}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Échéance</span>
              <input
                className="pd-input mt-2"
                onChange={(event) => updateActionForm('dueDate', event.target.value)}
                type="date"
                value={actionForm.dueDate}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Priorité</span>
              <select
                className="pd-input mt-2"
                onChange={(event) => updateActionForm('priority', event.target.value)}
                value={actionForm.priority}
              >
                <option>Normale</option>
                <option>Urgente</option>
                <option>À planifier</option>
              </select>
            </label>
            <label className="block md:col-span-3">
              <span className="text-sm font-semibold text-slate-700">Note administrative</span>
              <textarea
                className="pd-input mt-2 min-h-24 py-3"
                onChange={(event) => updateActionForm('note', event.target.value)}
                placeholder="Ajoutez une consigne, une relance ou un commentaire..."
                value={actionForm.note}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-blue-700">
              {actionForm.saved
                ? 'Action enregistrée.'
                : "Remplissez les champs puis validez l'action."}
            </p>
            <button className="pd-btn-primary" type="submit">
              Valider l'action
            </button>
          </div>
        </form>
      )}
    </motion.section>
  )
}

function renderSection(section, activeDetail, onSelect) {
  if (section.type === 'table') {
    return (
      <TableSection
        activeDetail={activeDetail}
        key={section.title}
        onSelect={onSelect}
        section={section}
      />
    )
  }
  if (section.type === 'timeline') {
    return (
      <TimelineSection
        activeDetail={activeDetail}
        key={section.title}
        onSelect={onSelect}
        section={section}
      />
    )
  }
  return (
    <CardSection
      activeDetail={activeDetail}
      key={section.title}
      onSelect={onSelect}
      section={section}
    />
  )
}

export default function ModernPage({ config, actionHandlers = {} }) {
  const firstDetail = useMemo(() => {
    const firstSection = config.sections?.[0]
    const firstItem = firstSection?.items?.[0]
    if (!firstItem) return null
    return {
      id: `${firstSection.title}-${firstItem.title}`,
      title: firstItem.title,
      subtitle: firstItem.badge || firstItem.status || firstSection.title,
      description: firstItem.description,
      tone: firstItem.tone,
      progress: firstItem.progress,
      meta: firstItem.meta,
    }
  }, [config])
  const [activeDetail, setActiveDetail] = useState(firstDetail)

  const handleAction = (action) => {
    const handler = actionHandlers[action.label]
    if (handler) {
      handler(action)
      return
    }
    setActiveDetail({
      id: `action-${action.label}`,
      title: action.label,
      subtitle: 'Action',
      description: 'Cette action sera disponible prochainement dans votre espace.',
      tone: action.variant === 'secondary' ? 'navy' : 'cyan',
      meta: [
        { label: 'Statut', value: 'À venir' },
      ],
    })
  }

  return (
    <div className="pd-page-content">
      <Hero hero={config.hero} onAction={handleAction} />
      <Metrics activeDetail={activeDetail} metrics={config.metrics} onSelect={setActiveDetail} />
      <DetailPanel detail={activeDetail} onClose={() => setActiveDetail(null)} />
      {config.sections?.map((section) => renderSection(section, activeDetail, setActiveDetail))}
    </div>
  )
}
