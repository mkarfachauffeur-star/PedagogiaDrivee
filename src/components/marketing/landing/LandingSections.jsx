import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from '../../BrandLogo'
import { LEGAL_ENTITY } from '../../../config/legal'
import { trackDemoRequestClick } from '../../../lib/analytics'
import { MARKETING_FAQ } from '../../../lib/marketingContent'
import { LANDING_OFFERS } from './landingOffers'
import { offerTheme } from './landingOfferThemes'
import { BTN_PRIMARY, BTN_SECONDARY } from './landingStyles'
import { isLandingHome, landingHashPath } from './landingNav'
import { BrowserFrame, PhoneFrame, QcuPreview, StudentDashboardPreview } from './LandingVisuals'


const CONTAINER = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8'
const H2 = 'text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--lp-ink)] sm:text-[2.25rem]'
const LEAD = 'text-base leading-7 text-[var(--lp-muted)]'

function reveal(shouldReduceMotion, delay = 0) {
  if (shouldReduceMotion) return {}
  return {
    initial: { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
  }
}

function Eyebrow({ children }) {
  return <p className="text-[13px] font-semibold text-[var(--lp-accent)]">{children}</p>
}

function SectionHeader({ eyebrow, title, children, center = false }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className={`mt-3 ${H2}`}>{title}</h2>
      {children ? <p className={`mt-4 ${LEAD}`}>{children}</p> : null}
    </div>
  )
}

function Caption({ children }) {
  return <p className="mt-3 text-center text-xs text-[var(--lp-muted)]">{children}</p>
}

