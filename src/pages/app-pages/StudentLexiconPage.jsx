import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import PanelTabs from '../../components/ui/PanelTabs'
import franceC20a from '../../assets/signs/france-c20a.svg?url'

const officialSignViewBox = '-0.781 -0.08 576.53826 507.94375'
const yieldSignViewBox = '-50 -30 50.300621 44'
const priorityRoadSignViewBox = '-0.722 -0.722 576 576'

const labels = {
  studentOnly: 'Élève uniquement',
  title: 'Lexique auto-école',
  subtitle: 'Définitions essentielles, panneaux de signalisation et quiz QCU aléatoire pour ancrer le vocabulaire.',
}

const terms = [
  { word: 'Décélérer', definition: 'Réduire progressivement son allure.', explanation: 'On décélère en relâchant l’accélérateur, en freinant doucement ou en rétrogradant selon la situation.' },
  { word: 'Accélérer', definition: 'Augmenter la vitesse du véhicule.', explanation: 'L’accélération doit être progressive pour éviter les à-coups et garder le contrôle.' },
  { word: 'Embrayer', definition: 'Relier le moteur aux roues avec l’embrayage.', explanation: 'Quand on relâche progressivement la pédale d’embrayage, la puissance du moteur revient vers les roues.' },
  { word: 'Débrayer', definition: 'Séparer le moteur des roues avec l’embrayage.', explanation: 'On débraye en appuyant à fond sur la pédale d’embrayage pour changer de vitesse ou s’arrêter.' },
  { word: 'Point de patinage', definition: 'Moment où le véhicule commence à vouloir avancer.', explanation: 'C’est le point d’équilibre entre l’embrayage et le moteur, très utile pour démarrer en douceur.' },
  { word: 'Frein moteur', definition: 'Ralentissement naturel du véhicule quand on relâche l’accélérateur avec une vitesse enclenchée.', explanation: 'Le frein moteur aide à ralentir sans freiner fortement, surtout en descente ou avant un virage. Débrayer annule son effet.' },
  {
    word: 'Freinage progressif',
    definition: 'Freiner doucement au début, puis augmenter progressivement la pression.',
    explanation:
      'Il permet un ralentissement confortable et évite les à-coups, par exemple avant un virage, un feu ou un ralentisseur.',
  },
  {
    word: 'Freinage dégressif',
    definition: 'Freiner fort au début, puis relâcher progressivement la pression.',
    explanation:
      'Il favorise un arrêt précis et stable, notamment pour s’immobiliser au bon endroit sans secousse à l’arrêt.',
  },
  { word: 'Rétrograder', definition: 'Passer à un rapport inférieur.', explanation: 'On rétrograde pour récupérer de la puissance, ralentir ou adapter l’allure.' },
  {
    word: 'Angle mort',
    definition:
      'Zone autour du véhicule que les rétroviseurs ne montrent pas, où un usager peut se cacher.',
    explanation:
      'Les rétroviseurs et le pare-brise ne couvrent pas tout le pourtour du véhicule. Avant de changer de direction, il faut tourner la tête pour contrôler ces zones.',
  },
  { word: 'Trajectoire', definition: 'Chemin suivi par le véhicule.', explanation: 'La trajectoire dépend du regard, de l’allure et de la précision des gestes au volant.' },
  { word: 'Priorité', definition: 'Droit de passer avant un autre usager.', explanation: 'Avoir la priorité ne dispense jamais d’observer et de ralentir si nécessaire.' },
  { word: 'Intersection', definition: 'Lieu où plusieurs routes se croisent.', explanation: 'Il faut y rechercher la signalisation, contrôler les usagers et adapter son allure.' },
  { word: 'Agglomération', definition: 'Zone urbaine signalée par un panneau d’entrée de ville.', explanation: 'La vitesse et l’observation doivent être adaptées à la présence de piétons, cyclistes et intersections.' },
  { word: 'Hors agglomération', definition: 'Zone située en dehors d’une ville ou d’un village.', explanation: 'Les vitesses sont souvent plus élevées, mais l’anticipation reste indispensable.' },
  { word: 'Voie de décélération', definition: 'Voie permettant de ralentir pour sortir d’un axe rapide.', explanation: 'On s’y engage pour réduire progressivement l’allure sans gêner la circulation principale.' },
  { word: 'Voie d’insertion', definition: 'Voie permettant d’entrer dans une circulation rapide.', explanation: 'Elle sert à prendre de la vitesse, contrôler et s’insérer sans surprendre les autres usagers.' },
]

