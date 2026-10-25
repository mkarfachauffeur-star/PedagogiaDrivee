import { motion, useScroll, useTransform } from 'framer-motion'
import { BookOpen, Check, FileText, GraduationCap, Map, MessageSquare, Play, Route, Users } from 'lucide-react'
import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from '../../BrandLogo'
import { LEGAL_ENTITY } from '../../../config/legal'
import { trackDemoRequestClick } from '../../../lib/analytics'
import { MARKETING_FAQ } from '../../../lib/marketingContent'
import { LANDING_SCHEMAS, LANDING_VIDEO_PREVIEW } from './landingAssets'
import { isLandingHome, landingHashPath } from './landingNav'
import {
  DeviceStage,
  GpsScreen,
  HeroAppScreen,
  ProductFrame,
  QcuVoyantScreen,
} from './LandingVisuals'

function reveal(shouldReduceMotion, delay = 0) {
  return {
    initial: shouldReduceMotion ? undefined : { opacity: 0, y: 24 },
    whileInView: shouldReduceMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.18 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  }
}

export function LandingHero({ shouldReduceMotion }) {
  const mockupRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: mockupRef, offset: ['start end', 'end start'] })
  const mockupY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [16, -12])

  return (
    <section className="relative scroll-mt-24 overflow-hidden px-4 pb-8 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pb-6 lg:pt-14" id="accueil">
      <div className="landing-glow-hero pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
        <motion.div className="max-w-xl" {...reveal(shouldReduceMotion)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1769FF]">
            Le livret numérique des auto-écoles
          </p>
          <h1 className="mt-5 text-[2.4rem] font-semibold leading-[1.06] tracking-[-0.05em] text-[var(--lp-ink)] sm:text-5xl lg:text-[4.4rem] lg:leading-[1.02]">
            Le futur du livret numérique pour auto-école{' '}
            <span className="landing-accent-text">commence ici.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[var(--lp-muted)] sm:text-lg sm:leading-8">
            Simplifiez le suivi pédagogique, accompagnez vos élèves et gérez votre auto-école avec un outil
            moderne conçu pour les professionnels de la conduite.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              className="inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-[#EF3340] px-7 text-sm font-semibold text-white shadow-[0_16px_32px_-14px_rgba(239,51,64,0.75)] transition hover:-translate-y-0.5 hover:bg-[#d92b38] sm:w-auto"
              href="#demonstration"
              onClick={() => trackDemoRequestClick('hero')}
            >
              Demander une démonstration
            </a>
            <Link
              className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-[var(--lp-border)] bg-[var(--lp-card)] px-6 text-sm font-semibold text-[var(--lp-ink)] transition hover:border-[#1769FF]/35 sm:w-auto"
              to="/livret-numerique-auto-ecole"
            >
              Découvrir le livret numérique
            </Link>
          </div>
          <p className="mt-4 text-sm text-[var(--lp-muted)]">
            <a className="font-semibold text-[#1769FF] underline-offset-4 transition hover:underline" href="#fonctionnalites">
              Voir toutes les fonctionnalités →
            </a>
          </p>
          <p className="mt-5 text-sm text-[var(--lp-muted)]">Élèves • Enseignants • Secrétariat • Gérants</p>
        </motion.div>

        <motion.div className="relative min-w-0 lg:max-w-none" {...reveal(shouldReduceMotion, 0.08)}>
          <motion.div ref={mockupRef} style={{ y: mockupY }}>
            <DeviceStage size="large" variant="laptop">
              <HeroAppScreen />
            </DeviceStage>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export function LandingTrustStrip({ shouldReduceMotion }) {
  const items = [
    { title: 'QCU & compétences', text: 'Préparez vos élèves entre deux leçons.', icon: BookOpen },
    { title: 'Ressources pédagogiques', text: 'Schémas, fiches et contenus accessibles à tout moment.', icon: FileText },
    { title: 'AAC / CS', text: 'Suivez les parcours, trajets et kilomètres.', icon: Map },
    { title: 'Suivi des élèves', text: 'Une vision claire de la progression.', icon: Users },
  ]

  return (
    <section className="scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8 lg:py-12" id="fonctionnalites">
      <motion.div className="mx-auto grid max-w-[1280px] gap-4 sm:grid-cols-2 lg:grid-cols-4" {...reveal(shouldReduceMotion)}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <article
              className="rounded-[20px] border border-[var(--lp-border)] bg-[var(--lp-card)] p-5 shadow-[0_12px_32px_-28px_rgba(7,17,31,0.45)]"
              key={item.title}
            >
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#1769FF]/10 text-[#1769FF]">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-[var(--lp-ink)]">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-[var(--lp-muted)]">{item.text}</p>
            </article>
          )
        })}
      </motion.div>
    </section>
  )
}

