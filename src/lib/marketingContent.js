import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Target,
  Users,
} from 'lucide-react'

export const LANDING_HERO = {
  title: 'Le suivi pédagogique de votre auto-école, enfin centralisé.',
  subtitle:
    'Suivez vos élèves, leurs compétences et leur progression depuis une seule plateforme.',
  primaryCta: 'Demander une démo',
  secondaryCta: 'Découvrir la plateforme',
}

export const LANDING_FEATURES = [
  {
    title: 'Gestion des élèves',
    description: 'Inscriptions, dossiers, progression et historique centralisés pour chaque élève.',
    icon: GraduationCap,
  },
  {
    title: 'Gestion des enseignants',
    description: 'Comptes dédiés, affectations et visibilité sur les élèves suivis.',
    icon: Users,
  },
  {
    title: 'Livret pédagogique numérique',
    description: 'Livret numérique auto-école : leçons et QCM de la compétence 1, progression consultable entre les séances.',
    icon: BookOpen,
  },
  {
    title: 'Planning',
    description: 'Planning des leçons consultable par les élèves, enseignants, secrétariat et gérant.',
    icon: CalendarDays,
  },
  {
    title: 'Messagerie interne',
    description: 'Échanges sécurisés entre élèves, enseignants et secrétariat.',
    icon: MessageSquare,
  },
  {
    title: 'Documents',
    description: 'Pièces administratives et pédagogiques stockées et partagées.',
    icon: FileText,
  },
  {
    title: 'Suivi REMC',
    description: 'La compétence 1 est opérationnelle. Les compétences 2, 3 et 4 sont prévues ; leur contenu pédagogique n\'est pas encore complet.',
    icon: Target,
  },
  {
    title: 'Statistiques',
    description: 'Indicateurs clés pour piloter votre activité et la réussite des élèves.',
    icon: BarChart3,
  },
  {
    title: 'Tableau de bord',
    description: 'Vue d\'ensemble personnalisée selon votre rôle au quotidien.',
    icon: LayoutDashboard,
  },
  {
    title: 'Notifications',
    description: 'Alertes dans l\'application pour les messages et événements importants. Les notifications push iOS ne sont pas encore disponibles.',
    icon: Bell,
  },
]

export const LANDING_HOW_IT_WORKS = [
  { step: 1, title: 'Vous demandez une démonstration.' },
  { step: 2, title: 'Vous recevez vos accès.' },
  { step: 3, title: 'Vous testez gratuitement Pedagogia Drive pendant 30 jours.' },
  { step: 4, title: 'Vous ouvrez votre auto-école en quelques minutes.' },
]

export const LANDING_WHY = [
  {
    title: 'Interface moderne',
    description: 'Une expérience claire et agréable, pensée pour le quotidien des équipes.',
  },
  {
    title: 'Gain de temps',
    description: 'Moins de ressaisies, moins d\'outils éparpillés — plus de temps pour l\'accompagnement.',
  },
  {
    title: 'Conforme REMC',
    description: 'Le suivi pédagogique s\'appuie sur le référentiel officiel. La compétence 1 est opérationnelle ; les compétences 2 à 4 seront complétées.',
  },
  {
    title: 'Accessible ordinateur, tablette et mobile',
    description: '100 % en ligne : accessible depuis n\'importe quel navigateur moderne.',
  },
  {
    title: 'Messagerie intégrée',
    description: 'Communiquez sans quitter la plateforme ni multiplier les applications.',
  },
  {
    title: 'Suivi pédagogique simplifié',
    description: 'Visualisez la progression réelle de chaque élève sur la compétence 1 ; les compétences 2 à 4 arriveront ensuite.',
  },
  {
    title: 'Déploiement rapide',
    description: 'Aucune installation complexe : vos équipes sont opérationnelles en quelques minutes.',
  },
]

