import { supabase } from './supabase'

// Tutoriel de première connexion du secrétariat, des enseignants et des élèves.
// Le gérant garde le sien (managerOnboarding.js). Le tutoriel est proposé une seule fois,
// après la création du mot de passe (invitation ou mot de passe provisoire).
export const ROLE_ONBOARDING_STEPS = {
  secretary: [
    {
      id: 'welcome',
      title: 'Bienvenue au secrétariat',
      description:
        'Votre espace regroupe tout l’administratif de l’auto-école : inscriptions, planning, paiements, documents et messagerie.',
    },
    {
      id: 'students',
      title: 'Inscrire les élèves',
      description:
        'Créez le dossier de chaque élève avec sa formule et son enseignant référent. L’élève reçoit ses accès par e-mail.',
      href: '/secretary/inscriptions',
      cta: 'Voir les inscriptions',
    },
    {
      id: 'planning',
      title: 'Organiser le planning',
      description:
        'Planifiez les leçons de conduite avec l’enseignant et le véhicule. Chacun voit ses leçons dans son propre espace.',
      href: '/secretary/planning',
      cta: 'Ouvrir le planning',
    },
    {
      id: 'payments',
      title: 'Enregistrer les paiements',
      description:
        'Chaque encaissement saisi ici arrive directement dans le tableau de bord du gérant, avec le reste à encaisser de chaque élève.',
      href: '/secretary/paiements',
      cta: 'Voir les paiements',
    },
    {
      id: 'messages',
      title: 'La messagerie interne',
      description:
        'Les élèves vous écrivent directement dans l’application. Vous voyez quand votre réponse est envoyée et lue.',
      href: '/secretary/messages',
      cta: 'Ouvrir la messagerie',
    },
    {
      id: 'done',
      title: 'Tout est prêt',
      description: 'Retrouvez toutes ces pages dans le menu. Bonne prise en main !',
    },
  ],
  teacher: [
    {
      id: 'welcome',
      title: 'Bienvenue sur Pedagogia Drive',
      description:
        'Votre espace enseignant réunit votre planning, vos élèves et leur livret REMC. Vos élèves révisent la théorie avant de monter en voiture.',
    },
    {
      id: 'planning',
      title: 'Votre planning',
      description: 'Retrouvez les leçons qui vous sont attribuées, jour par jour.',
      href: '/teacher/planning',
      cta: 'Ouvrir le planning',
    },
    {
      id: 'students',
      title: 'Le livret de vos élèves',
      description:
        'Ouvrez la fiche d’un élève pour valider ses compétences en fin de leçon et suivre sa progression.',
      href: '/teacher/students',
      cta: 'Voir mes élèves',
    },
    {
      id: 'messages',
      title: 'La messagerie interne',
      description: 'Échangez avec le secrétariat et le reste de l’équipe, directement dans l’application.',
      href: '/teacher/messages',
      cta: 'Ouvrir la messagerie',
    },
    {
      id: 'done',
      title: 'Tout est prêt',
      description: 'Retrouvez toutes ces pages dans le menu. Bonne route avec vos élèves !',
    },
  ],
  student: [
    {
      id: 'welcome',
      title: 'Bienvenue sur ton livret numérique',
      description:
        'Tu suis ici ta formation au permis : ta progression, tes leçons, ton planning et les messages de ton auto-école.',
    },
    {
      id: 'lessons',
      title: 'Révise avec les leçons et les QCU',
      description:
        'Chaque compétence du REMC a ses leçons et un QCU de 10 questions. Révise entre deux leçons : tu arriveras en voiture en connaissant déjà la théorie.',
      href: '/student/lessons',
      cta: 'Voir les leçons',
    },
    {
      id: 'planning',
      title: 'Ton planning',
      description: 'Retrouve la date et l’heure de tes prochaines leçons de conduite.',
      href: '/student/planning',
      cta: 'Voir mon planning',
    },
    {
      id: 'aac',
      title: 'La conduite accompagnée',
      description:
        'Si tu es en conduite accompagnée, enregistre tes trajets : les kilomètres se comptent tout seuls jusqu’à l’examen.',
      href: '/student/accompanied-driving',
      cta: 'Voir la conduite accompagnée',
    },
    {
      id: 'messages',
      title: 'Écris au secrétariat',
      description: 'Une question sur un document, un paiement ou une leçon ? Écris directement au secrétariat dans l’application.',
      href: '/student/messages',
      cta: 'Ouvrir la messagerie',
    },
    {
      id: 'done',
      title: 'C’est parti !',
      description: 'Retrouve toutes ces pages dans le menu. Bonne formation !',
    },
  ],
}

// Comptes créés depuis moins de 14 jours : les anciens comptes ne voient pas le tutoriel.
const NEW_ACCOUNT_DAYS = 14

export function shouldShowRoleOnboarding(user) {
  if (!user) return false
  if (user.user_metadata?.onboarding_completed) return false
  if (user.user_metadata?.must_change_password) return false
  if (user.user_metadata?.onboarding_pending) return true
  const createdAt = user.created_at ? new Date(user.created_at).getTime() : NaN
  return Number.isFinite(createdAt) && Date.now() - createdAt < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000
}

export async function completeRoleOnboarding() {
  const { error } = await supabase.auth.updateUser({
    data: { onboarding_pending: false, onboarding_completed: true },
  })
  if (error) throw error
}
