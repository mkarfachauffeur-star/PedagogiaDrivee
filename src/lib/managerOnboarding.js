import { supabase } from './supabase'

// Ordre pensé pour une auto-école qui démarre : les formules d'abord (elles servent à
// l'inscription et aux paiements), puis l'équipe, les élèves, la messagerie et les chiffres.
export const MANAGER_ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenue sur Pedagogia Drive',
    description:
      'Votre espace gérant est prêt. En quelques étapes, vous configurez vos formules, invitez votre équipe et inscrivez vos premiers élèves.',
  },
  {
    id: 'packages',
    title: 'Vos formules et tarifs',
    description:
      'Commencez par vérifier vos formules (permis B, conduite accompagnée, heures à l’unité…). Elles servent à l’inscription des élèves et aux paiements.',
    href: '/manager/packages',
    cta: 'Voir les formules',
  },
  {
    id: 'team',
    title: 'Invitez votre équipe',
    description:
      'Ajoutez votre secrétariat et vos enseignants. Chacun reçoit un e-mail pour créer son mot de passe. Sans secrétaire, c’est vous qui gérez les inscriptions, le planning et les paiements.',
    href: '/manager/users',
    cta: 'Inviter l’équipe',
  },
  {
    id: 'students',
    title: 'Inscrivez vos élèves',
    description:
      'Créez le dossier de chaque élève et choisissez son enseignant référent. L’élève reçoit ses accès et peut réviser avec les leçons et les QCU du REMC.',
    href: '/manager/students',
    cta: 'Ajouter un élève',
  },
  {
    id: 'messages',
    title: 'La messagerie interne',
    description:
      'Les élèves écrivent au secrétariat directement dans l’application, et l’équipe échange entre elle. Vous voyez quand un message est envoyé et lu.',
    href: '/manager/messages',
    cta: 'Ouvrir la messagerie',
  },
  {
    id: 'finance',
    title: 'Vos encaissements réels',
    description:
      'Chaque paiement saisi par le secrétariat ou un enseignant arrive dans votre tableau de bord : ce qui est encaissé, ce qui reste à encaisser, et l’évolution sur 12 mois.',
    href: '/manager/payments',
    cta: 'Voir les paiements',
  },
  {
    id: 'done',
    title: 'Tout est prêt',
    description:
      'Retrouvez toutes ces pages dans le menu. Vous pouvez commencer par inviter votre équipe : c’est la première étape pour faire vivre votre espace.',
  },
]

export function shouldShowManagerOnboarding(user, locationState) {
  if (!user) return false
  const role = user.app_metadata?.role || user.user_metadata?.role
  if (role !== 'manager') return false
  if (user.user_metadata?.manager_onboarding_completed) return false
  return Boolean(
    locationState?.managerOnboarding || user.user_metadata?.manager_onboarding_pending,
  )
}

export async function markManagerOnboardingPending() {
  const { error } = await supabase.auth.updateUser({
    data: { manager_onboarding_pending: true },
  })
  if (error) throw error
}

export async function completeManagerOnboarding() {
  const { error } = await supabase.auth.updateUser({
    data: {
      manager_onboarding_pending: false,
      manager_onboarding_completed: true,
    },
  })
  if (error) throw error
}