const signs = [
  {
    name: 'STOP',
    type: 'stop',
    category: 'Intersection',
    accent: 'rose',
    explanation: 'Arrêt obligatoire à l’intersection avant de repartir si la voie est libre.',
    question: 'Que faut-il faire à un panneau STOP ?',
    answer: 'Marquer un arrêt complet, observer puis repartir seulement si la voie est libre.',
  },
  {
    name: 'Cédez le passage',
    type: 'yield',
    category: 'Intersection',
    accent: 'rose',
    explanation: 'Ralentir et laisser passer les véhicules circulant sur la route prioritaire.',
    question: 'Faut-il s’arrêter à un cédez le passage ?',
    answer: 'Non, sauf si un usager arrive. On ralentit et on cède le passage si nécessaire.',
  },
  {
    name: 'Sens interdit',
    type: 'noEntry',
    category: 'Interdiction',
    accent: 'rose',
    explanation: 'Interdiction d’entrer dans cette voie dans le sens indiqué.',
    question: 'Que signifie un disque rouge avec une barre blanche ?',
    answer: 'Sens interdit : on ne peut pas circuler dans cette direction.',
  },
  {
    name: 'Rond-point',
    type: 'roundabout',
    category: 'Obligation',
    accent: 'sky',
    explanation: 'Annonce un carrefour à sens giratoire avec priorité aux véhicules déjà engagés.',
    question: 'Qui est prioritaire dans un rond-point ?',
    answer: 'Les véhicules déjà engagés dans l’anneau sont prioritaires.',
  },
  {
    name: 'Limitation de vitesse',
    type: 'speed50',
    category: 'Interdiction',
    accent: 'rose',
    explanation: 'Vitesse maximale autorisée jusqu’au prochain panneau de fin ou de changement.',
    question: 'Que veut dire un disque blanc bordé de rouge avec un chiffre ?',
    answer: 'Vitesse maximale autorisée en km/h sur cette portion de route.',
  },
  {
    name: 'Passage piéton',
    type: 'pedestrian',
    category: 'Indication',
    accent: 'sky',
    explanation: 'Endroit où les piétons engagés ou manifestant l’intention de traverser sont prioritaires.',
    question: 'Que faire à l’approche d’un passage piéton ?',
    answer: 'Ralentir, observer et s’arrêter si un piéton traverse ou s’apprête à traverser.',
  },
  {
    name: 'Feu tricolore',
    type: 'trafficLight',
    category: 'Signalisation',
    accent: 'emerald',
    explanation: 'Régule la circulation : rouge arrêt, orange préparation à l’arrêt, vert passage.',
    question: 'Que signifie le feu orange ?',
    answer: 'Préparer l’arrêt avant la ligne, sauf si le freinage devient dangereux.',
  },
  {
    name: 'Priorité à droite',
    type: 'priority',
    category: 'Danger',
    accent: 'amber',
    explanation: 'À une intersection sans signalisation particulière, le véhicule venant de droite est prioritaire.',
    question: 'Qui passe en premier à une intersection sans signalisation ?',
    answer: 'Le véhicule arrivant par la droite est prioritaire.',
  },
  {
    name: 'Route à caractère prioritaire',
    type: 'priorityRoad',
    category: 'Priorité',
    accent: 'amber',
    explanation:
      'Indique une route où le conducteur dispose de la priorité aux intersections, jusqu’au panneau de fin de priorité.',
    question: 'Que signifie ce losange jaune ?',
    answer:
      'Vous circulez sur une route prioritaire : vous avez la priorité aux intersections jusqu’à la fin de cette route.',
  },
  {
    name: 'Sens unique',
    type: 'oneWay',
    category: 'Indication',
    accent: 'sky',
    explanation: 'Indique que la circulation est autorisée uniquement dans le sens de la flèche.',
    question: 'Que faut-il faire face à ce panneau ?',
    answer: 'Suivre la direction indiquée par la flèche : la voie est à sens unique.',
  },
  {
    name: 'Stationnement interdit',
    type: 'noParking',
    category: 'Interdiction',
    accent: 'rose',
    explanation: 'Interdiction de stationner sur le côté de chaussée signalé.',
    question: 'Peut-on s’arrêter quelques secondes sous ce panneau ?',
    answer: 'Oui, l’arrêt est autorisé, mais le stationnement est interdit.',
  },
  {
    name: 'Ralentisseur',
    type: 'bump',
    category: 'Danger',
    accent: 'amber',
    explanation: 'Annonce un ralentisseur : réduire fortement son allure avant de le franchir lentement et dans l’axe.',
    question: 'Comment franchir un ralentisseur ?',
    answer: 'Très lentement et dans l’axe, pour éviter de heurter le bas du véhicule.',
  },
]

