import { LIVRET_SEO_FAQ, MARKETING_FAQ } from './marketingContent'

export const SITE_URL = 'https://www.pedagogia-drive.fr'
export const SITE_NAME = 'Pedagogia Drive'
export const SITE_LOCALE = 'fr_FR'
export const SITE_LANGUAGE = 'fr'
/** Logo carré utilisé par Google (JSON-LD Organization, favicons PWA). */
export const SITE_LOGO_SQUARE = `${SITE_URL}/android-chrome-512x512.png`
/** Image Open Graph / Twitter (1200×630). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630
export const DEFAULT_OG_IMAGE_ALT =
  'Pedagogia Drive — livret numérique auto-école et livret pédagogique numérique REMC'
export const CONTACT_EMAIL = 'contact@pedagogia-drive.fr'

/** Requêtes cibles + variantes sans accent et expressions proches. */
export const SEO_TARGET_KEYWORDS = [
  'livret numérique auto-école',
  'livret pédagogique d\'apprentissage auto-école',
  'livret pedagogique numerique auto ecole',
  'livret pédagogique numérique auto-école',
]

export const SEO_KEYWORDS = [
  ...SEO_TARGET_KEYWORDS,
  'logiciel auto école',
  'SaaS auto école',
  'livret numérique REMC',
  'suivi pédagogique auto-école',
  'QCM auto-école',
  'gestion élèves auto-école',
  'messagerie auto école',
  'planning auto école',
].join(', ')

export const SEO_DEFAULT_TITLE =
  'Livret numérique auto-école | Pedagogia Drive — REMC & QCM'
export const SEO_DEFAULT_DESCRIPTION =
  'Livret numérique auto-école et livret pédagogique d\'apprentissage conforme REMC : QCM, suivi des élèves, messagerie et gestion d\'équipe. Essai gratuit 30 jours.'

export const SEO_PAGES = {
  home: {
    path: '/',
    title: 'Livret numérique auto-école nouvelle génération | Pedagogia Drive',
    description:
      'Découvrez Pedagogia Drive, le livret numérique nouvelle génération pour les auto-écoles : suivi pédagogique REMC, QCM, messagerie et gestion d\'équipe réunis dans un seul outil. Demandez votre démo !',
    ogType: 'website',
    imageAlt: 'Livret numérique auto-école Pedagogia Drive — suivi pédagogique REMC',
    keywords: SEO_KEYWORDS,
  },
  login: {
    path: '/login',
    title: 'Connexion | Pedagogia Drive — Livret numérique auto-école',
    description:
      'Connectez-vous à Pedagogia Drive, votre livret numérique auto-école et livret pédagogique d\'apprentissage : QCM REMC, suivi pédagogique et messagerie.',
    ogType: 'website',
  },
  contact: {
    path: '/contact',
    title: 'Contact | Pedagogia Drive — Logiciel auto-école & démonstration',
    description:
      'Contactez Pedagogia Drive pour une démonstration du livret numérique auto-école : QCM REMC, suivi pédagogique, messagerie et gestion des équipes pédagogiques.',
    ogType: 'website',
  },
  mentionsLegales: {
    path: '/mentions-legales',
    title: 'Mentions légales | Pedagogia Drive',
    description:
      'Mentions légales de Pedagogia Drive : éditeur, hébergeur, propriété intellectuelle, responsabilité et contact.',
    ogType: 'website',
  },
  politiqueConfidentialite: {
    path: '/politique-confidentialite',
    title: 'Politique de confidentialité | Pedagogia Drive — RGPD',
    description:
      'Politique de confidentialité Pedagogia Drive : données collectées, finalités, durée de conservation, droits RGPD et contact DPO.',
    ogType: 'website',
  },
  confidentialite: {
    path: '/politique-confidentialite',
    title: 'Politique de confidentialité | Pedagogia Drive — RGPD',
    description:
      'Politique de confidentialité Pedagogia Drive : protection des données des auto-écoles, élèves, enseignants et secrétariat. Conforme au RGPD.',
    ogType: 'website',
  },
  cgu: {
    path: '/cgu',
    title: 'CGU | Pedagogia Drive — Conditions générales d\'utilisation',
    description:
      'Conditions générales d\'utilisation de Pedagogia Drive : accès, comptes, responsabilités, propriété intellectuelle et résiliation.',
    ogType: 'website',
  },
  cgv: {
    path: '/cgv',
    title: 'CGV | Pedagogia Drive — Conditions générales de vente',
    description:
      'Conditions générales de vente Pedagogia Drive : abonnements, essai gratuit, Starter, Premium, paiement et résiliation.',
    ogType: 'website',
  },
  cookies: {
    path: '/cookies',
    title: 'Politique de cookies | Pedagogia Drive',
    description:
      'Politique de cookies Pedagogia Drive : cookies techniques, mesure d\'audience, durée de conservation et gestion des préférences.',
    ogType: 'website',
  },
  blog: {
    path: '/blog',
    title: 'Conseils auto-école et livret numérique | Blog Pedagogia Drive',
    description:
      'Conseils pratiques pour gérants et enseignants d\'auto-école : livret numérique REMC, réussite des élèves, organisation et digitalisation. Des articles concrets, par Pedagogia Drive.',
    ogType: 'website',
  },
  livretNumerique: {
    path: '/livret-numerique-auto-ecole',
    title: 'Le livret numérique des auto-écoles | Pedagogia Drive',
    description:
      'Suivi REMC, QCM, espace élève et moniteur, planning et messagerie : le livret numérique qui remplace le livret papier dans votre auto-école. Demandez une démonstration.',
    ogType: 'website',
    keywords: SEO_KEYWORDS,
  },
}

export function canonicalUrl(path = '/') {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
}