export const MARKETING_FAQ = [
  {
    question: 'Qu\'est-ce qu\'un livret numérique auto-école ?',
    answer:
      'Un livret numérique auto-école est la version digitale du livret pédagogique d\'apprentissage : il centralise le suivi REMC (compétence 1 opérationnelle ; compétences 2 à 4 encore incomplètes), les QCM de la compétence 1 et la progression de chaque élève, accessible en ligne par les moniteurs et les candidats au permis.',
  },
  {
    question: 'Pedagogia Drive remplace-t-il le livret papier ?',
    answer:
      'Oui. Pedagogia Drive est un livret pédagogique numérique auto-école qui remplace le livret papier tout en respectant le référentiel REMC : traçabilité, commentaires des moniteurs et historique des séances.',
  },
  {
    question: 'Le livret pédagogique d\'apprentissage est-il conforme au REMC ?',
    answer:
      'Oui. Le livret pédagogique d\'apprentissage auto-école Pedagogia Drive structure le parcours autour des compétences officielles. La compétence 1 est opérationnelle ; les compétences 2, 3 et 4 ne sont pas encore disponibles comme contenu complet.',
  },
  {
    question: 'Comment fonctionne l\'essai gratuit ?',
    answer:
      'Après votre demande de démonstration, nous créons votre espace pilote. Vous bénéficiez de 30 jours d\'essai gratuit avec l\'ensemble des fonctionnalités essentielles, accompagné par notre équipe.',
  },
  {
    question: 'Dois-je installer un logiciel ?',
    answer:
      'Non. Pedagogia Drive fonctionne entièrement dans le navigateur web. Aucune installation n\'est nécessaire sur ordinateur, tablette ou smartphone.',
  },
  {
    question: 'Puis-je utiliser Pedagogia Drive sur Mac ?',
    answer:
      'Oui. La plateforme est compatible avec Mac, Windows, Linux, iPad, iPhone et Android via un navigateur moderne (Chrome, Safari, Firefox, Edge).',
  },
  {
    question: 'Mes enseignants auront-ils leur propre compte ?',
    answer:
      'Oui. Chaque enseignant dispose d\'un espace personnel pour suivre ses élèves, consulter les livrets et échanger via la messagerie interne.',
  },
  {
    question: 'Les élèves disposent-ils d\'un espace personnel ?',
    answer:
      'Oui. Chaque élève accède à son livret numérique, aux QCM de la compétence 1, à sa progression et à sa messagerie depuis un espace sécurisé.',
  },
  {
    question: 'Puis-je arrêter à tout moment ?',
    answer:
      'Oui. L\'essai pilote ne vous engage pas. Vous pouvez arrêter à tout moment pendant ou à l\'issue de la période d\'essai.',
  },
  {
    question: 'Comment fonctionne l\'accompagnement ?',
    answer:
      'Pendant la bêta privée, nous accompagnons chaque auto-école pilote : prise en main, paramétrage initial et retours pour faire évoluer la plateforme selon vos besoins réels.',
  },
  {
    question: 'Qu\'est-ce que Pedagogia Drive ?',
    answer:
      'Pedagogia Drive est une plateforme SaaS tout-en-un pour auto-écoles : gestion des élèves et enseignants, livret pédagogique numérique, planning, documents, messagerie et suivi REMC.',
  },
  {
    question: 'Le logiciel est-il conforme au REMC ?',
    answer:
      'Oui. Pedagogia Drive structure le parcours autour du REMC. La compétence 1 est opérationnelle dans le livret ; les compétences 2 à 4 sont prévues mais leur contenu n\'est pas encore complet.',
  },
]

/** FAQ réduite sur la page d'accueil — uniquement le produit actuel. */
export const LANDING_FAQ_HOME = [
  MARKETING_FAQ[0],
  MARKETING_FAQ[1],
  MARKETING_FAQ[2],
  MARKETING_FAQ[4],
  MARKETING_FAQ[7],
]

/** Contenu marketing — page dédiée livret numérique. */
export const LIVRET_SEO_SECTIONS = [
  {
    id: 'definition',
    title: 'Qu\'est-ce qu\'un livret numérique auto-école ?',
    paragraphs: [
      'C\'est la version digitale du livret de suivi utilisé en formation à la conduite : progression REMC (compétence 1 opérationnelle), évaluations des moniteurs, QCM de la compétence 1 et avancement de chaque élève, dans un espace en ligne sécurisé.',
      'Contrairement au livret papier, il se met à jour en temps réel, se partage entre enseignants et reste consultable par l\'élève entre deux leçons — sur ordinateur, tablette ou smartphone.',
    ],
  },
  {
    id: 'remc',
    title: 'Conforme au référentiel REMC',
    paragraphs: [
      'Pedagogia Drive s\'appuie sur le Référentiel pour l\'Éducation à une Mobilité Citoyenne (REMC). La compétence 1 est opérationnelle ; les compétences 2 à 4 seront complétées. Les moniteurs suivent la progression depuis la voiture ou le bureau.',
      'Chaque séance est tracée : dates, commentaires et niveaux d\'acquisition — une preuve utile pour les contrôles, les examens et la relation de confiance avec les familles.',
    ],
  },
  {
    id: 'fonctionnalites',
    title: 'Tout le suivi au même endroit',
    bullets: [
      'Arborescence REMC : compétence 1 opérationnelle ; compétences 2 à 4 prévues (contenu pédagogique encore incomplet)',
      'QCM et QCU pédagogiques liés aux leçons de la compétence 1',
      'Espace personnel élève : progression, lexique, messages',
      'Comptes moniteurs et secrétariat synchronisés',
      'Aucune installation : 100 % navigateur web',
    ],
  },
  {
    id: 'pourquoi',
    title: 'Pourquoi passer au livret numérique ?',
    paragraphs: [
      'Moins de ressaisie, un suivi continu des élèves et une image professionnelle auprès des candidats : le passage au numérique change le quotidien de toute l\'équipe.',
      'Pedagogia Drive va plus loin qu\'un simple livret : planning, documents, messagerie et statistiques sont intégrés pour éviter la multiplication d\'outils.',
    ],
  },
]

export const LIVRET_SEO_FAQ = [
  {
    question: 'Quelle différence entre livret numérique et livret papier ?',
    answer:
      'La saisie se fait en direct, le partage entre moniteurs est instantané, l\'élève consulte sa progression 24 h/24 et la conformité REMC reste toujours à jour. Le livret papier reste statique, difficile à archiver et sans lien avec les QCM.',
  },
  {
    question: 'Pedagogia Drive convient-il aux petites auto-écoles ?',
    answer:
      'Oui. L\'outil s\'adapte à toute taille d\'établissement : déploiement rapide, essai 30 jours et accompagnement à la prise en main.',
  },
  {
    question: 'Les élèves peuvent-ils consulter leur livret ?',
    answer:
      'Oui. Chaque élève dispose d\'un espace sécurisé pour suivre sa compétence 1, réviser les QCM associés et échanger avec son auto-école.',
  },
]

export const LANDING_FINAL_CTA = {
  title: 'Prêt à moderniser votre auto-école ?',
  subtitle: 'Essayez Pedagogia Drive gratuitement pendant 30 jours.',
  button: 'Demander une démonstration',
}

export const MARKETING_REASSURANCE = LANDING_WHY
