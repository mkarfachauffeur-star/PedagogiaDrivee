/**
 * Fiches récapitulatives des leçons de la compétence 1, en texte (voir LessonInfographic).
 * Elles reprennent le contenu des anciennes infographies (1024 × 682 px, illisibles sur
 * téléphone) dans un vocabulaire simple et conforme à l'enseignement de la conduite.
 */
import {
  ArrowLeftRight,
  CarFront,
  CircleGauge,
  CloudRain,
  Eye,
  Footprints,
  Gauge,
  Hand,
  MapPin,
  Settings2,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'

export const VEHICLE_ORGANS_INFOGRAPHIC = {
  title: 'Les éléments essentiels du véhicule',
  subtitle: 'Avant de prendre la route, je vérifie',
  sections: [
    {
      title: 'Les commandes',
      tone: 'blue',
      columns: 4,
      items: [
        { icon: CarFront, title: 'Le volant', text: 'Il sert à diriger le véhicule.' },
        { icon: Footprints, title: 'L’embrayage', text: 'Il sert à démarrer, à changer de vitesse et à s’arrêter sans caler.' },
        { icon: Footprints, title: 'Le frein', text: 'Il sert à ralentir et à arrêter le véhicule en sécurité.' },
        { icon: Footprints, title: 'L’accélérateur', text: 'Il sert à augmenter la vitesse.' },
      ],
    },
    {
      title: 'Les éléments extérieurs',
      tone: 'violet',
      columns: 4,
      items: [
        { icon: Eye, title: 'Les rétroviseurs', text: 'Ils permettent de voir derrière et sur les côtés.' },
        { icon: Eye, title: 'Les feux', text: 'Croisement ou route : ils permettent de voir et d’être vu.' },
        { icon: ArrowLeftRight, title: 'Les clignotants', text: 'Ils annoncent un changement de direction.' },
        { icon: CircleGauge, title: 'Les pneus', text: 'Ils assurent l’adhérence, la tenue de route et le freinage.' },
      ],
    },
    {
      title: 'La visibilité',
      tone: 'blue',
      columns: 1,
      items: [{ icon: CloudRain, title: 'Les essuie-glaces', text: 'Ils gardent une bonne visibilité sous la pluie. Des balais usés laissent des traces.' }],
    },
  ],
  tips: {
    title: 'Vérifications avant le départ',
    items: [
      'La pression des pneus, une fois par mois.',
      'L’état des feux et des clignotants.',
      'Les niveaux : huile, liquide de frein, lave-glace.',
      'Les rétroviseurs bien réglés.',
      'L’état des essuie-glaces.',
      'Les papiers du véhicule : carte grise, assurance, contrôle technique.',
    ],
  },
  note: 'Quelques minutes de vérification avant chaque trajet protègent tous les usagers.',
}

export const DRIVING_POSITION_INFOGRAPHIC = {
  title: 'Bien s’installer au poste de conduite',
  subtitle: 'Confort, sécurité, efficacité',
  sections: [
    {
      title: 'Le corps',
      tone: 'blue',
      items: [
        { icon: Settings2, title: 'Siège réglé', text: 'En hauteur, pour bien voir la route.' },
        { icon: Settings2, title: 'Dos bien appuyé', text: 'Le dos reste en contact avec le dossier.' },
        { icon: Settings2, title: 'Tête dégagée', text: 'Garder un petit espace entre la tête et le toit.' },
        { icon: Hand, title: 'Mains sur le volant', text: 'Position 9 h 15 ou 10 h 10.' },
        { icon: Footprints, title: 'Jambes légèrement pliées', text: 'Pouvoir enfoncer les pédales à fond sans tendre les jambes.' },
        { icon: Footprints, title: 'Pied droit libre', text: 'Passer facilement de l’accélérateur au frein.' },
      ],
    },
    {
      title: 'Les réglages',
      tone: 'emerald',
      items: [
        { icon: Eye, title: 'Rétroviseurs réglés', text: 'Bien voir l’arrière et les côtés.' },
        { icon: Hand, title: 'Distance du volant', text: 'Bras légèrement pliés, pour plus de confort et de sécurité.' },
        { icon: Footprints, title: 'Pédales accessibles', text: 'Appuyer sur les pédales sans bouger le bassin.' },
      ],
    },
  ],
  note: 'Bien installé, on est plus à l’aise, plus réactif et plus en sécurité.',
}

export const STEERING_WHEEL_INFOGRAPHIC = {
  title: 'Tenir et tourner le volant',
  sections: [
    {
      title: 'Position conseillée',
      tone: 'emerald',
      columns: 1,
      items: [{ icon: Hand, title: 'Mains à 9 h 15', text: 'Mains détendues, pouces posés sur le volant, regard loin devant.' }],
    },
    {
      title: 'Positions à éviter',
      tone: 'rose',
      columns: 4,
      items: [
        { icon: TriangleAlert, title: 'Mains croisées', text: 'Perte de contrôle et risque d’accident.' },
        { icon: TriangleAlert, title: 'Une seule main', text: 'Moins de précision, réactions plus lentes.' },
        { icon: TriangleAlert, title: 'Mains en haut (12 h)', text: 'Moins de force, et danger si l’airbag se déclenche.' },
        { icon: TriangleAlert, title: 'Mains trop basses', text: 'Moins de précision et moins de contrôle.' },
      ],
    },
  ],
  tips: {
    title: 'Conseils',
    items: [
      'Tirer le volant, ne jamais le pousser.',
      'Plus on roule vite, plus le volant est sensible.',
      'Faire des gestes souples et progressifs.',
      'Garder les deux mains sur le volant, sauf pour changer de vitesse.',
      'Le volant accompagne la trajectoire du véhicule.',
    ],
  },
}

export const START_STOP_INFOGRAPHIC = {
  title: 'Démarrer et s’arrêter',
  subtitle: 'Des gestes simples pour une conduite sûre',
  sections: [
    {
      title: 'Les bons gestes',
      tone: 'emerald',
      items: [
        { number: 1, title: 'Démarrer en douceur', text: 'Relâcher l’embrayage doucement et accélérer un peu.' },
        { number: 2, title: 'S’arrêter en sécurité', text: 'Freiner progressivement, s’arrêter, puis garder le pied sur le frein.' },
        { number: 3, title: 'Maîtriser le point de patinage', text: 'Trouver le moment où la voiture commence à avancer, puis le contrôler en douceur.' },
      ],
    },
    {
      title: 'À éviter',
      tone: 'rose',
      items: [
        { icon: TriangleAlert, title: 'Lâcher l’embrayage d’un coup', text: 'Le moteur cale et la voiture fait des à-coups.' },
        { icon: TriangleAlert, title: 'Forcer sur le levier', text: 'Le levier de vitesse se manie avec des gestes souples.' },
        { icon: TriangleAlert, title: 'Freiner brutalement', text: 'Risque de perdre l’adhérence, et inconfort pour les passagers.' },
      ],
    },
    {
      title: 'Les deux façons de freiner',
      tone: 'blue',
      columns: 2,
      items: [
        {
          title: 'Freinage progressif',
          lines: [
            { icon: Gauge, label: 'Geste', text: 'Freiner doucement au début, puis appuyer de plus en plus.' },
            { icon: MapPin, label: 'Exemple', text: 'À l’approche d’un feu rouge ou d’un ralentissement.' },
          ],
        },
        {
          title: 'Freinage dégressif',
          lines: [
            { icon: Gauge, label: 'Geste', text: 'Freiner fort au début, puis relâcher petit à petit.' },
            { icon: MapPin, label: 'Exemple', text: 'Pour ralentir vite face à un obstacle soudain, en gardant le contrôle.' },
          ],
        },
      ],
    },
  ],
  note: 'Bien maîtriser le point de patinage, c’est la clé d’un démarrage réussi.',
}

export const GEARBOX_INFOGRAPHIC = {
  title: 'Utiliser la boîte de vitesses',
  subtitle: 'Maîtrise, souplesse, sécurité, économie',
  sections: [
    {
      title: 'Les rapports (repères)',
      tone: 'blue',
      items: [
        { number: 1, title: '1re', text: 'Démarrer, manœuvrer (0 à 20 km/h).' },
        { number: 2, title: '2e', text: 'Accélérer, rouler en ville (15 à 30 km/h).' },
        { number: 3, title: '3e', text: 'Rouler sur route (25 à 50 km/h).' },
        { number: 4, title: '4e', text: 'Rouler à allure soutenue (40 à 80 km/h).' },
        { number: 5, title: '5e', text: 'Rouler sur voie rapide, économiser (plus de 80 km/h).' },
        { number: 'R', title: 'Marche arrière', text: 'Reculer, à très faible allure.' },
      ],
    },
    {
      title: 'Passer une vitesse',
      tone: 'emerald',
      items: [
        { number: 1, title: 'Débrayer', text: 'Appuyer à fond sur la pédale d’embrayage.' },
        { number: 2, title: 'Changer de rapport', text: 'Déplacer le levier doucement, sans forcer.' },
        { number: 3, title: 'Embrayer en douceur', text: 'Relâcher doucement l’embrayage en accélérant un peu.' },
      ],
    },
    {
      title: 'À éviter',
      tone: 'rose',
      columns: 4,
      items: [
        { icon: TriangleAlert, title: 'Garder le pied sur l’embrayage', text: 'L’embrayage s’use trop vite.' },
        { icon: TriangleAlert, title: 'Forcer le levier', text: 'La boîte de vitesses s’abîme.' },
        { icon: TriangleAlert, title: 'Faire hurler le moteur', text: 'Il faut passer la vitesse supérieure.' },
        { icon: TriangleAlert, title: 'Descendre une côte au point mort', text: 'On perd le frein moteur : c’est dangereux.' },
      ],
    },
  ],
  tips: {
    title: 'Conseils pratiques',
    items: [
      'Choisir le rapport selon la vitesse, la charge et la pente.',
      'Monter les rapports tôt, rétrograder avant que le moteur force.',
      'Moteur qui broute (sous-régime) : rétrograder.',
      'Moteur qui hurle (sur-régime) : passer la vitesse supérieure.',
      'Une conduite souple, c’est moins d’usure et moins de carburant.',
    ],
  },
  note: 'Le bon rapport, au bon moment : observer, choisir, passer en douceur, adapter sa conduite.',
}

export const FORWARD_REVERSE_INFOGRAPHIC = {
  title: 'Marche avant et marche arrière',
  sections: [
    {
      title: 'Marche avant',
      tone: 'blue',
      items: [
        { icon: Eye, title: 'Regarder loin devant', text: 'Pour anticiper la route et les obstacles.' },
        { icon: Hand, title: 'Mains sur le volant', text: 'Position 9 h 15.' },
        { icon: MapPin, title: 'Trajectoire stable', text: 'Rester dans sa voie, à droite.' },
      ],
    },
    {
      title: 'Marche arrière',
      tone: 'violet',
      items: [
        { icon: Eye, title: 'Les rétroviseurs', text: 'S’en servir pour se guider.' },
        { icon: Eye, title: 'Les côtés et l’arrière', text: 'Vérifier qu’il n’y a personne avant et pendant la manœuvre.' },
        { icon: Gauge, title: 'Allure très faible', text: 'Avancer doucement, sans à-coups.' },
      ],
    },
    {
      title: 'Les points clés',
      tone: 'emerald',
      items: [
        { icon: CarFront, title: 'Maîtriser le véhicule', text: 'Bien tenir le volant pour rester serein.' },
        { icon: Gauge, title: 'Adapter son allure', text: 'Rouler doucement pour garder le contrôle.' },
        { icon: Eye, title: 'Anticiper', text: 'Regarder loin pour réagir à temps.' },
        { icon: MapPin, title: 'Rester dans sa voie', text: 'Garder une trajectoire stable et régulière.' },
        { icon: Eye, title: 'Contrôler autour de soi', text: 'Vérifier les angles morts et que la zone est libre.' },
        { icon: ShieldCheck, title: 'Agir en sécurité', text: 'Des gestes précis pour une manœuvre maîtrisée.' },
      ],
    },
  ],
  note: 'Une conduite sûre repose sur l’anticipation, la maîtrise du véhicule et l’attention aux autres.',
}

export const OBSERVATION_INFOGRAPHIC = {
  title: 'Regarder autour de soi et avertir',
  sections: [
    {
      title: 'Les 4 étapes',
      tone: 'blue',
      columns: 4,
      items: [
        { number: 1, title: 'Observer', text: 'Regarder loin devant, sur les côtés et autour de soi.' },
        { number: 2, title: 'Contrôler', text: 'Vérifier les rétroviseurs et les angles morts.' },
        { number: 3, title: 'Avertir', text: 'Mettre le clignotant pour annoncer son intention.' },
        { number: 4, title: 'Agir en sécurité', text: 'Réaliser la manœuvre en surveillant les autres usagers.' },
      ],
    },
  ],
  tips: {
    title: 'À retenir',
    items: [
      'Observer avant d’agir.',
      'Contrôler les rétroviseurs et les angles morts.',
      'Le clignotant informe, il ne donne pas la priorité.',
      'Le klaxon : seulement en cas de danger.',
    ],
  },
}

