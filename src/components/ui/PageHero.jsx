import PageHeader from './PageHeader'

/**
 * Ancien bandeau de page, conservé pour les pages qui l'utilisent encore :
 * il affiche désormais l'en-tête commun (`eyebrow` n'est plus montré).
 */
export default function PageHero({ title, subtitle, actions, children }) {
  return (
    <div>
      <PageHeader actions={actions} description={subtitle} title={title} />
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
