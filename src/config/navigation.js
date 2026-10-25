import { isAacFormation } from '../lib/studentTrack'

const PERMIS_B_ITEMS = [
  { href: '/student/dashboard', icon: '\u{1F4CA}', label: 'Tableau de bord' },
  { href: '/student/planning', icon: '\u{1F4C5}', label: 'Planning' },
  { href: '/student/initial-assessment', icon: '\u{1F4CB}', label: 'Évaluation de départ', track: 'permis_b' },
  { href: '/student/lessons', icon: '\u{1F4DA}', label: 'Compétences', track: 'permis_b' },
  { href: '/student/competency-reports', icon: '\u{1F4D3}', label: 'Historique des leçons', track: 'permis_b' },
  {
    href: '/student/accompanied-driving',
    icon: '\u{1F697}',
    label: 'Conduite accompagnée',
    track: 'permis_b',
    aacOnly: true,
  },
  { href: '/student/documents', icon: '\u{1F4C1}', label: 'Documents' },
  { href: '/student/messages', icon: '\u{1F4AC}', label: 'Messagerie' },
  { href: '/student/charter', icon: '\u{1F4DC}', label: 'Charte d\'engagement' },
]

const MOTO_AM_ITEMS = [
  { href: '/student/dashboard', icon: '\u{1F4CA}', label: 'Tableau de bord' },
  { href: '/student/planning', icon: '\u{1F4C5}', label: 'Planning' },
  { href: '/student/next-lesson', icon: '\u{1F3CD}\uFE0F', label: 'Prochaine leçon', track: 'moto_am' },
  { href: '/student/documents', icon: '\u{1F4C1}', label: 'Documents' },
  { href: '/student/messages', icon: '\u{1F4AC}', label: 'Messagerie' },
  { href: '/student/charter', icon: '\u{1F4DC}', label: 'Charte d\'engagement' },
]

export function getStudentNavItems(track, student = null) {
  const items = track === 'moto_am' ? MOTO_AM_ITEMS : PERMIS_B_ITEMS
  return items.filter((item) => {
    if (item.aacOnly && !isAacFormation(student)) return false
    return true
  })
}

export const NAVIGATION = {
  manager: {
    user: { avatar: '\u{1F4BC}', name: 'Gérant', role: 'Gérant' },
    items: [
      { href: '/manager/dashboard', icon: '\u{1F4CA}', label: 'Tableau de bord' },
      { href: '/manager/teachers', icon: '\u{1F468}\u200D\u{1F3EB}', label: 'Enseignants' },
      { href: '/manager/simulator-sessions', icon: '\u{1F5A5}\uFE0F', label: 'Séances simulateur' },
      { href: '/manager/students', icon: '\u{1F465}', label: 'Élèves' },
      { href: '/manager/pre-registrations', icon: '\u{1F4DD}', label: 'Pré-inscriptions' },
      { href: '/manager/users', icon: '\u{1F510}', label: 'Utilisateurs' },
      { href: '/manager/planning', icon: '\u{1F4C5}', label: 'Planning global' },
      { href: '/manager/vehicles', icon: '\u{1F698}', label: 'Gestion des véhicules' },
      { href: '/manager/contracts', icon: '\u{1F4C4}', label: 'Contrats' },
      { href: '/manager/payments', icon: '\u{1F4B0}', label: 'Paiements' },
      { href: '/manager/packages', icon: '\u{1F4B8}', label: 'Formules & tarifs' },
      { href: '/manager/exports', icon: '\u{1F4E4}', label: 'Exports réglementaires' },
      { href: '/manager/messages', icon: '\u{1F4AC}', label: 'Messages' },
      { href: '/manager/statistics', icon: '\u{1F4C8}', label: 'Évolution du CA' },
      { href: '/manager/settings', icon: '\u2699\uFE0F', label: 'Profil auto-école' },
    ],
  },
  student: {
    user: null,
    items: PERMIS_B_ITEMS,
  },
  teacher: {
    user: { avatar: '\u{1F468}\u200D\u{1F3EB}', name: 'Enseignant', role: 'Enseignant' },
    items: [
      { href: '/teacher/dashboard', icon: '\u{1F4CA}', label: 'Tableau de bord' },
      { href: '/teacher/planning', icon: '\u{1F4C5}', label: 'Mon planning' },
      { href: '/teacher/students', icon: '\u{1F465}', label: 'Mes élèves' },
      { href: '/teacher/simulator-sessions', icon: '\u{1F5A5}\uFE0F', label: 'Séances simulateur' },
      { href: '/teacher/messages', icon: '\u{1F4AC}', label: 'Messagerie' },
      { href: '/teacher/finance', icon: '\u{1F4B8}', label: 'Finances' },
    ],
  },
  super_admin: {
    label: 'Super Admin',
    spaceLabel: 'Administration plateforme',
    user: { avatar: '\u{1F510}', name: 'Super Admin', role: 'Plateforme' },
    items: [
      { href: '/platform/dashboard', icon: '\u{1F4CA}', label: 'Tableau de bord' },
      { href: '/platform/prospects', icon: '\u{1F4E9}', label: 'Demandes de démo', badgeKey: 'prospects' },
      { href: '/platform/reviews', icon: '\u2B50', label: 'Avis utilisateurs', badgeKey: 'reviews' },
      { href: '/platform/organizations', icon: '\u{1F3E2}', label: 'Auto-écoles' },
      { href: '/platform/subscriptions', icon: '\u{1F4E6}', label: 'Abonnements' },
      { href: '/platform/payments', icon: '\u{1F4B0}', label: 'Facturation' },
      { href: '/platform/pricing', icon: '\u{1F4B8}', label: 'Tarifs' },
      { href: '/platform/users', icon: '\u{1F465}', label: 'Utilisateurs' },
      { href: '/platform/audit', icon: '\u{1F4CB}', label: 'Activité' },
      { href: '/platform/settings', icon: '\u2699\uFE0F', label: 'Paramètres' },
    ],
  },
  secretary: {
    user: { avatar: '\u{1F469}\u200D\u{1F4BC}', name: 'Secrétariat', role: 'Secrétariat' },
    items: [
      { href: '/secretary/dashboard', icon: '\u{1F4CA}', label: 'Tableau de bord' },
      { href: '/secretary/inscriptions', icon: '\u{1F4DD}', label: 'Inscriptions' },
      { href: '/secretary/pre-registrations', icon: '\u{1F4CB}', label: 'Pré-inscriptions' },
      { href: '/secretary/planning', icon: '\u{1F4C5}', label: 'Planning global' },
      { href: '/secretary/simulator-sessions', icon: '\u{1F5A5}\uFE0F', label: 'Séances simulateur' },
      { href: '/secretary/vehicles', icon: '\u{1F698}', label: 'Gestion des véhicules' },
      { href: '/secretary/paiements', icon: '\u{1F4B0}', label: 'Paiements' },
      { href: '/secretary/documents', icon: '\u{1F4C1}', label: 'Documents' },
      { href: '/secretary/exams', icon: '\u{1F3AF}', label: 'Examens' },
      { href: '/secretary/license-results', icon: '\u{1F393}', label: 'Résultat du permis' },
      { href: '/secretary/messages', icon: '\u{1F4AC}', label: 'Messages' },
    ],
  },
}