const quiz = [
  { question: 'Que signifie débrayer ?', answer: 'Appuyer sur l’embrayage pour séparer le moteur des roues', choices: ['Appuyer sur l’embrayage pour séparer le moteur des roues', 'Accélérer fortement pour passer une vitesse', 'Couper le contact du moteur', 'Tourner le volant à fond'] },
  {
    question: 'Qu’est-ce qu’un angle mort ?',
    answer: 'Des zones autour du véhicule que les rétroviseurs ne montrent pas',
    choices: [
      'Des zones autour du véhicule que les rétroviseurs ne montrent pas',
      'Des zones toujours visibles dans les rétroviseurs',
      'Une voie d’insertion sur autoroute',
      'Un emplacement de stationnement',
    ],
  },
  { question: 'À quoi sert une voie d’insertion ?', answer: 'Entrer progressivement dans une circulation rapide', choices: ['Entrer progressivement dans une circulation rapide', 'Stationner sur le côté de la chaussée', 'Faire demi-tour en toute sécurité', 'Doubler les véhicules lents'] },
  { question: 'Que veut dire rétrograder ?', answer: 'Passer à un rapport inférieur', choices: ['Passer à un rapport inférieur', 'Passer à un rapport supérieur', 'Couper le contact du moteur', 'Mettre la boîte au point mort'] },
  { question: 'Le clignotant sert surtout à :', answer: 'Informer les autres usagers de l’intention de tourner', choices: ['Informer les autres usagers de l’intention de tourner', 'Obtenir automatiquement la priorité', 'Signaler une situation d’urgence', 'Demander aux piétons de s’écarter'] },
  { question: 'Que veut dire décélérer ?', answer: 'Réduire son allure en relâchant la pédale d’accélérateur sans freiner', choices: ['Réduire son allure en relâchant la pédale d’accélérateur sans freiner', 'Accélérer franchement', 'Couper le moteur', 'Maintenir une allure constante'] },
  { question: 'Qu’est-ce que le frein moteur ?', answer: 'Le ralentissement naturel quand on relâche l’accélérateur avec une vitesse enclenchée', choices: ['Le ralentissement naturel quand on relâche l’accélérateur avec une vitesse enclenchée', 'Le frein de stationnement à main', 'Le système ABS du véhicule', 'Une pédale spécifique au moteur'] },
  {
    question: 'Qu’est-ce que le freinage progressif ?',
    answer: 'Freiner doucement au début puis augmenter progressivement la pression',
    choices: [
      'Freiner doucement au début puis augmenter progressivement la pression',
      'Freiner fort au début puis relâcher progressivement la pression',
      'Freiner à fond sans relâcher jusqu’à l’arrêt',
      'Utiliser uniquement le frein à main',
    ],
  },
  {
    question: 'Qu’est-ce que le freinage dégressif ?',
    answer: 'Freiner fort au début puis relâcher progressivement la pression',
    choices: [
      'Freiner fort au début puis relâcher progressivement la pression',
      'Freiner doucement au début puis augmenter progressivement la pression',
      'Freiner uniquement avec l’embrayage',
      'Accélérer puis freiner brusquement',
    ],
  },
  { question: 'Qu’est-ce que le point de patinage ?', answer: 'Le moment où le véhicule commence à vouloir avancer', choices: ['Le moment où le véhicule commence à vouloir avancer', 'Le moment où l’on cale le moteur', 'Le point d’arrêt du frein à main', 'Le point culminant d’un virage'] },
  { question: 'Que désigne une intersection ?', answer: 'Un lieu où plusieurs routes se croisent', choices: ['Un lieu où plusieurs routes se croisent', 'Une portion d’autoroute', 'Une zone réservée aux bus', 'Un passage piéton signalé'] },
  { question: 'Quel est ce panneau ?', visualType: 'stop', answer: 'STOP', choices: ['STOP', 'Cédez le passage', 'Sens interdit', 'Limitation de vitesse'] },
  { question: 'Quel est ce panneau ?', visualType: 'yield', answer: 'Cédez le passage', choices: ['Cédez le passage', 'STOP', 'Ralentisseur', 'Priorité à droite'] },
  { question: 'Quel est ce panneau ?', visualType: 'noEntry', answer: 'Sens interdit', choices: ['Sens interdit', 'Stationnement interdit', 'Sens unique', 'STOP'] },
  { question: 'Quel est ce panneau ?', visualType: 'roundabout', answer: 'Rond-point', choices: ['Rond-point', 'Sens unique', 'Priorité à droite', 'Cédez le passage'] },
  { question: 'Quel est ce panneau ?', visualType: 'speed50', answer: 'Limitation de vitesse', choices: ['Limitation de vitesse', 'Sens interdit', 'Stationnement interdit', 'Passage piéton'] },
  { question: 'Quel est ce panneau ?', visualType: 'pedestrian', answer: 'Passage piéton', choices: ['Passage piéton', 'Sens unique', 'Feu tricolore', 'Rond-point'] },
  { question: 'Quel est ce panneau ?', visualType: 'trafficLight', answer: 'Feu tricolore', choices: ['Feu tricolore', 'Rond-point', 'Passage piéton', 'Priorité à droite'] },
  { question: 'Quel est ce panneau ?', visualType: 'priority', answer: 'Priorité à droite', choices: ['Priorité à droite', 'Ralentisseur', 'Cédez le passage', 'STOP'] },
  {
    question: 'Quel est ce panneau ?',
    visualType: 'priorityRoad',
    answer: 'Route à caractère prioritaire',
    choices: ['Route à caractère prioritaire', 'Priorité à droite', 'Cédez le passage', 'Sens unique'],
  },
  {
    question: 'Que signifie une route à caractère prioritaire ?',
    answer: 'Le conducteur a la priorité aux intersections jusqu’au panneau de fin de priorité',
    choices: [
      'Le conducteur a la priorité aux intersections jusqu’au panneau de fin de priorité',
      'La priorité à droite s’applique à chaque intersection',
      'Il doit céder le passage à tous les usagers',
      'La vitesse est limitée à 30 km/h',
    ],
  },
  { question: 'Quel est ce panneau ?', visualType: 'oneWay', answer: 'Sens unique', choices: ['Sens unique', 'Sens interdit', 'Passage piéton', 'Rond-point'] },
  { question: 'Quel est ce panneau ?', visualType: 'noParking', answer: 'Stationnement interdit', choices: ['Stationnement interdit', 'Sens interdit', 'Sens unique', 'Limitation de vitesse'] },
  { question: 'Quel est ce panneau ?', visualType: 'bump', answer: 'Ralentisseur', choices: ['Ralentisseur', 'Priorité à droite', 'Limitation de vitesse', 'Cédez le passage'] },
]