function breadcrumbListNode(trail) {
  if (!trail?.length) return null
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  }
}

export function buildBreadcrumbJsonLd(trail) {
  const node = breadcrumbListNode(trail)
  if (!node) return null
  return {
    '@context': 'https://schema.org',
    ...node,
  }
}

export function buildFaqJsonLd(faqItems = MARKETING_FAQ) {
  return {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: faqItems.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  }
}

export function buildHomeJsonLd(faqItems = MARKETING_FAQ) {
  const organizationId = `${SITE_URL}/#organization`
  const websiteId = `${SITE_URL}/#website`
  const softwareId = `${SITE_URL}/#software`
  const { title, description } = SEO_PAGES.home

  const graph = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: SITE_LOGO_SQUARE,
        width: 512,
        height: 512,
      },
      email: CONTACT_EMAIL,
      areaServed: {
        '@type': 'Country',
        name: 'France',
      },
      description:
        'Pedagogia Drive édite un livret numérique auto-école et un livret pédagogique d\'apprentissage conforme REMC pour les auto-écoles.',
      alternateName: [
        'Livret pédagogique numérique auto-école',
        'Livret pédagogique d\'apprentissage auto-école',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: 'fr-FR',
      publisher: { '@id': organizationId },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: canonicalUrl('/'),
      name: title,
      description,
      isPartOf: { '@id': websiteId },
      about: { '@id': organizationId },
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': softwareId,
      name: `${SITE_NAME} — Livret numérique auto-école`,
      alternateName: SEO_TARGET_KEYWORDS,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      inLanguage: 'fr-FR',
      description,
      keywords: SEO_TARGET_KEYWORDS.join(', '),
      featureList: [
        'Livret pédagogique numérique conforme REMC',
        'QCM et QCU intégrés',
        'Suivi des compétences et sous-compétences',
        'Espace élève et moniteur',
        'Messagerie interne auto-école',
      ],
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        description: 'Sur devis',
      },
      provider: { '@id': organizationId },
      areaServed: {
        '@type': 'Country',
        name: 'France',
      },
    },
    buildFaqJsonLd(faqItems),
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function buildPageJsonLd({ path, title, description, breadcrumbTrail }) {
  const websiteId = `${SITE_URL}/#website`
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${canonicalUrl(path)}#webpage`,
      url: canonicalUrl(path),
      name: title,
      description,
      isPartOf: { '@id': websiteId },
      inLanguage: 'fr-FR',
    },
  ]

  const breadcrumbs = breadcrumbListNode(breadcrumbTrail)
  if (breadcrumbs) graph.push(breadcrumbs)

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function breadcrumbsForPage(pageKey) {
  const home = { name: 'Accueil', path: '/' }
  const labels = {
    login: { name: 'Connexion', path: '/login' },
    contact: { name: 'Contact', path: '/contact' },
    mentionsLegales: { name: 'Mentions légales', path: '/mentions-legales' },
    politiqueConfidentialite: { name: 'Politique de confidentialité', path: '/politique-confidentialite' },
    confidentialite: { name: 'Politique de confidentialité', path: '/politique-confidentialite' },
    cgu: { name: 'CGU', path: '/cgu' },
    cgv: { name: 'CGV', path: '/cgv' },
    cookies: { name: 'Politique de cookies', path: '/cookies' },
    blog: { name: 'Blog', path: '/blog' },
    livretNumerique: { name: 'Livret numérique auto-école', path: '/livret-numerique-auto-ecole' },
  }

  const current = labels[pageKey]
  if (!current) return [home]
  return [home, current]
}

export function breadcrumbsForBlogArticle(article) {
  return [
    { name: 'Accueil', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: article.title, path: `/blog/${article.slug}` },
  ]
}

export function buildLivretNumeriqueJsonLd(faqItems = LIVRET_SEO_FAQ) {
  const page = SEO_PAGES.livretNumerique
  const breadcrumbs = breadcrumbListNode(breadcrumbsForPage('livretNumerique'))
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${canonicalUrl(page.path)}#webpage`,
      url: canonicalUrl(page.path),
      name: page.title,
      description: page.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      inLanguage: 'fr-FR',
      about: {
        '@type': 'SoftwareApplication',
        name: 'Pedagogia Drive — Livret numérique auto-école',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        keywords: SEO_TARGET_KEYWORDS.join(', '),
      },
    },
    ...(breadcrumbs ? [breadcrumbs] : []),
    ...(faqItems.length ? [buildFaqJsonLd(faqItems)] : []),
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function buildBlogListJsonLd() {
  const page = SEO_PAGES.blog
  return buildPageJsonLd({
    path: page.path,
    title: page.title,
    description: page.description,
    breadcrumbTrail: breadcrumbsForPage('blog'),
  })
}

export function buildBlogArticleJsonLd(article) {
  const path = `/blog/${article.slug}`
  const url = canonicalUrl(path)
  const imageUrl = article.coverImage.startsWith('http')
    ? article.coverImage
    : `${SITE_URL}${article.coverImage}`

  const graph = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: article.title,
      description: article.metaDescription,
      image: imageUrl,
      datePublished: article.publishedAt,
      dateModified: article.publishedAt,
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: {
          '@type': 'ImageObject',
          url: SITE_LOGO_SQUARE,
          width: 512,
          height: 512,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
      },
      inLanguage: 'fr-FR',
      articleSection: article.category,
      url,
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: article.title,
      description: article.metaDescription,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      inLanguage: 'fr-FR',
    },
  ]

  const breadcrumbs = breadcrumbListNode(breadcrumbsForBlogArticle(article))
  if (breadcrumbs) graph.push(breadcrumbs)

  if (article.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: article.faq.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}
