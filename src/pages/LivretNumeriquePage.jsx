import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import PublicPageLayout from '../layouts/PublicPageLayout'
import PageSeo from '../components/seo/PageSeo'
import { LIVRET_SEO_FAQ, LIVRET_SEO_SECTIONS } from '../lib/marketingContent'
import {
  SEO_PAGES,
  buildLivretNumeriqueJsonLd,
} from '../lib/seo'

export default function LivretNumeriquePage() {
  const page = SEO_PAGES.livretNumerique
  const jsonLd = useMemo(() => buildLivretNumeriqueJsonLd(), [])

  return (
    <>
      <PageSeo {...page} jsonLd={jsonLd} />
      <PublicPageLayout title="Le livret numérique pensé pour les auto-écoles">
        <p className="text-base font-semibold text-slate-700">
          Pedagogia Drive remplace le livret papier : suivi des compétences REMC, QCM et espace
          élève en ligne, dans un outil pensé pour les auto-écoles.
        </p>

        {LIVRET_SEO_SECTIONS.map((section) => (
          <section key={section.id} aria-labelledby={`livret-${section.id}`}>
            <h2 className="text-xl font-extrabold text-slate-950" id={`livret-${section.id}`}>
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul className="list-disc space-y-2 pl-5">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section aria-labelledby="livret-ressources">
          <h2 className="text-xl font-extrabold text-slate-950" id="livret-ressources">
            Aller plus loin
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/blog/pourquoi-livret-numerique-auto-ecole">
                Pourquoi choisir un livret numérique en auto-école ?
              </Link>
            </li>
            <li>
              <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/blog/livret-papier-ou-livret-numerique">
                Livret papier ou livret numérique : comparatif
              </Link>
            </li>
            <li>
              <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/blog/appliquer-remc-efficacement">
                Appliquer le REMC avec un livret numérique
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="livret-faq" className="mt-8 space-y-4">
          <h2 className="text-xl font-extrabold text-slate-950" id="livret-faq">
            Questions fréquentes sur le livret numérique
          </h2>
          {LIVRET_SEO_FAQ.map((item) => (
            <details
              key={item.question}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <summary className="cursor-pointer font-bold text-slate-900">{item.question}</summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </section>

        <p>
          <Link
            className="inline-flex rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
            to="/#demonstration"
          >
            Demander une démonstration gratuite
          </Link>
        </p>
      </PublicPageLayout>
    </>
  )
}