const QUIZ_SAMPLE_SIZE = 10

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildSession() {
  return shuffleArray(quiz)
    .slice(0, Math.min(QUIZ_SAMPLE_SIZE, quiz.length))
    .map((item) => ({ ...item, choices: shuffleArray(item.choices) }))
}

const accentBadge = {
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
}

function HorizontalCarousel({ children, ariaLabel }) {
  return (
    <div className="relative mt-5 min-w-0">
      <div
        aria-label={ariaLabel}
        className="flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-3 scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
        role="region"
      >
        {children}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}

function SignVisual({ type, size = 'md' }) {
  const dim = size === 'sm' ? 'h-20 w-20' : size === 'lg' ? 'h-36 w-36' : 'h-28 w-28'
  const className = `${dim} drop-shadow-[0_8px_18px_rgba(15,23,42,0.18)]`

  switch (type) {
    case 'stop':
      return (
        <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Panneau STOP">
          <polygon points="40,6 80,6 114,40 114,80 80,114 40,114 6,80 6,40" fill="#d4101a" />
          <polygon points="40,6 80,6 114,40 114,80 80,114 40,114 6,80 6,40" fill="none" stroke="#ffffff" strokeWidth="5" />
          <polygon points="41,11 79,11 109,41 109,79 79,109 41,109 11,79 11,41" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.55" />
          <text x="60" y="72" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900" fontFamily="'Helvetica Neue', Arial, sans-serif" letterSpacing="1.5">STOP</text>
        </svg>
      )
    case 'yield':
      return (
        <svg className={className} viewBox={yieldSignViewBox} role="img" aria-label="Panneau Cédez le passage AB3a">
          <path
            d="m -2.5715637,-29.850003 c 2.10285065,0 3.38462265,2.26687 2.36562465,4.05625 L -22.480936,12.815626 c -0.532571,0.915464 -1.45303,1.367516 -2.36875,1.3625 -0.91572,0.005 -1.836179,-0.447036 -2.36875,-1.3625 l -22.275003,-38.609379 c -1.018998,-1.78938 0.262774,-4.05625 2.365625,-4.05625 z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="0.2"
          />
          <path
            d="m -2.5684457,-28.800131 c 1.269022,0.0052 2.09296165,1.222161 1.403125,2.425 L -23.452818,12.243623 c -0.357662,0.624542 -0.879931,0.894339 -1.396875,0.884375 -0.516944,0.01 -1.039213,-0.259833 -1.396875,-0.884375 l -22.287503,-38.618754 c -0.689837,-1.202839 0.134103,-2.4198 1.403125,-2.425 z"
            fill="#c4121e"
          />
          <path
            d="m -24.849698,1.6706576 13.923502,-23.9986116 -27.847003,0.0052 13.923501,23.9933586 0,2.7e-5 z"
            fill="#ffffff"
          />
        </svg>
      )
    case 'noEntry':
      return (
        <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Panneau sens interdit">
          <circle cx="60" cy="60" r="52" fill="#d4101a" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.5" />
          <rect x="22" y="52" width="76" height="16" rx="3" fill="#ffffff" />
        </svg>
      )
    case 'roundabout':
      return (
        <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Panneau rond-point obligatoire">
          <circle cx="60" cy="60" r="52" fill="#0a52a3" />
          <path d="M60 32a28 28 0 0 1 24.25 14" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" />
          <polygon points="78,38 92,49 76,52" fill="#ffffff" />
          <path d="M84 64a28 28 0 0 1-40.5 22" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" />
          <polygon points="47,93 33,84 49,80" fill="#ffffff" />
          <path d="M36 76A28 28 0 0 1 38 41" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" />
          <polygon points="30,36 47,33 41,49" fill="#ffffff" />
        </svg>
      )
    case 'speed50':
      return (
        <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Panneau limitation 50 km/h">
          <circle cx="60" cy="60" r="56" fill="#ffffff" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="#d4101a" strokeWidth="13" />
          <text x="60" y="78" textAnchor="middle" fill="#0f172a" fontSize="48" fontWeight="900" fontFamily="'Helvetica Neue', Arial, sans-serif">50</text>
        </svg>
      )
    case 'pedestrian':
      return (
        <img
          src={franceC20a}
          className={className}
          alt="Panneau passage piéton C20a"
          role="img"
        />
      )
    case 'trafficLight':
      return (
        <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Feu tricolore">
          <rect x="12" y="10" width="96" height="14" rx="4" fill="#374151" />
          <rect x="34" y="22" width="52" height="86" rx="14" fill="#1f2937" />
          <circle cx="60" cy="40" r="11" fill="#ef4444" />
          <circle cx="60" cy="40" r="11" fill="url(#redGlow)" opacity="0.5" />
          <circle cx="60" cy="65" r="11" fill="#f59e0b" />
          <circle cx="60" cy="65" r="11" fill="url(#orangeGlow)" opacity="0.5" />
          <circle cx="60" cy="90" r="11" fill="#10b981" />
          <circle cx="60" cy="90" r="11" fill="url(#greenGlow)" opacity="0.5" />
          <defs>
            <radialGradient id="redGlow" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#fff" stopOpacity="0.7" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></radialGradient>
            <radialGradient id="orangeGlow" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#fff" stopOpacity="0.7" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
            <radialGradient id="greenGlow" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#fff" stopOpacity="0.7" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></radialGradient>
          </defs>
        </svg>
      )
    case 'priority':
      return (
        <svg className={className} viewBox={officialSignViewBox} role="img" aria-label="Panneau priorité à droite AB1">
          <path
            d="M 4.663749,460.12175 260.66975,16.707755 c 5.531,-9.58 15.753,-15.482 26.815,-15.482 11.063,0 21.284,5.902 26.815,15.482 L 570.30474,460.12175 c 5.531,9.58 5.531,21.383 0,30.964 -5.531,9.579 -15.753,15.481 -26.815,15.481 H 31.479749 c -11.062,0 -21.284,-5.902 -26.815,-15.481 -5.53100003,-9.581 -5.53200003,-21.384 -10e-4,-30.964 z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="2"
          />
          <path
            d="M 559.62374,466.39275 303.52875,22.822755 c -3.31,-5.732 -9.425,-9.263 -16.044,-9.263 -6.619,0 -12.734,3.531 -16.044,9.263 L 15.344749,466.39275 c -3.31,5.732 -3.309,12.794 0,18.526 3.31,5.731 9.425,9.263 16.044,9.263 H 543.57974 c 6.619,0 12.734,-3.531 16.044,-9.263 3.31,-5.732 3.31,-12.794 0,-18.526 z"
            fill="#f91a0e"
          />
          <polygon transform="translate(0.42774897,1.137755)" points="510.884,455.888 63.23,455.888 287.057,68.208" fill="#ffffff" />
          <polyline
            transform="translate(0.42774897,1.137755)"
            points="287.057,314.667 217.274,246.313 195.668,268.37 264.999,336.281 197.087,405.612 219.145,427.219 287.057,357.888 354.969,427.219 377.026,405.612 309.114,336.281 378.445,268.37 356.839,246.313 287.057,314.667"
            fill="#000000"
          />
        </svg>
      )
    case 'priorityRoad':
      return (
        <svg className={className} viewBox={priorityRoadSignViewBox} role="img" aria-label="Panneau route à caractère prioritaire AB6">
          <path
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M270.312,7.328 L7.328,270.312c-4.5,4.5-7.028,10.603-7.028,16.967c0,6.364,2.528,12.467,7.028,16.967l262.984,262.984c4.5,4.499,10.603,7.027,16.966,7.027c6.363,0,12.467-2.528,16.967-7.027l262.983-262.984c4.5-4.5,7.028-10.603,7.028-16.967c0-6.364-2.528-12.467-7.028-16.967L304.245,7.328c-4.5-4.5-10.604-7.028-16.967-7.028C280.915,0.3,274.812,2.828,270.312,7.328z"
          />
          <path
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M274.554,28.536 L28.536,274.554c-3.375,3.375-5.271,7.952-5.271,12.725s1.896,9.35,5.271,12.725l246.018,246.017c3.375,3.375,7.952,5.271,12.725,5.271s9.35-1.896,12.725-5.271l246.018-246.017c3.375-3.375,5.271-7.952,5.271-12.725s-1.896-9.35-5.271-12.725L300.003,28.536c-3.375-3.375-7.952-5.271-12.725-5.271S277.928,25.162,274.554,28.536z"
          />
          <rect
            x="156.894"
            y="156.895"
            transform="matrix(0.7071 -0.7071 0.7071 0.7071 -118.9949 287.2785)"
            fill="#F6F73D"
            stroke="#000000"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="260.768"
            height="260.768"
          />
        </svg>
      )
    case 'oneWay':
      return (
        <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Panneau sens unique">
          <rect x="8" y="8" width="104" height="104" rx="8" fill="#ffffff" />
          <rect x="12" y="12" width="96" height="96" rx="5" fill="#0a52a3" />
          <polygon points="60,22 92,58 76,58 76,100 44,100 44,58 28,58" fill="#ffffff" />
        </svg>
      )
    case 'noParking':
      return (
        <svg className={className} viewBox="0 0 120 120" role="img" aria-label="Panneau stationnement interdit">
          <circle cx="60" cy="60" r="52" fill="#0a52a3" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#d4101a" strokeWidth="9" />
          <line x1="26" y1="94" x2="94" y2="26" stroke="#d4101a" strokeWidth="9" strokeLinecap="round" />
        </svg>
      )
    case 'bump':
      return (
        <svg className={className} viewBox={officialSignViewBox} role="img" aria-label="Panneau ralentisseur A2b">
          <path
            d="M 4.6637489,460.12175 260.66975,16.707756 c 5.531,-9.58 15.753,-15.4819999 26.815,-15.4819999 11.063,0 21.284,5.9019999 26.815,15.4819999 L 570.30474,460.12175 c 5.531,9.58 5.531,21.383 0,30.964 -5.531,9.579 -15.753,15.481 -26.815,15.481 H 31.479749 c -11.062,0 -21.284,-5.902 -26.8150001,-15.481 -5.5309999,-9.581 -5.5319999,-21.384 -0.001,-30.964 z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="2"
          />
          <path
            d="M 31.388749,494.18175 H 543.57974 c 6.619,0 12.734,-3.531 16.044,-9.263 3.31,-5.732 3.31,-12.794 0,-18.526 L 303.52875,22.822756 c -3.31,-5.732 -9.425,-9.263 -16.044,-9.263 -6.619,0 -12.734,3.531 -16.044,9.263 L 15.344749,466.39275 c -3.31,5.732 -3.309,12.794 0,18.526 3.31,5.732 9.425,9.263 16.044,9.263 z"
            fill="#f41a0e"
          />
          <polygon transform="translate(0.42774893,1.1377561)" points="510.884,455.888 63.23,455.888 287.057,68.208" fill="#ffffff" />
          <path
            d="m 287.48543,374.5308 c -79.30655,0 -77.47603,48.61288 -154.3875,48.61288 v 12.48508 h 308.773 v -12.48508 c -76.91141,0 -75.07896,-48.61288 -154.3855,-48.61288 z"
            fill="#000000"
          />
        </svg>
      )
    default:
      return null
  }
}

export default function StudentLexiconPage() {
  const [sectionTab, setSectionTab] = useState('vocab')
  const [activeTerm, setActiveTerm] = useState(terms[0])
  const [flipped, setFlipped] = useState({})

  const [session, setSession] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const startQuiz = () => {
    setSession(buildSession())
    setCurrentIndex(0)
    setSelectedChoice(null)
    setScore(0)
    setFinished(false)
  }

  const handleSelect = (choice) => {
    if (selectedChoice || !session) return
    setSelectedChoice(choice)
    if (choice === session[currentIndex].answer) {
      setScore((value) => value + 1)
    }
  }

  const handleNext = () => {
    if (!session) return
    if (currentIndex + 1 >= session.length) {
      setFinished(true)
    } else {
      setCurrentIndex((value) => value + 1)
      setSelectedChoice(null)
    }
  }

  const currentQuestion = session && !finished ? session[currentIndex] : null
  const progress = session ? Math.round(((currentIndex + (selectedChoice ? 1 : 0)) / session.length) * 100) : 0
  const percentage = session ? Math.round((score / session.length) * 100) : 0

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      <PageHeader description={labels.subtitle} title={labels.title} />

      <PanelTabs
        activeId={sectionTab}
        className="sticky top-0 z-10 rounded-2xl border border-slate-300 bg-white/95 p-3 shadow-sm backdrop-blur"
        onChange={setSectionTab}
        tabs={[
          { id: 'vocab', label: 'Vocabulaire' },
          { id: 'signs', label: 'Panneaux' },
          { id: 'quiz', label: 'Quiz' },
        ]}
      />

      {sectionTab === 'vocab' && (
      <section className="grid grid-cols-1 min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-blue-700">Définitions du lexique</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Cartes interactives</h2>
              <p className="mt-2 text-xs font-semibold text-slate-500 sm:text-sm">Faites défiler pour parcourir tous les mots →</p>
            </div>
            <p className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">{terms.length} mots clés</p>
          </div>
          <HorizontalCarousel ariaLabel="Lexique — cartes défilables">
            {terms.map((term) => {
              const isFlipped = Boolean(flipped[term.word])
              const isActive = activeTerm.word === term.word
              return (
                <button
                  className={`snap-start shrink-0 w-[17.5rem] rounded-xl border p-4 text-left transition hover:-translate-y-1 hover:shadow-lg sm:w-[19rem] ${
                    isActive
                      ? 'border-blue-300 bg-blue-50/80 shadow-md'
                      : 'border-slate-300 bg-slate-50 hover:border-blue-200 hover:bg-blue-50/60'
                  }`}
                  key={term.word}
                  onClick={() => {
                    setActiveTerm(term)
                    setFlipped((current) => ({ ...current, [term.word]: !current[term.word] }))
                  }}
                  type="button"
                >
                  <p className="text-lg font-semibold text-slate-950">{term.word}</p>
                  <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                    {isFlipped ? term.explanation : term.definition}
                  </p>
                  <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                    {isFlipped ? 'Explication' : 'Définition'}
                  </span>
                </button>
              )
            })}
          </HorizontalCarousel>
        </div>
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-blue-700">Carte sélectionnée</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-950">{activeTerm.word}</h3>
          <p className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-900">{activeTerm.definition}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{activeTerm.explanation}</p>
        </aside>
      </section>
      )}

      {sectionTab === 'signs' && (
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-700">Panneaux de signalisation</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-[1.65rem]">Les panneaux les plus rencontrés</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Faites défiler pour parcourir tous les panneaux →</p>
          </div>
          <p className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">{signs.length} panneaux à reconnaître</p>
        </div>

        <HorizontalCarousel ariaLabel="Panneaux de signalisation — galerie défilable">
          {signs.map((sign, index) => (
            <article
              key={sign.type}
              lang="fr"
              className="group flex w-[16.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_-18px_rgba(15,23,42,0.35)] sm:w-[18rem]"
            >
              <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.18]"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 18% 22%, rgba(15,23,42,0.18) 0, transparent 38%), radial-gradient(circle at 82% 78%, rgba(15,23,42,0.12) 0, transparent 45%)',
                  }}
                />
                <span className="absolute left-3 top-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={`absolute right-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${accentBadge[sign.accent]}`}
                  style={{ letterSpacing: '0.04em' }}
                >
                  {sign.category}
                </span>
                <div className="relative grid h-28 w-28 place-items-center transition duration-300 group-hover:scale-105">
                  <SignVisual type={sign.type} size="lg" />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-left text-base font-semibold leading-snug text-slate-950">{sign.name}</h3>
                <p className="text-left text-sm leading-6 text-slate-600">{sign.explanation}</p>
              </div>
            </article>
          ))}
        </HorizontalCarousel>
      </section>
      )}

      {sectionTab === 'quiz' && (
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7" lang="fr">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-700">Quiz aléatoire</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-[1.65rem]">Quiz QCU aléatoire</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{QUIZ_SAMPLE_SIZE} questions tirées au hasard parmi {quiz.length}. Une seule bonne réponse par question.</p>
          </div>
          {session && !finished && (
            <p className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">Question {Math.min(currentIndex + 1, session.length)} / {session.length}</p>
          )}
        </div>

        {!session && (
          <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-3xl">🎯</div>
            <h3 className="mt-5 text-xl font-semibold text-slate-950">Prêt pour le défi ?</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Vocabulaire auto-école et panneaux mélangés. {QUIZ_SAMPLE_SIZE} questions à choix unique, ordre et propositions aléatoires.</p>
            <button
              type="button"
              onClick={startQuiz}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
            >
              Lancer le quiz aléatoire
            </button>
          </div>
        )}

        {currentQuestion && (
          <div className="mt-6">
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            <article className="rounded-xl border border-slate-300 bg-slate-50/70 p-5 sm:p-6">
              {currentQuestion.visualType && (
                <div className="mb-5 grid place-items-center rounded-xl bg-white p-5 shadow-inner">
                  <SignVisual type={currentQuestion.visualType} size="lg" />
                </div>
              )}
              <h3
                className="text-left text-lg font-semibold text-slate-950 sm:text-xl"
                style={{ overflowWrap: 'break-word', wordBreak: 'normal', hyphens: 'manual', letterSpacing: 'normal', lineHeight: '1.35' }}
              >
                {currentIndex + 1}. {currentQuestion.question}
              </h3>

              <div className="mt-5 grid gap-2.5">
                {currentQuestion.choices.map((choice) => {
                  const isSelected = selectedChoice === choice
                  const isCorrect = choice === currentQuestion.answer
                  const showResult = Boolean(selectedChoice)
                  let style = 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                  if (showResult) {
                    if (isCorrect) style = 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    else if (isSelected) style = 'border-rose-300 bg-rose-50 text-rose-900'
                    else style = 'border-slate-300 bg-white text-slate-500'
                  }
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handleSelect(choice)}
                      disabled={showResult}
                      className={`rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition ${style}`}
                      style={{ overflowWrap: 'break-word', wordBreak: 'normal', hyphens: 'manual', letterSpacing: 'normal', lineHeight: '1.45' }}
                    >
                      {choice}
                    </button>
                  )
                })}
              </div>

              {selectedChoice && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    className={`text-sm font-semibold ${
                      selectedChoice === currentQuestion.answer ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {selectedChoice === currentQuestion.answer ? '✓ Bonne réponse' : `✗ Mauvaise réponse — la bonne réponse est : ${currentQuestion.answer}`}
                  </p>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                  >
                    {currentIndex + 1 >= session.length ? 'Voir le score' : 'Question suivante'} →
                  </button>
                </div>
              )}
            </article>
          </div>
        )}

        {finished && session && (
          <div className="mt-6 grid place-items-center rounded-xl border border-slate-300 bg-gradient-to-br from-blue-50 via-white to-sky-50 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-blue-700">Score final</p>
            <p className="mt-3 text-5xl font-semibold text-slate-950">{score} <span className="text-slate-400">/ {session.length}</span></p>
            <p className="mt-2 text-base font-semibold text-slate-600">{percentage} % de bonnes réponses</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
              {percentage >= 80
                ? 'Excellent ! Tu maîtrises bien le lexique et les panneaux.'
                : percentage >= 50
                  ? 'Bon début. Revois les définitions et panneaux puis recommence le quiz.'
                  : 'Pas de panique. Relis les cartes et les panneaux puis relance le quiz pour progresser.'}
            </p>
            <button
              type="button"
              onClick={startQuiz}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:shadow-xl active:scale-[0.98]"
            >
              Recommencer un quiz aléatoire
            </button>
          </div>
        )}
      </section>
      )}
    </div>
  )
}
