export default function LegalSection({ id, title, children, level = 2 }) {
  const Heading = level === 3 ? 'h3' : 'h2'
  const headingClass =
    level === 3
      ? 'text-sm font-semibold text-slate-900'
      : 'text-base font-semibold text-slate-900'

  return (
    <section aria-labelledby={id} className="space-y-3">
      <Heading className={headingClass} id={id}>
        {title}
      </Heading>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