export function LandingQcuSection({ shouldReduceMotion }) {
  return (
    <section className="scroll-mt-24 overflow-x-clip bg-[var(--lp-bg-alt)] px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="qcu">
      <div className="mx-auto grid max-w-[1280px] items-center gap-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-10">
        <motion.div {...reveal(shouldReduceMotion)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1769FF]">QCU & compétences</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[var(--lp-ink)] sm:text-5xl lg:leading-[1.08]">
            Vos élèves peuvent apprendre
            <span className="block">même en dehors de la voiture.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-[var(--lp-muted)]">
            Les QCU permettent de préparer la prochaine séance et de renforcer les connaissances entre deux leçons.
          </p>
          <ul className="mt-8 space-y-3 text-sm font-medium text-[var(--lp-ink)]">
            {['Exercices entre les leçons', 'Progression visible', 'Moins de répétitions en conduite', 'Élève mieux préparé'].map(
              (item) => (
                <li className="flex items-center gap-3" key={item}>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#1769FF]/10 text-[#1769FF]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ),
            )}
          </ul>
        </motion.div>
        <motion.div className="min-w-0 max-w-full" {...reveal(shouldReduceMotion, 0.08)}>
          <DeviceStage size="large" variant="tablet">
            <QcuVoyantScreen chrome={false} />
          </DeviceStage>
        </motion.div>
      </div>
    </section>
  )
}

export function LandingVideosSection({ shouldReduceMotion }) {
  return (
    <section className="scroll-mt-24 overflow-x-clip px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="videos">
      <div className="mx-auto max-w-[1280px]" id="livret-numerique">
        <motion.div className="max-w-3xl" {...reveal(shouldReduceMotion)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#EF3340]">Ressources pédagogiques</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[var(--lp-ink)] sm:text-5xl lg:leading-[1.08]">
            Des ressources pédagogiques
            <span className="block">accessibles au bon moment.</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--lp-muted)]">
            Les élèves retrouvent QCU, schémas et fiches pour continuer à travailler entre deux leçons.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <motion.article
            className="overflow-hidden rounded-[22px] border border-[var(--lp-border)] bg-[var(--lp-card)]"
            {...reveal(shouldReduceMotion, 0.04)}
          >
            <div className="h-64 overflow-hidden sm:h-72">
              <QcuVoyantScreen chrome={false} compact />
            </div>
            <div className="border-t border-[var(--lp-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--lp-ink)]">QCU interactifs</p>
              <p className="mt-1 text-sm text-[var(--lp-muted)]">Réviser entre deux leçons</p>
            </div>
          </motion.article>

          <motion.article
            className="overflow-hidden rounded-[22px] border border-[var(--lp-border)] bg-[var(--lp-card)]"
            {...reveal(shouldReduceMotion, 0.08)}
          >
            <div className="relative h-64 overflow-hidden sm:h-72">
              <img
                alt={LANDING_VIDEO_PREVIEW.alt}
                className="h-full w-full object-cover object-center"
                decoding="async"
                loading="lazy"
                src={LANDING_VIDEO_PREVIEW.src}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/40 backdrop-blur-sm">
                  <Play className="h-5 w-5 fill-current" />
                </span>
              </div>
            </div>
            <div className="border-t border-[var(--lp-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--lp-ink)]">Vidéos pédagogiques</p>
              <p className="mt-1 text-sm text-[var(--lp-muted)]">Bientôt disponibles</p>
            </div>
          </motion.article>

          <motion.article
            className="overflow-hidden rounded-[22px] border border-[var(--lp-border)] bg-[var(--lp-card)]"
            {...reveal(shouldReduceMotion, 0.12)}
          >
            <div className="flex h-64 items-center justify-center overflow-hidden bg-white p-3 sm:h-72">
              <img
                alt={LANDING_SCHEMAS[0].alt}
                className="h-full w-full object-contain"
                decoding="async"
                loading="lazy"
                src={LANDING_SCHEMAS[0].src}
              />
            </div>
            <div className="border-t border-[var(--lp-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--lp-ink)]">Schémas et ressources</p>
              <p className="mt-1 text-sm text-[var(--lp-muted)]">Fiches pédagogiques du livret</p>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  )
}

