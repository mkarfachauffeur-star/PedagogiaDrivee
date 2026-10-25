/** Chemins servis par l'application. Toute autre URL HTML doit répondre 404. */

export const BLOG_SLUGS = [
  'pourquoi-livret-numerique-auto-ecole',
  'avantages-suivi-pedagogique-numerique',
  'appliquer-remc-efficacement',
  'livret-papier-ou-livret-numerique',
  'ameliorer-taux-reussite-eleves',
  'erreurs-frequentes-auto-ecoles',
  'pourquoi-digitaliser-auto-ecole',
  'gagner-temps-logiciel-auto-ecole',
  'gestion-enseignants-simplifiee',
  'suivre-competences-remc',
  'meilleurs-outils-auto-ecole-moderne',
  'comment-fideliser-eleves-auto-ecole',
  'benefices-qcm-pedagogiques',
  'digitalisation-documents-auto-ecole',
  'communication-avec-eleves',
  'organisation-auto-ecole',
  'nouveautes-auto-ecoles',
  'pourquoi-utiliser-pedagogia-drive',
  'avantages-livret-numerique-nouvelle-generation',
  'avenir-auto-ecoles-connectees',
]

const BLOG_SLUG_SET = new Set(BLOG_SLUGS)

const EXACT_PATHS = new Set([
  '/',
  '/signup',
  '/mentions-legales',
  '/politique-confidentialite',
  '/confidentialite',
  '/cgu',
  '/cgv',
  '/cookies',
  '/contact',
  '/accept-invite',
  '/login',
  '/livret-numerique-auto-ecole',
  '/blog',
  '/manager',
  '/manager/dashboard',
  '/manager/students',
  '/manager/pre-registrations',
  '/manager/teachers',
  '/manager/simulator-sessions',
  '/manager/users',
  '/manager/planning',
  '/manager/vehicles',
  '/manager/contracts',
  '/manager/payments',
  '/manager/exports',
  '/manager/packages',
  '/manager/regulatory-export',
  '/manager/messages',
  '/manager/statistics',
  '/manager/settings',
  '/manager/settings/pricing',
  '/student',
  '/student/dashboard',
  '/student/lessons',
  '/student/planning',
  '/student/initial-assessment',
  '/student/competency-reports',
  '/student/pedagogical-appointments',
  '/student/observations',
  '/student/documents',
  '/student/contract',
  '/student/charter',
  '/student/payments',
  '/student/next-lesson',
  '/student/lexicon',
  '/student/progress',
  '/student/exams',
  '/student/practice-exams',
  '/student/accompanied-driving',
  '/student/messages',
  '/teacher',
  '/teacher/dashboard',
  '/teacher/planning',
  '/teacher/students',
  '/teacher/simulator-sessions',
  '/teacher/lessons',
  '/teacher/vehicles',
  '/teacher/messages',
  '/teacher/finance',
  '/teacher/profile',
  '/secretary',
  '/secretary/dashboard',
  '/secretary/inscriptions',
  '/secretary/pre-registrations',
  '/secretary/planning',
  '/secretary/simulator-sessions',
  '/secretary/vehicles',
  '/secretary/paiements',
  '/secretary/documents',
  '/secretary/exams',
  '/secretary/license-results',
  '/secretary/messages',
  '/platform',
  '/platform/dashboard',
  '/platform/organizations',
  '/platform/prospects',
  '/platform/demo-requests',
  '/platform/pricing',
  '/platform/settings',
  '/platform/users',
  '/platform/subscriptions',
  '/platform/payments',
  '/platform/audit',
  '/platform/reviews',
])

export function normalizePathname(pathname) {
  let path = pathname || '/'
  try {
    path = decodeURIComponent(path)
  } catch {
    // Conserve le chemin brut si l'encodage est invalide.
  }
  path = path.split('?')[0].split('#')[0]
  if (!path.startsWith('/')) path = `/${path}`
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path || '/'
}

export function isKnownAppPath(pathname) {
  const path = normalizePathname(pathname)
  if (EXACT_PATHS.has(path)) return true
  if (!path.startsWith('/blog/')) return false
  const slug = path.slice('/blog/'.length)
  return slug.length > 0 && !slug.includes('/') && BLOG_SLUG_SET.has(slug)
}

function isDevServerPath(pathname) {
  return (
    pathname.startsWith('/@') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/__vite')
  )
}

export function isRequestPathServed(pathname, { dev = false } = {}) {
  const path = normalizePathname(pathname)
  if (dev && isDevServerPath(path)) return true
  if (path.startsWith('/assets/') || path.includes('.')) return true
  return isKnownAppPath(path)
}