function CheckList({ items }) {
  return (
    <ul className="mt-6 space-y-2.5">
      {items.map((item) => (
        <li className="flex gap-3 text-[15px] leading-6 text-[var(--lp-ink)]" key={item}>
          <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#1769FF]" strokeWidth={2.5} />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function LandingHero({ shouldReduceMotion }) {
  return (
    <section className="scroll-mt-24 border-b border-[var(--lp-border)] pb-16 pt-12 sm:pt-16 lg:pb-24 lg:pt-20" id="accueil">
      <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14`}>
        <motion.div className="max-w-xl" {...reveal(shouldReduceMotion)}>
          <Eyebrow>Logiciel pour auto-écoles</Eyebrow>
          <h1 className="mt-4 text-balance text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--lp-ink)] sm:text-5xl lg:text-[3.15rem]">
            Le livret d’apprentissage numérique de votre auto-école.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--lp-muted)]">
            Compétences REMC, planning, QCU, suivi des kilomètres en conduite accompagnée et dossiers élèves. Chacun dans l’auto-école retrouve
            ce qui le concerne, au même endroit.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a className={BTN_PRIMARY} href="#demonstration" onClick={() => trackDemoRequestClick('hero')}>
              Demander une démonstration
            </a>
            <a className={BTN_SECONDARY} href="#tarifs">
              Voir les tarifs
            </a>
          </div>
          <ul className="mt-8 grid gap-2 text-sm text-[var(--lp-muted)] sm:grid-cols-2">
            {['Application web, sans installation', 'Essai gratuit de 30 jours', 'Élèves, enseignants, secrétariat, gérant', 'Accès sur invitation pendant la phase test'].map(
              (item) => (
                <li className="flex items-start gap-2" key={item}>
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#1769FF]" strokeWidth={2.5} />
                  {item}
                </li>
              ),
            )}
          </ul>
        </motion.div>

        <motion.figure className="min-w-0" {...reveal(shouldReduceMotion, 0.08)}>
          <BrowserFrame label="pedagogia-drive.fr/student/dashboard">
            <StudentDashboardPreview />
          </BrowserFrame>
          <figcaption>
            <Caption>Espace élève. Aperçu de l’interface, données fictives.</Caption>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  )
}

function FeatureRow({ eyebrow, title, text, items, visual, caption, reverse = false, shouldReduceMotion }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <motion.div className={reverse ? 'lg:order-2' : ''} {...reveal(shouldReduceMotion)}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[var(--lp-ink)] sm:text-[1.75rem]">{title}</h3>
        <p className={`mt-4 ${LEAD}`}>{text}</p>
        <CheckList items={items} />
      </motion.div>
      <motion.figure className={`min-w-0 ${reverse ? 'lg:order-1' : ''}`} {...reveal(shouldReduceMotion, 0.06)}>
        {visual}
        <figcaption>
          <Caption>{caption}</Caption>
        </figcaption>
      </motion.figure>
    </div>
  )
}

/** Fonctionnalité présentée par le texte seul, sans aperçu d'écran. */
function FeatureText({ eyebrow, title, text, items, shouldReduceMotion, delay = 0 }) {
  return (
    <motion.article className="rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)] p-6 sm:p-8" {...reveal(shouldReduceMotion, delay)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[var(--lp-ink)] sm:text-2xl">{title}</h3>
      <p className={`mt-3 ${LEAD}`}>{text}</p>
      <CheckList items={items} />
    </motion.article>
  )
}

const MORE_FEATURES = [
  { title: 'Planning des leçons', text: 'Planning global, planning de chaque enseignant et de chaque élève.' },
  { title: 'Évaluation de départ', text: 'Réalisée avant les premières leçons, conservée dans le dossier.' },
  { title: 'Messagerie interne', text: 'Échanges entre élèves, enseignants et secrétariat.' },
  { title: 'Documents et contrats', text: 'Contrat de formation, charte d’engagement et pièces du dossier.' },
  { title: 'Paiements', text: 'Formules, encaissements et reste à payer par élève.' },
  { title: 'Pré-inscriptions', text: 'Suivi des demandes reçues avant l’inscription.' },
  { title: 'Véhicules et simulateur', text: 'Suivi de la flotte et des séances sur simulateur.' },
  { title: 'Examens et exports', text: 'Résultats du permis et exports réglementaires.' },
]

export function LandingFeatures({ shouldReduceMotion }) {
  return (
    <section className="scroll-mt-20 py-20 lg:py-28" id="fonctionnalites">
      <div className={CONTAINER}>
        <SectionHeader eyebrow="Fonctionnalités" title="Le suivi pédagogique, de la première leçon à l’examen.">
          Pedagogia Drive remplace le livret papier et réunit les outils dont l’auto-école se sert chaque jour.
        </SectionHeader>

        <div className="mt-16">
          <FeatureRow
            caption="QCU sur les voyants du tableau de bord, contenu réel de la compétence 1."
            eyebrow="QCU"
            items={['Correction immédiate après chaque réponse', 'Seuil de réussite fixé à 80 %', 'Accessible sur téléphone, tablette et ordinateur']}
            reverse
            shouldReduceMotion={shouldReduceMotion}
            text="Entre deux leçons, l’élève révise les organes du véhicule ou les voyants du tableau de bord. Il arrive en voiture avec les bases déjà acquises."
            title="Des révisions entre les leçons de conduite"
            visual={
              <PhoneFrame>
                <QcuPreview />
              </PhoneFrame>
            }
          />
        </div>

        <div className="mt-20 grid gap-6 lg:mt-24 lg:grid-cols-2">
          <FeatureText
            eyebrow="Livret REMC"
            items={[
              'Statut de chaque objectif : non abordé, en cours, validé',
              'Commentaires de l’enseignant après chaque leçon',
              'Historique des leçons consultable par l’élève',
            ]}
            shouldReduceMotion={shouldReduceMotion}
            text="Le livret reprend les objectifs du référentiel REMC. La compétence 1 est disponible aujourd’hui ; le contenu des compétences 2 à 4 est en cours de rédaction."
            title="Un livret d’apprentissage à jour après chaque leçon"
          />
          <FeatureText
            delay={0.06}
            eyebrow="Conduite accompagnée (AAC)"
            items={[
              'Durée et distance de chaque trajet',
              'Cumul du temps de conduite et des kilomètres',
              'Progression vers les 3 000 km obligatoires',
            ]}
            shouldReduceMotion={shouldReduceMotion}
            text="Chaque trajet de conduite accompagnée est enregistré avec sa durée et sa distance. Pedagogia Drive additionne le temps et les kilomètres pour suivre l’objectif des 3 000 km obligatoires."
            title="Le compteur des 3 000 km de l’AAC"
          />
        </div>

        <div className="mt-24 border-t border-[var(--lp-border)] pt-12">
          <h3 className="text-lg font-semibold text-[var(--lp-ink)]">Également inclus</h3>
          <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {MORE_FEATURES.map((item) => (
              <div key={item.title}>
                <dt className="text-[15px] font-semibold text-[var(--lp-ink)]">{item.title}</dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--lp-muted)]">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}

const ROLES = [
  {
    role: 'Gérant',
    items: ['Tableau de bord et évolution du chiffre d’affaires', 'Comptes enseignants et secrétariat', 'Formules, contrats et exports réglementaires'],
  },
  {
    role: 'Secrétariat',
    items: ['Inscriptions et pré-inscriptions', 'Planning global et véhicules', 'Paiements, documents et examens'],
  },
  {
    role: 'Enseignant',
    items: ['Planning de ses leçons', 'Livret et progression de ses élèves', 'Messagerie avec les élèves'],
  },
  {
    role: 'Élève',
    items: ['Livret REMC et historique des leçons', 'QCU de révision', 'Planning, documents et messagerie'],
  },
]

export function LandingRoles({ shouldReduceMotion }) {
  return (
    <section className="scroll-mt-20 border-y border-[var(--lp-border)] bg-[var(--lp-section)] py-20 lg:py-28" id="pour-qui">
      <div className={CONTAINER}>
        <SectionHeader eyebrow="Pour toute l’auto-école" title="Un espace adapté à chaque rôle.">
          Chaque utilisateur se connecte avec son propre compte et ne voit que ce qui relève de son rôle.
        </SectionHeader>

        <motion.div
          className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[var(--lp-border)] sm:grid-cols-2 lg:grid-cols-4"
          {...reveal(shouldReduceMotion)}
        >
          {ROLES.map((item) => (
            <div className="bg-[var(--lp-card)] p-6" key={item.role}>
              <h3 className="text-base font-semibold text-[var(--lp-ink)]">{item.role}</h3>
              <ul className="mt-3 space-y-2">
                {item.items.map((line) => (
                  <li className="text-sm leading-6 text-[var(--lp-muted)]" key={line}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

const COMPARISON = [
  {
    topic: 'Suivi des compétences',
    paper: 'Cases cochées à la main, souvent après coup.',
    digital: 'Statut de chaque objectif REMC mis à jour par l’enseignant après la leçon.',
  },
  {
    topic: 'Accès au livret',
    paper: 'Un seul exemplaire, dans la voiture ou au bureau.',
    digital: 'Consultable par l’élève et par l’équipe pédagogique.',
  },
  {
    topic: 'Révisions',
    paper: 'Fiches à part, sans retour sur les erreurs.',
    digital: 'QCU avec correction immédiate entre les leçons.',
  },
  {
    topic: 'Historique',
    paper: 'Difficile à reconstituer en cas de changement d’enseignant.',
    digital: 'Leçons, commentaires et progression conservés dans le dossier.',
  },
  {
    topic: 'Administratif',
    paper: 'Planning, paiements et documents saisis séparément.',
    digital: 'Planning, contrat et paiements rattachés au même dossier élève.',
  },
]

export function LandingComparison({ shouldReduceMotion }) {
  return (
    <section className="scroll-mt-20 py-20 lg:py-28" id="benefices">
      <div className={CONTAINER}>
        <SectionHeader eyebrow="Ce qui change" title="Du livret papier au livret numérique.">
          Moins de saisie en double, un suivi lisible pour l’élève comme pour l’équipe.
        </SectionHeader>

        <motion.div className="mt-12 overflow-hidden rounded-xl border border-[var(--lp-border)]" {...reveal(shouldReduceMotion)}>
          <div className="hidden grid-cols-[0.8fr_1fr_1fr] border-b border-[var(--lp-border)] bg-[var(--lp-section)] text-sm font-semibold md:grid">
            <span className="px-6 py-4 text-[var(--lp-muted)]" />
            <span className="px-6 py-4 text-[var(--lp-muted)]">Livret papier</span>
            <span className="px-6 py-4 text-[var(--lp-ink)]">Avec Pedagogia Drive</span>
          </div>
          {COMPARISON.map((row) => (
            <div
              className="grid border-b border-[var(--lp-border)] bg-[var(--lp-card)] last:border-0 md:grid-cols-[0.8fr_1fr_1fr]"
              key={row.topic}
            >
              <p className="px-6 pt-5 text-[15px] font-semibold text-[var(--lp-ink)] md:py-5">{row.topic}</p>
              <p className="px-6 pt-2 text-sm leading-6 text-[var(--lp-muted)] md:py-5">
                <span className="mb-0.5 block text-xs font-semibold md:hidden">Livret papier</span>
                {row.paper}
              </p>
              <p className="flex gap-2.5 px-6 pb-5 pt-2 text-sm leading-6 text-[var(--lp-ink)] md:py-5">
                <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#1769FF]" strokeWidth={2.5} />
                {row.digital}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export function LandingPricing({ shouldReduceMotion, selectedOfferId = null, onSelectOffer }) {
  const chooseOffer = (offer) => {
    trackDemoRequestClick(`pricing_${offer.id}`)
    onSelectOffer?.(offer.id)
  }

  return (
    <section className="scroll-mt-20 border-y border-[var(--lp-border)] bg-[var(--lp-section)] py-20 lg:py-28" id="tarifs">
      <div className={CONTAINER}>
        <SectionHeader center eyebrow="Tarifs" title="Des offres simples, sans option cachée.">
          Toutes les fonctionnalités sont incluses dans chaque offre. Choisissez une offre, puis renseignez les
          coordonnées de l’auto-école.
        </SectionHeader>

        <div className="mx-auto mt-14 grid max-w-[1040px] items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
          {LANDING_OFFERS.map((plan, index) => {
            const selected = selectedOfferId === plan.id
            const theme = offerTheme(plan.id)
            const Icon = theme.icon
            return (
              <motion.button
                aria-pressed={selected}
                className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-[var(--lp-card)] p-6 pt-8 text-left shadow-[0_18px_40px_-30px_rgba(2,8,23,0.45)] transition hover:-translate-y-1 hover:shadow-[0_28px_50px_-30px_rgba(2,8,23,0.55)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769FF] sm:p-7 sm:pt-9 ${
                  selected ? theme.ring : `border-[var(--lp-border)] ${theme.hover}`
                } ${plan.highlighted ? 'lg:-my-3 lg:py-10' : ''}`}
                key={plan.id}
                onClick={() => chooseOffer(plan)}
                type="button"
                {...reveal(shouldReduceMotion, index * 0.05)}
              >
                <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${theme.bar}`} />
                {plan.highlighted ? (
                  <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${theme.tint}`} />
                ) : null}

                <div className="relative flex items-center justify-between gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${theme.chip}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                  </span>
                  {plan.highlighted ? (
                    <span className="rounded-full bg-[#1769FF] px-3 py-1 text-xs font-semibold text-white">Recommandée</span>
                  ) : null}
                </div>

                <h3 className={`relative mt-5 text-lg font-semibold ${theme.name}`}>{plan.name}</h3>
                <p className="relative mt-3 flex items-baseline gap-2">
                  <span className="text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-[var(--lp-ink)]">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[var(--lp-muted)]">{plan.period}</span>
                </p>
                <p className="relative mt-2 min-h-5 text-xs text-[var(--lp-muted)]">{plan.note || ''}</p>
                <ul className="relative mt-6 flex-1 space-y-2.5 border-t border-[var(--lp-border)] pt-6">
                  {plan.features.map((feature) => (
                    <li className="flex items-start gap-2.5 text-sm text-[var(--lp-ink)]" key={feature}>
                      <Check aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${theme.check}`} strokeWidth={2.5} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <span
                  className={`relative mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${theme.button}`}
                >
                  {selected ? (
                    <>
                      <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                      Offre sélectionnée
                    </>
                  ) : (
                    'Choisir cette offre'
                  )}
                </span>
              </motion.button>
            )
          })}
        </div>
        <p className="mx-auto mt-8 max-w-xl text-center text-[13px] leading-6 text-[var(--lp-muted)]">
          Pendant la phase test, l’accès se fait sur invitation. Les abonnements seront commercialisés à partir du
          premier trimestre 2027.
        </p>
      </div>
    </section>
  )
}

const REASSURANCE = [
  {
    title: 'Accompagnement à la prise en main',
    text: 'Pendant la phase test, chaque auto-école pilote est accompagnée pour le paramétrage et la mise en route.',
  },
  {
    title: '30 jours d’essai',
    text: 'L’essai donne accès à toutes les fonctionnalités et vous pouvez l’arrêter à tout moment.',
  },
  {
    title: 'Données cloisonnées',
    text: 'Chaque utilisateur ne voit que les données de son auto-école, selon son rôle.',
  },
  {
    title: 'Sans installation',
    text: 'Pedagogia Drive fonctionne dans le navigateur, sur ordinateur, tablette et téléphone.',
  },
]

export function LandingReassurance({ shouldReduceMotion }) {
  return (
    <section className="scroll-mt-20 py-20 lg:py-24" id="confiance">
      <div className={CONTAINER}>
        <SectionHeader eyebrow="Avant de vous engager" title="Démarrer sans risque." />
        <motion.dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4" {...reveal(shouldReduceMotion)}>
          {REASSURANCE.map((item) => (
            <div className="border-t-2 border-[#1769FF] pt-5" key={item.title}>
              <dt className="text-[15px] font-semibold text-[var(--lp-ink)]">{item.title}</dt>
              <dd className="mt-2 text-sm leading-6 text-[var(--lp-muted)]">{item.text}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  )
}

const HOME_FAQ = [
  MARKETING_FAQ[10],
  MARKETING_FAQ[1],
  MARKETING_FAQ[2],
  {
    question: 'Comment sont comptés les 50 élèves de la formule Starter ?',
    answer:
      'Sur l’année d’abonnement : elle commence à la fin de l’essai gratuit, quand l’abonnement payant démarre, dure 12 mois, puis le compteur repart à zéro à chaque date anniversaire. Ce sont les élèves inscrits pendant cette période qui comptent ; pendant l’essai, la limite de 50 s’applique à la période d’essai. Vous êtes prévenu par e-mail à 40 élèves ; à 50, l’inscription de nouveaux élèves est suspendue jusqu’à la fin de la période, sauf passage à la formule Premium (élèves illimités) sur simple demande.',
  },
  {
    question: 'Comment fonctionne la démonstration ?',
    answer:
      'Renseignez le profil de votre auto-école : nous vous présenterons Pedagogia Drive et les conditions d’accès à la bêta privée.',
  },
  {
    question: 'Dois-je installer un logiciel ?',
    answer:
      'Non. Pedagogia Drive fonctionne déjà entièrement dans le navigateur web, sans installation. Les applications iOS et Android, à télécharger sur smartphone et tablette, seront bientôt disponibles.',
  },
]

export function LandingFaq() {
  return (
    <section className="scroll-mt-20 border-t border-[var(--lp-border)] py-20 lg:py-28" id="faq">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
        <SectionHeader eyebrow="Questions fréquentes" title="Vos questions sur Pedagogia Drive." />
        <div className="divide-y divide-[var(--lp-border)] border-y border-[var(--lp-border)]">
          {HOME_FAQ.map((item) => (
            <details className="group py-5" key={item.question}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-base font-semibold text-[var(--lp-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-lg leading-none text-[var(--lp-muted)] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 pr-8 text-[15px] leading-7 text-[var(--lp-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FooterHashLink({ hash, className, children }) {
  const { pathname } = useLocation()
  const href = landingHashPath(hash, pathname)

  if (isLandingHome(pathname)) {
    return (
      <a className={className} href={hash}>
        {children}
      </a>
    )
  }

  return (
    <Link className={className} to={href}>
      {children}
    </Link>
  )
}

export function LandingFooter({ isDark }) {
  const linkClass = 'text-sm text-[var(--lp-muted)] transition hover:text-[var(--lp-ink)]'
  const titleClass = 'text-sm font-semibold text-[var(--lp-ink)]'

  return (
    <footer className="border-t border-[var(--lp-border)] bg-[var(--lp-section)] py-14">
      <div className={`${CONTAINER} grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div className="max-w-xs">
          <BrandLogo animated={false} idPrefix="landing-footer" lightMark={!isDark} variant={isDark ? 'marketing' : 'light'} />
          <p className="mt-4 text-sm leading-6 text-[var(--lp-muted)]">
            Livret d’apprentissage numérique et outil de gestion pour les auto-écoles.
          </p>
        </div>
        <nav aria-label="Produit">
          <p className={titleClass}>Produit</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <FooterHashLink className={linkClass} hash="#fonctionnalites">
                Fonctionnalités
              </FooterHashLink>
            </li>
            <li>
              <FooterHashLink className={linkClass} hash="#tarifs">
                Tarifs
              </FooterHashLink>
            </li>
            <li>
              <Link className={linkClass} to="/livret-numerique-auto-ecole">
                Livret numérique
              </Link>
            </li>
            <li>
              <FooterHashLink className={linkClass} hash="#faq">
                FAQ
              </FooterHashLink>
            </li>
          </ul>
        </nav>
        <nav aria-label="Accès">
          <p className={titleClass}>Accès</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link className={linkClass} to="/login">
                Se connecter
              </Link>
            </li>
            <li>
              <FooterHashLink className={linkClass} hash="#demonstration">
                Demander une démonstration
              </FooterHashLink>
            </li>
            <li>
              <Link className={linkClass} to="/contact">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Informations légales">
          <p className={titleClass}>Informations légales</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link className={linkClass} to="/mentions-legales">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/politique-confidentialite">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/cgu">
                CGU
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/cgv">
                CGV
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/cookies">
                Cookies
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className={`${CONTAINER} mt-12`}>
        <p className="border-t border-[var(--lp-border)] pt-6 text-xs text-[var(--lp-muted)]">
          © {new Date().getFullYear()} {LEGAL_ENTITY.tradeName}
        </p>
      </div>
    </footer>
  )
}