export function LandingGpsSection({ shouldReduceMotion }) {
  return (
    <section className="relative scroll-mt-24 overflow-x-clip bg-[var(--lp-bg-alt)] px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="gps">
      <div className="landing-glow-gps pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <motion.div className="order-2 min-w-0 max-w-full lg:order-1" {...reveal(shouldReduceMotion)}>
          <ProductFrame glow="violet">
            <GpsScreen />
          </ProductFrame>
        </motion.div>
        <motion.div className="order-1 lg:order-2" {...reveal(shouldReduceMotion, 0.08)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7C3AED]">AAC / CS</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[var(--lp-ink)] sm:text-5xl lg:leading-[1.08]">
            Gardez une vision claire
            <span className="block">des parcours de vos élèves.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-[var(--lp-muted)]">
            Visualisez les trajets, les kilomètres parcourus et la durée des parcours directement depuis Pedagogia Drive.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {['Trajets', 'Kilomètres', 'Durée'].map((item) => (
              <div className="rounded-[16px] border border-[var(--lp-border)] bg-[var(--lp-card)] px-3 py-4 text-center" key={item}>
                <p className="text-sm font-semibold text-[var(--lp-ink)]">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export function LandingAllInOneSection({ shouldReduceMotion }) {
  const items = [
    { title: 'Livret pédagogique', icon: BookOpen },
    { title: 'QCU', icon: Check },
    { title: 'Vidéos pédagogiques', icon: Play, soon: true },
    { title: 'Schémas pédagogiques', icon: FileText },
    { title: 'Suivi GPS AAC / CS', icon: Route },
    { title: 'Suivi de progression', icon: GraduationCap },
    { title: 'Messagerie', icon: MessageSquare },
    { title: 'Gestion / suivi des élèves', icon: Users },
  ]

  return (
    <section className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="tout-au-meme-endroit">
      <div className="mx-auto max-w-[1280px]">
        <motion.div className="max-w-2xl" {...reveal(shouldReduceMotion)}>
          <h2 className="text-3xl font-semibold tracking-[-0.045em] text-[var(--lp-ink)] sm:text-5xl">
            Tout au même endroit.
          </h2>
        </motion.div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.article
                className="rounded-[18px] border border-[var(--lp-border)] bg-[var(--lp-card)] px-4 py-5"
                key={item.title}
                {...reveal(shouldReduceMotion, index * 0.03)}
              >
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#1769FF]/10 text-[#1769FF]">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-semibold leading-5 text-[var(--lp-ink)]">{item.title}</p>
                {item.soon ? (
                  <p className="mt-1 text-[11px] font-medium text-[var(--lp-muted)]">Bientôt disponibles</p>
                ) : null}
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function LandingRolesSection({ shouldReduceMotion }) {
  const roles = [
    { role: 'Élève', text: 'Je sais ce que je dois travailler.' },
    { role: 'Enseignant', text: 'Je retrouve la progression de mes élèves.' },
    { role: 'Secrétariat', text: 'Je centralise le suivi plus facilement.' },
    { role: 'Gérant', text: 'Je garde une vision globale de mon auto-école.' },
  ]

  return (
    <section className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="comment-ca-marche">
      <div className="mx-auto max-w-[1280px]">
        <motion.h2
          className="max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-[var(--lp-ink)] sm:text-5xl"
          {...reveal(shouldReduceMotion)}
        >
          Pensé pour toute l’auto-école.
        </motion.h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((item, index) => (
            <motion.article
              className="rounded-[22px] border border-[var(--lp-border)] bg-[var(--lp-card)] p-6 transition hover:-translate-y-1 hover:border-[#1769FF]/35 hover:shadow-[0_20px_40px_-28px_rgba(23,105,255,0.45)]"
              key={item.role}
              {...reveal(shouldReduceMotion, index * 0.06)}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1769FF]">{item.role}</p>
              <p className="mt-4 text-lg font-semibold leading-7 text-[var(--lp-ink)]">{item.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingBenefitsSection({ shouldReduceMotion }) {
  const items = [
    { title: 'Apprendre', text: 'Les élèves continuent leur apprentissage entre les leçons.' },
    { title: 'Enseigner', text: 'L’enseignant arrive en leçon avec un élève mieux préparé.' },
    { title: 'Piloter', text: 'L’auto-école dispose d’un suivi centralisé et lisible.' },
  ]

  return (
    <section className="scroll-mt-24 bg-[var(--lp-bg-alt)] px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="pourquoi">
      <div className="mx-auto max-w-[1280px]">
        <motion.div className="max-w-3xl" {...reveal(shouldReduceMotion)}>
          <h2 className="text-3xl font-semibold tracking-[-0.045em] text-[var(--lp-ink)] sm:text-5xl lg:leading-[1.08]">
            Transformez le suivi pédagogique de votre auto-école.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--lp-muted)] sm:text-lg">
            Un livret numérique pensé pour les élèves, les enseignants, le secrétariat et les gérants.
          </p>
          <a
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-[#EF3340] px-7 text-sm font-semibold text-white shadow-[0_16px_32px_-14px_rgba(239,51,64,0.75)] transition hover:-translate-y-0.5 hover:bg-[#d92b38] sm:w-auto"
            href="#demonstration"
            onClick={() => trackDemoRequestClick('benefits')}
          >
            Demander une démonstration
          </a>
        </motion.div>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {items.map((item, index) => (
            <motion.div key={item.title} {...reveal(shouldReduceMotion, 0.06 + index * 0.06)}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1769FF]">{item.title}</p>
              <p className="mt-4 text-lg leading-8 text-[var(--lp-ink)]">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingFinalCta({ shouldReduceMotion }) {
  return (
    <section className="relative overflow-hidden bg-[#07111F] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="landing-glow-cta pointer-events-none absolute inset-0" />
      <motion.div className="relative mx-auto max-w-3xl text-center" {...reveal(shouldReduceMotion)}>
        <h2 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:leading-[1.1]">
          Et si vos élèves progressaient
          <span className="mt-1 block">aussi entre les leçons ?</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/65">
          Découvrez une nouvelle façon de gérer le suivi pédagogique de votre auto-école.
        </p>
        <a
          className="mt-8 inline-flex w-full items-center justify-center rounded-[12px] bg-[#EF3340] px-10 py-4 text-base font-semibold text-white shadow-[0_16px_32px_-14px_rgba(239,51,64,0.55)] transition hover:-translate-y-0.5 hover:bg-[#d92b38] sm:w-auto"
          href="#demonstration"
          onClick={() => trackDemoRequestClick('final_cta')}
        >
          Demander une démonstration
        </a>
      </motion.div>
    </section>
  )
}

const HOME_FAQ = [
  MARKETING_FAQ[10],
  MARKETING_FAQ[1],
  MARKETING_FAQ[2],
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
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="faq">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1769FF]">Questions fréquentes</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--lp-ink)] sm:text-4xl">FAQ</h2>
      </div>
      <div className="mt-10 space-y-3">
        {HOME_FAQ.map((item) => (
          <details className="group rounded-[18px] border border-[var(--lp-border)] bg-[var(--lp-card)] p-5" key={item.question}>
            <summary className="cursor-pointer list-none text-base font-semibold text-[var(--lp-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-4">
                {item.question}
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-[#1769FF] transition group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-4 text-sm leading-7 text-[var(--lp-muted)]">{item.answer}</p>
          </details>
        ))}
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

  return (
    <footer className="border-t border-[var(--lp-border)] bg-[var(--lp-card)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <BrandLogo animated={false} idPrefix="landing-footer" variant={isDark ? 'marketing' : 'light'} />
        <nav aria-label="Navigation footer" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-7">
          <FooterHashLink className={linkClass} hash="#fonctionnalites">
            Fonctionnalités
          </FooterHashLink>
          <FooterHashLink className={linkClass} hash="#faq">
            FAQ
          </FooterHashLink>
          <FooterHashLink className={linkClass} hash="#demonstration">
            Demander une démonstration
          </FooterHashLink>
          <Link className={linkClass} to="/login">
            Se connecter
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1280px] flex-col gap-3 border-t border-[var(--lp-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Informations légales" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className={linkClass} to="/mentions-legales">
            Mentions légales
          </Link>
          <Link className={linkClass} to="/politique-confidentialite">
            Politique de confidentialité
          </Link>
        </nav>
        <p className="text-xs text-[var(--lp-muted)]">
          © {new Date().getFullYear()} {LEGAL_ENTITY.tradeName}
        </p>
      </div>
    </footer>
  )
}
