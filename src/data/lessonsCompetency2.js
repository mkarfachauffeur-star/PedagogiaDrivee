/**
 * Compétence 2 du REMC — « Appréhender la route et circuler dans des conditions normales ».
 * Un module par sous-compétence officielle (C2a à C2g) : leçon courte + 10 questions.
 * Chaque question n'a qu'une seule bonne réponse ; les autres choix sont clairement faux.
 */

/** Même format que les questions de la compétence 1 : l'ordre des choix est mélangé. */
function q(question, correct, wrong, explanation) {
  const choices = [correct, ...wrong].map((choice, index) => ({ choice, correct: index === 0 }))
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]]
  }
  return {
    question,
    choices: choices.map((item) => item.choice),
    answer: choices.findIndex((item) => item.correct),
    explanation,
  }
}

const signalisationModule = {
  id: 'SC2.1',
  storageKey: 'pedagogia:lesson:c2-signalisation',
  title: 'Rechercher la signalisation et les indices utiles',
  intro:
    'Lire la route, c’est repérer tôt les panneaux, les marquages, les feux et les indices laissés par l’environnement, puis en tenir compte dans sa conduite.',
  summary: [
    {
      title: 'Les formes des panneaux',
      description:
        'Triangle : danger. Rond à bord rouge : interdiction. Rond bleu : obligation. Carré ou rectangle : indication. Octogone rouge : STOP. Triangle pointe en bas : cédez le passage. Losange jaune : route prioritaire.',
    },
    {
      title: 'Les marquages au sol',
      description:
        'Une ligne continue ne se franchit pas et ne se chevauche pas. Une ligne discontinue peut être franchie. Une ligne d’annonce, aux traits plus longs, prévient qu’une ligne continue arrive.',
    },
    {
      title: 'Les feux tricolores',
      description:
        'Rouge : arrêt obligatoire. Orange fixe : arrêt, sauf si l’arrêt est dangereux. Vert : passage possible si la voie est libre. Orange clignotant : prudence, les règles de priorité s’appliquent.',
    },
    {
      title: 'L’ordre d’importance',
      description:
        'Les gestes d’un agent priment sur les feux, les feux sur les panneaux, les panneaux sur les règles générales. Les panneaux temporaires (fond jaune) priment sur les panneaux permanents.',
    },
    {
      title: 'Les indices utiles',
      description:
        'Un ballon sur la chaussée, un bus à l’arrêt, une sortie d’école ou des feux stop allumés devant annoncent un danger possible. Les repérer tôt permet d’anticiper.',
    },
  ],
  safetyAdvice: [
    'Regarder loin pour lire les panneaux à temps.',
    'Rechercher les indices : piétons, enfants, véhicules qui manœuvrent.',
    'Respecter d’abord l’agent, puis les feux, puis les panneaux.',
    'Adapter sa conduite avant d’arriver sur le danger, pas sur place.',
  ],
  questions: [
    q('Un panneau en forme de triangle, pointe en haut, annonce :', 'Un danger', ['Une obligation', 'Une indication de direction', 'La fin d’une interdiction'], 'Les panneaux triangulaires (pointe en haut) annoncent un danger.'),
    q('Un panneau rond à fond bleu indique :', 'Une obligation', ['Un danger', 'Une interdiction', 'Une route prioritaire'], 'Le rond bleu impose une obligation (direction, voie réservée, vitesse minimale…).'),
    q('Un panneau rond à bord rouge indique :', 'Une interdiction', ['Une obligation', 'Une indication', 'Un danger proche'], 'Le rond à bord rouge signale une interdiction.'),
    q('Le panneau STOP a une forme :', 'Octogonale', ['Triangulaire', 'Ronde', 'Carrée'], 'Le STOP est le seul panneau octogonal : on le reconnaît même de dos ou enneigé.'),
    q('Une ligne continue au sol :', 'Ne doit être ni franchie ni chevauchée', ['Peut être franchie pour dépasser', 'Peut être chevauchée si la voie est libre', 'Annonce simplement une intersection'], 'La ligne continue interdit de la franchir comme de la chevaucher.'),
    q('Une ligne d’annonce (traits longs et rapprochés) signale :', 'Qu’une ligne continue va commencer', ['Que l’on peut stationner', 'Une voie réservée aux bus', 'La fin d’une agglomération'], 'La ligne d’annonce prévient l’arrivée d’une ligne continue : il faut terminer ou abandonner son dépassement.'),
    q('Au feu orange fixe, le conducteur doit :', 'S’arrêter, sauf si l’arrêt est dangereux', ['Accélérer pour passer avant le rouge', 'Continuer sans ralentir', 'Klaxonner pour prévenir'], 'L’orange fixe impose l’arrêt, sauf si le conducteur ne peut plus s’arrêter en sécurité.'),
    q('Un agent de circulation fait signe de passer alors que le feu est rouge. Que faites-vous ?', 'J’obéis à l’agent et je passe prudemment', ['Je reste arrêté car le feu est rouge', 'Je fais demi-tour', 'J’attends que le feu passe au vert'], 'Les gestes d’un agent priment sur les feux et les panneaux.'),
    q('Un panneau temporaire à fond jaune contredit un panneau permanent. Lequel respectez-vous ?', 'Le panneau temporaire jaune', ['Le panneau permanent', 'Le plus grand des deux', 'Aucun des deux'], 'La signalisation temporaire (travaux, déviation) prime sur la signalisation permanente.'),
    q('Un ballon roule sur la chaussée devant vous. C’est surtout un indice :', 'Qu’un enfant peut surgir pour le récupérer', ['Que la route est glissante', 'Qu’un feu va passer au rouge', 'Que la vitesse maximale augmente'], 'Un ballon annonce souvent un enfant qui court derrière : ralentir et se tenir prêt à freiner.'),
  ],
}

const positionnementModule = {
  id: 'SC2.2',
  storageKey: 'pedagogia:lesson:c2-positionnement',
  title: 'Positionner le véhicule et choisir sa voie',
  intro:
    'Bien se placer sur la chaussée rend le conducteur prévisible, lui donne de la marge de sécurité et lui permet de préparer chaque manœuvre.',
  summary: [
    {
      title: 'Circuler à droite',
      description:
        'En France, on circule sur la partie droite de la chaussée, en gardant une marge avec le bord (trottoir, accotement, véhicules stationnés).',
    },
    {
      title: 'Les routes à plusieurs voies',
      description:
        'Hors agglomération, on utilise la voie la plus à droite ; les voies de gauche servent à dépasser. En agglomération, on choisit la voie selon la direction que l’on va prendre.',
    },
    {
      title: 'Les marges latérales',
      description:
        'Pour dépasser un piéton ou un cycliste, il faut laisser au moins 1 m en agglomération et 1,50 m hors agglomération.',
    },
    {
      title: 'Les voies réservées',
      description:
        'Les voies réservées aux bus ou aux vélos, signalées par un marquage ou un panneau, sont interdites aux voitures.',
    },
    {
      title: 'Garder sa voie',
      description:
        'Dans un virage, on reste dans sa voie sans couper la trajectoire. On évite les changements de voie inutiles ou de dernière minute.',
    },
  ],
  safetyAdvice: [
    'Garder une marge avec les véhicules stationnés : une portière peut s’ouvrir.',
    'Choisir sa voie tôt, en lisant les panneaux de direction.',
    'Ne pas couper les virages.',
    'Rester sur la voie de droite quand on ne dépasse pas.',
  ],
  questions: [
    q('En France, de quel côté de la chaussée circule-t-on ?', 'À droite', ['À gauche', 'Au milieu', 'Là où il y a le moins de trafic'], 'La règle de base est de circuler sur la partie droite de la chaussée.'),
    q('Sur une route hors agglomération à deux voies dans votre sens, vous ne dépassez personne. Quelle voie utilisez-vous ?', 'La voie de droite', ['La voie de gauche', 'Celle où la chaussée est la plus lisse', 'Indifféremment l’une ou l’autre'], 'Hors agglomération, on circule sur la voie de droite ; la voie de gauche sert au dépassement.'),
    q('Quelle distance latérale minimale faut-il laisser en agglomération pour dépasser un cycliste ?', '1 mètre', ['50 centimètres', '3 mètres', 'Aucune distance minimale'], 'En agglomération, on laisse au moins 1 m (1,50 m hors agglomération).'),
    q('Et hors agglomération, pour dépasser un cycliste ?', '1,50 mètre', ['1 mètre', '50 centimètres', '5 mètres'], 'Hors agglomération, la distance latérale minimale est de 1,50 m.'),
    q('Une voie marquée « BUS » est réservée. Une voiture peut-elle y circuler ?', 'Non, sauf si un panneau l’autorise', ['Oui, si elle va plus vite que les bus', 'Oui, aux heures creuses', 'Oui, pour doubler une file'], 'Les voies réservées sont interdites aux voitures, sauf indication contraire.'),
    q('Pourquoi garder une marge avec les véhicules en stationnement ?', 'Parce qu’une portière peut s’ouvrir ou un piéton surgir', ['Pour rouler plus vite', 'Pour pouvoir stationner plus tard', 'Pour éviter les nids-de-poule'], 'Une portière ou un piéton entre deux voitures sont des dangers fréquents en ville.'),
    q('Dans un virage à droite, le conducteur doit :', 'Rester dans sa voie sans couper le virage', ['Se décaler vers l’axe pour mieux voir', 'Rouler à cheval sur la ligne', 'Couper le virage pour aller plus vite'], 'Couper un virage expose à un choc frontal avec un véhicule venant en face.'),
    q('En agglomération, sur une chaussée à plusieurs voies dans le même sens, on choisit sa voie :', 'Selon la direction que l’on va prendre', ['Toujours à gauche', 'Au hasard', 'Selon la couleur des véhicules'], 'En agglomération, on se place tôt dans la voie qui correspond à sa direction.'),
    q('Des flèches au sol indiquent « tout droit » sur votre voie. Pouvez-vous tourner à gauche depuis cette voie ?', 'Non, il faut suivre la direction indiquée par la flèche', ['Oui, si personne ne vient', 'Oui, avec le clignotant', 'Oui, uniquement la nuit'], 'Les flèches de sélection imposent la direction à suivre depuis la voie.'),
    q('Pourquoi éviter un changement de voie au dernier moment ?', 'Parce qu’il surprend les autres usagers et crée un risque de collision', ['Parce qu’il use les pneus', 'Parce qu’il est interdit par temps sec', 'Parce qu’il fait caler le moteur'], 'Un conducteur prévisible est un conducteur sûr : on choisit sa voie à l’avance.'),
  ],
}

const allureModule = {
  id: 'SC2.3',
  storageKey: 'pedagogia:lesson:c2-allure',
  title: 'Adapter son allure aux situations',
  intro:
    'La vitesse maximale autorisée n’est pas une vitesse conseillée : on adapte son allure à la visibilité, à la météo, au trafic et à l’état de la route.',
  summary: [
    {
      title: 'Les limites de base',
      description:
        'En agglomération : 50 km/h. Sur autoroute : 130 km/h, ramenés à 110 km/h par temps de pluie. Quand la visibilité est inférieure à 50 m, la vitesse est limitée à 50 km/h partout.',
    },
    {
      title: 'La distance de sécurité',
      description:
        'On garde au moins 2 secondes avec le véhicule de devant. On repère un point fixe : il ne faut pas l’atteindre avant d’avoir compté « 1 001, 1 002 ».',
    },
    {
      title: 'La distance d’arrêt',
      description:
        'Distance d’arrêt = distance parcourue pendant le temps de réaction (environ 1 seconde) + distance de freinage. Sur route mouillée, la distance de freinage augmente fortement.',
    },
    {
      title: 'Adapter sans attendre',
      description:
        'Pluie, brouillard, nuit, travaux, sortie d’école ou trafic dense : on réduit son allure avant d’y être, pas au dernier moment.',
    },
  ],
  safetyAdvice: [
    'Garder au moins 2 secondes de distance, davantage sous la pluie.',
    'Ralentir avant les virages et les intersections, pas pendant.',
    'Regarder loin pour anticiper les ralentissements.',
    'Lever le pied dès qu’un doute apparaît.',
  ],
  questions: [
    q('Quelle est la vitesse maximale en agglomération, sauf indication contraire ?', '50 km/h', ['30 km/h', '70 km/h', '90 km/h'], 'En agglomération, la vitesse est limitée à 50 km/h, sauf panneau contraire (zone 30, par exemple).'),
    q('Sur autoroute, par temps de pluie, la vitesse maximale est de :', '110 km/h', ['130 km/h', '90 km/h', '70 km/h'], 'Par temps de pluie, la vitesse sur autoroute passe de 130 à 110 km/h.'),
    q('Quand la visibilité est inférieure à 50 mètres, la vitesse est limitée à :', '50 km/h, sur toutes les routes', ['70 km/h sur autoroute', '90 km/h hors agglomération', 'Aucune limite particulière'], 'Par visibilité inférieure à 50 m (brouillard, neige…), la limite est de 50 km/h partout.'),
    q('Quel écart minimal garder avec le véhicule de devant ?', 'Au moins 2 secondes', ['Au moins 1 mètre', 'Une demi-seconde', 'La longueur d’une voiture'], 'Deux secondes laissent le temps de réagir et de freiner.'),
    q('La distance d’arrêt correspond à :', 'La distance parcourue pendant le temps de réaction plus la distance de freinage', ['La distance de freinage seule', 'La distance entre deux feux', 'La longueur du véhicule'], 'Pendant le temps de réaction, le véhicule roule encore à pleine vitesse avant que le freinage commence.'),
    q('Sur route mouillée, la distance de freinage :', 'Augmente fortement', ['Diminue', 'Reste identique', 'Dépend seulement de la couleur des pneus'], 'L’eau réduit l’adhérence : la distance de freinage peut presque doubler.'),
    q('À l’approche d’une sortie d’école, le conducteur doit :', 'Ralentir et se tenir prêt à s’arrêter', ['Klaxonner pour prévenir les enfants', 'Accélérer pour passer vite', 'Changer de voie sans regarder'], 'Les enfants sont imprévisibles : on réduit son allure et on surveille les abords.'),
    q('La vitesse indiquée sur un panneau correspond à :', 'Une vitesse maximale, à adapter aux conditions', ['Une vitesse à atteindre obligatoirement', 'Une vitesse minimale', 'Une vitesse conseillée la nuit uniquement'], 'C’est un maximum : la situation peut imposer de rouler moins vite.'),
    q('Avant un virage serré, quand faut-il ralentir ?', 'Avant d’entrer dans le virage', ['Au milieu du virage', 'À la sortie du virage', 'Il ne faut pas ralentir'], 'On adapte sa vitesse en ligne droite, avant le virage, pour le négocier sans freiner fort.'),
    q('Le temps de réaction moyen d’un conducteur attentif est d’environ :', '1 seconde', ['0,1 seconde', '5 secondes', '10 secondes'], 'Environ 1 seconde, davantage en cas de fatigue, d’alcool ou de distraction.'),
  ],
}

const intersectionsModule = {
  id: 'SC2.4',
  storageKey: 'pedagogia:lesson:c2-intersections',
  title: 'Détecter et franchir les intersections',
  intro:
    'Identifier tôt une intersection et son régime de priorité permet d’arriver à la bonne vitesse et de décider en sécurité.',
  summary: [
    {
      title: 'La priorité à droite',
      description:
        'Sans panneau, ni feu, ni marquage, la règle est la priorité à droite : on cède le passage aux véhicules qui arrivent par la droite.',
    },
    {
      title: 'Le STOP',
      description:
        'Arrêt obligatoire à la ligne, roues immobiles, même si personne ne vient. On repart seulement après avoir cédé le passage à tous les usagers.',
    },
    {
      title: 'Le cédez-le-passage',
      description:
        'On ralentit, on cède le passage et on s’arrête seulement si nécessaire. Si la voie est libre, on peut repartir sans s’arrêter.',
    },
    {
      title: 'La route prioritaire',
      description:
        'Le losange jaune indique que l’on est prioritaire aux intersections suivantes. Il faut rester prudent : un autre usager peut ne pas respecter sa priorité.',
    },
    {
      title: 'Observer avant de franchir',
      description:
        'À chaque intersection, on regarde à gauche, à droite, puis de nouveau à gauche, et on contrôle les piétons et les cyclistes.',
    },
  ],
  safetyAdvice: [
    'Repérer les panneaux d’intersection de loin.',
    'Arriver à une allure qui permet de s’arrêter.',
    'Ne jamais s’engager si l’on ne peut pas dégager l’intersection.',
    'Même prioritaire, rester prêt à freiner.',
  ],
  questions: [
    q('À une intersection sans panneau, sans feu et sans marquage, la règle est :', 'La priorité à droite', ['La priorité à gauche', 'La priorité au plus rapide', 'La priorité au véhicule le plus gros'], 'Sans signalisation, on cède le passage aux véhicules venant de droite.'),
    q('Au panneau STOP, le conducteur doit :', 'Marquer un arrêt complet à la ligne, puis céder le passage', ['Ralentir sans s’arrêter si personne ne vient', 'Klaxonner puis passer', 'S’arrêter seulement si un véhicule arrive'], 'L’arrêt au STOP est obligatoire, roues immobiles, même si la voie semble libre.'),
    q('Au panneau « cédez le passage », si la voie est libre, le conducteur :', 'Peut passer sans s’arrêter', ['Doit obligatoirement s’arrêter', 'Doit attendre 5 secondes', 'Doit faire un appel de phares'], 'Le cédez-le-passage impose de ralentir et de céder, mais pas de s’arrêter si personne ne vient.'),
    q('Le panneau en losange jaune indique :', 'Que vous circulez sur une route prioritaire', ['La fin d’une route prioritaire', 'Un danger de chaussée glissante', 'Une zone de travaux'], 'Le losange jaune signale une route prioritaire aux prochaines intersections.'),
    q('Un panneau triangulaire avec une croix noire annonce :', 'Une intersection où la priorité à droite s’applique', ['Un passage à niveau', 'Un hôpital', 'La fin de toutes les interdictions'], 'Ce panneau rappelle qu’à la prochaine intersection, on cède le passage à droite.'),
    q('Vous êtes prioritaire, mais un véhicule s’engage devant vous. Que faites-vous ?', 'Je freine pour éviter la collision', ['Je garde ma vitesse car j’ai la priorité', 'J’accélère pour passer avant lui', 'Je klaxonne sans ralentir'], 'La priorité ne protège pas d’un accident : on évite toujours la collision.'),
    q('Peut-on s’engager dans une intersection si l’on risque d’y rester bloqué ?', 'Non, il faut pouvoir la dégager', ['Oui, si le feu est vert', 'Oui, si l’on est prioritaire', 'Oui, aux heures de pointe'], 'Il est interdit de s’engager si l’on risque d’immobiliser son véhicule dans l’intersection.'),
    q('Avant de franchir une intersection, dans quel ordre regarder ?', 'À gauche, à droite, puis de nouveau à gauche', ['Uniquement devant', 'Uniquement à droite', 'Dans le rétroviseur intérieur seulement'], 'Le dernier regard à gauche vérifie qu’aucun véhicule ne s’est rapproché entre-temps.'),
    q('À un feu orange clignotant, quelle règle s’applique ?', 'Prudence, et les règles de priorité (panneaux ou priorité à droite)', ['Arrêt obligatoire comme au rouge', 'Priorité absolue pour vous', 'Interdiction de tourner'], 'L’orange clignotant demande de la prudence : on applique les panneaux ou, à défaut, la priorité à droite.'),
    q('À l’approche d’une intersection, pourquoi ralentir ?', 'Pour avoir le temps d’observer et de s’arrêter si besoin', ['Pour économiser du carburant', 'Parce que le moteur risque de chauffer', 'Pour laisser passer les véhicules derrière'], 'Une allure réduite laisse le temps d’analyser la situation et de réagir.'),
  ],
}

const tournerModule = {
  id: 'SC2.5',
  storageKey: 'pedagogia:lesson:c2-tourner',
  title: 'Tourner à droite et à gauche en agglomération',
  intro:
    'Tourner, c’est préparer à l’avance : observer, signaler, se placer, ralentir, puis céder le passage à ceux qui y ont droit.',
  summary: [
    {
      title: 'Préparer',
      description:
        'On contrôle les rétroviseurs et l’angle mort, on met le clignotant suffisamment tôt, puis on se place et on ralentit.',
    },
    {
      title: 'Tourner à droite',
      description:
        'On se place près du bord droit, on surveille les cyclistes qui peuvent remonter à droite, et on cède le passage aux piétons qui traversent la rue où l’on s’engage.',
    },
    {
      title: 'Tourner à gauche sur une route à double sens',
      description:
        'On se rapproche de l’axe médian, sans le franchir. On cède le passage aux véhicules qui arrivent en face et qui vont tout droit ou tournent à droite.',
    },
    {
      title: 'Tourner à gauche depuis un sens unique',
      description:
        'On se place à gauche de la chaussée, puis on tourne en cédant le passage aux piétons.',
    },
  ],
  safetyAdvice: [
    'Clignotant au moins quelques secondes avant de tourner.',
    'Toujours contrôler l’angle mort, surtout à droite (cyclistes).',
    'Céder le passage aux piétons qui traversent la rue que l’on prend.',
    'Ne pas couper le virage en tournant à gauche.',
  ],
  questions: [
    q('Dans quel ordre préparer un changement de direction ?', 'Rétroviseurs et angle mort, clignotant, placement, ralentissement', ['Ralentissement, puis clignotant au moment de tourner', 'Clignotant seulement, sans regarder', 'Placement, puis rétroviseurs une fois engagé'], 'On observe d’abord, on avertit ensuite, puis on se place et on adapte son allure.'),
    q('Pour tourner à droite, où se placer ?', 'Près du bord droit de la chaussée', ['Au milieu de la chaussée', 'Près de l’axe médian', 'Sur la voie de gauche'], 'On se rapproche du bord droit pour tourner sans gêner ni surprendre.'),
    q('En tournant à droite, quel usager surveiller particulièrement dans l’angle mort ?', 'Le cycliste qui peut se trouver sur votre droite', ['Le véhicule qui arrive en face', 'Le bus arrêté de l’autre côté', 'Le conducteur qui vous suit à 50 m'], 'Un cycliste peut remonter à droite et se retrouver dans l’angle mort au moment où vous tournez.'),
    q('En tournant, vous rencontrez des piétons qui traversent la rue dans laquelle vous vous engagez. Vous devez :', 'Leur céder le passage', ['Passer avant eux en klaxonnant', 'Les contourner par le trottoir', 'Passer car vous étiez engagé'], 'Les piétons qui traversent la chaussée où l’on s’engage ont la priorité.'),
    q('Pour tourner à gauche sur une route à double sens, où se placer ?', 'Près de l’axe médian, sans le franchir', ['Près du bord droit', 'Sur la voie de circulation d’en face', 'Sur le trottoir'], 'On se rapproche de l’axe pour libérer la voie aux véhicules qui continuent tout droit.'),
    q('Vous tournez à gauche. Un véhicule arrive en face et va tout droit. Qui passe en premier ?', 'Le véhicule d’en face', ['Vous, car vous avez mis le clignotant', 'Le plus rapide des deux', 'Celui qui klaxonne'], 'Celui qui tourne à gauche cède le passage aux véhicules venant en face.'),
    q('Pour tourner à gauche depuis une rue à sens unique, où se placer ?', 'À gauche de la chaussée', ['À droite de la chaussée', 'Au milieu, à cheval sur deux voies', 'Là où il y a de la place'], 'Sur un sens unique, on se place à gauche pour tourner à gauche.'),
    q('Quand mettre le clignotant avant de tourner ?', 'Suffisamment tôt pour que les autres comprennent votre intention', ['Seulement au moment de tourner le volant', 'Après avoir tourné', 'Jamais en agglomération'], 'Le clignotant doit informer à l’avance, sans être mis trop tôt au point de prêter à confusion.'),
    q('Le clignotant donne-t-il la priorité pour tourner ?', 'Non, il informe seulement de votre intention', ['Oui, dans tous les cas', 'Oui, en agglomération', 'Oui, s’il est mis assez tôt'], 'Le clignotant est une information, pas une priorité.'),
    q('En tournant à gauche, pourquoi ne pas couper le virage ?', 'Pour ne pas empiéter sur la voie des véhicules qui arrivent', ['Pour économiser du carburant', 'Pour aller plus vite', 'Parce que le volant ne tourne pas assez'], 'Couper le virage fait passer le véhicule sur la voie des usagers qui sortent de la rue.'),
  ],
}

const giratoireModule = {
  id: 'SC2.6',
  storageKey: 'pedagogia:lesson:c2-giratoires',
  title: 'Franchir les ronds-points et carrefours giratoires',
  intro:
    'Dans un carrefour à sens giratoire, on cède le passage à ceux qui y circulent déjà, on tourne autour de l’îlot central par la droite et on signale sa sortie.',
  summary: [
    {
      title: 'L’entrée',
      description:
        'Le panneau « carrefour à sens giratoire » associé au « cédez le passage » impose de laisser passer les véhicules déjà engagés sur l’anneau.',
    },
    {
      title: 'Le sens de circulation',
      description:
        'On contourne l’îlot central par la droite : on tourne donc dans le sens inverse des aiguilles d’une montre.',
    },
    {
      title: 'Le choix de la voie',
      description:
        'Pour la première sortie, on reste à droite. Pour une sortie plus éloignée, on peut utiliser la voie de gauche de l’anneau, puis on revient à droite avant de sortir.',
    },
    {
      title: 'La sortie',
      description:
        'On met le clignotant droit juste après avoir dépassé la sortie qui précède la sienne, et on surveille piétons et cyclistes en sortant.',
    },
  ],
  safetyAdvice: [
    'Ralentir avant l’entrée et regarder à gauche.',
    'Ne pas entrer si un véhicule arrive sur l’anneau.',
    'Clignotant droit avant de sortir.',
    'Surveiller les deux-roues, souvent mal placés dans l’anneau.',
  ],
  questions: [
    q('À l’entrée d’un carrefour giratoire signalé par un « cédez le passage », qui est prioritaire ?', 'Les véhicules qui circulent déjà sur l’anneau', ['Vous, car vous arrivez par la droite', 'Le véhicule le plus rapide', 'Celui qui sort à la première sortie'], 'Le cédez-le-passage à l’entrée donne la priorité aux véhicules engagés sur l’anneau.'),
    q('Dans un carrefour giratoire, on contourne l’îlot central :', 'Par la droite', ['Par la gauche', 'Par le côté le plus court', 'Comme on veut'], 'On contourne l’îlot par la droite, donc dans le sens inverse des aiguilles d’une montre.'),
    q('Pour prendre la première sortie, quelle voie utiliser dans l’anneau ?', 'La voie de droite', ['La voie de gauche', 'La voie du milieu', 'Celle où il y a le moins de monde'], 'Pour la première sortie, on reste sur la voie de droite.'),
    q('Quand mettre le clignotant droit pour sortir ?', 'Après avoir dépassé la sortie qui précède la vôtre', ['Dès l’entrée dans le giratoire', 'Après être sorti', 'Jamais dans un giratoire'], 'Le clignotant droit annonce votre sortie sans faire croire aux autres que vous sortez plus tôt.'),
    q('Avant d’entrer dans le giratoire, de quel côté regarder en priorité ?', 'À gauche, d’où arrivent les véhicules de l’anneau', ['À droite uniquement', 'Derrière vous', 'Sur le tableau de bord'], 'Les véhicules prioritaires de l’anneau arrivent par votre gauche.'),
    q('Vous visez une sortie éloignée dans un giratoire à deux voies. Où pouvez-vous circuler ?', 'Sur la voie de gauche, puis revenir à droite avant de sortir', ['Sur la voie de droite en coupant les sorties', 'Sur l’îlot central', 'En sens inverse pour gagner du temps'], 'La voie de gauche permet de laisser sortir les autres ; on revient à droite en temps utile.'),
    q('En sortant d’un giratoire, que surveillez-vous en particulier ?', 'Les piétons et les cyclistes sur la voie de sortie', ['Le compteur de vitesse', 'La radio', 'Les véhicules garés à 200 m'], 'Les passages piétons sont souvent placés juste après la sortie.'),
    q('Pouvez-vous vous arrêter sur l’anneau d’un giratoire pour laisser entrer un véhicule ?', 'Non, sauf nécessité absolue', ['Oui, par politesse', 'Oui, si vous mettez les feux de détresse', 'Oui, à chaque entrée'], 'S’arrêter sur l’anneau surprend les conducteurs qui suivent et bloque la circulation.'),
    q('Un véhicule est déjà engagé sur l’anneau et arrive vers vous. Que faites-vous ?', 'J’attends qu’il passe avant d’entrer', ['J’entre en accélérant', 'Je klaxonne pour qu’il ralentisse', 'Je fais un appel de phares et j’entre'], 'On laisse passer les véhicules engagés, puis on entre.'),
    q('Dans un giratoire, les deux-roues :', 'Peuvent se trouver sur n’importe quelle partie de l’anneau : il faut les surveiller', ['Sont interdits', 'Roulent toujours au centre', 'Sont toujours prioritaires sur tout le monde'], 'Les deux-roues sont vulnérables et parfois mal visibles : surveillez rétroviseurs et angles morts.'),
  ],
}

const stationnementModule = {
  id: 'SC2.7',
  storageKey: 'pedagogia:lesson:c2-stationnement',
  title: 'S’arrêter et stationner',
  intro:
    'S’arrêter ou stationner, c’est choisir un emplacement autorisé, se garer sans gêner, puis repartir après avoir tout contrôlé.',
  summary: [
    {
      title: 'Arrêt ou stationnement',
      description:
        'L’arrêt est une immobilisation de courte durée, le conducteur restant à proximité. Le stationnement est une immobilisation plus longue, conducteur absent ou non.',
    },
    {
      title: 'Les trois façons de se garer',
      description:
        'En créneau (parallèle au trottoir), en bataille (perpendiculaire) et en épi (en oblique).',
    },
    {
      title: 'Où c’est interdit',
      description:
        'Sur un passage piéton, sur un trottoir, sur une piste cyclable, devant une sortie de garage ou sur un emplacement réservé : ces stationnements sont dangereux ou gênants.',
    },
    {
      title: 'En pente',
      description:
        'On serre le frein à main, on engage une vitesse et on tourne les roues vers le trottoir pour que le véhicule ne puisse pas descendre sur la chaussée.',
    },
    {
      title: 'Ouvrir la portière et repartir',
      description:
        'Avant d’ouvrir, on contrôle le rétroviseur et on regarde derrière : un cycliste peut arriver. Pour repartir : rétroviseurs, angle mort, clignotant, puis on s’insère.',
    },
  ],
  safetyAdvice: [
    'Choisir une place autorisée, sans gêner piétons ni cyclistes.',
    'Contrôler derrière avant d’ouvrir la portière.',
    'Frein à main serré et vitesse engagée à l’arrêt.',
    'Angle mort et clignotant avant de repartir.',
  ],
  questions: [
    q('Quelle est la différence entre un arrêt et un stationnement ?', 'L’arrêt est bref, conducteur à proximité ; le stationnement dure plus longtemps', ['Il n’y a aucune différence', 'L’arrêt est toujours interdit en ville', 'Le stationnement se fait moteur allumé'], 'L’arrêt est une immobilisation momentanée ; au-delà, on parle de stationnement.'),
    q('Se garer parallèlement au trottoir, entre deux véhicules, s’appelle :', 'Un créneau', ['Une bataille', 'Un épi', 'Un demi-tour'], 'Le créneau se fait parallèlement au bord de la chaussée.'),
    q('Se garer perpendiculairement au trottoir s’appelle :', 'Un stationnement en bataille', ['Un créneau', 'Un stationnement en épi', 'Un arrêt'], 'En bataille, le véhicule est perpendiculaire au bord de la chaussée.'),
    q('Se garer en oblique par rapport au trottoir s’appelle :', 'Un stationnement en épi', ['Un créneau', 'Un stationnement en bataille', 'Un rangement en file'], 'En épi, le véhicule est placé en oblique.'),
    q('Peut-on stationner sur un passage piéton ?', 'Non, c’est interdit', ['Oui, pour moins de 5 minutes', 'Oui, avec les feux de détresse', 'Oui, la nuit'], 'Stationner sur un passage piéton est interdit et dangereux : les piétons ne sont plus visibles.'),
    q('Les feux de détresse autorisent-ils à s’arrêter sur une piste cyclable ?', 'Non, ils n’autorisent jamais un arrêt interdit', ['Oui, pour quelques minutes', 'Oui, si l’on reste dans la voiture', 'Oui, pour livrer'], 'Les feux de détresse signalent un danger ; ils ne rendent pas un arrêt autorisé.'),
    q('Vous stationnez en descente, le long d’un trottoir. Comment orienter les roues avant ?', 'Vers le trottoir', ['Vers le milieu de la chaussée', 'Droites, dans l’axe', 'Peu importe'], 'Roues vers le trottoir : si le véhicule bouge, il est retenu par la bordure.'),
    q('Avant d’ouvrir votre portière côté chaussée, que faites-vous ?', 'Je contrôle le rétroviseur et je regarde derrière', ['J’ouvre rapidement pour gêner le moins longtemps', 'Je klaxonne', 'Je mets les feux de détresse et j’ouvre'], 'Un cycliste ou un véhicule peut arriver : on vérifie avant d’ouvrir.'),
    q('Pour repartir d’une place de stationnement, dans quel ordre agir ?', 'Rétroviseurs, angle mort, clignotant, puis s’insérer', ['Clignotant, puis partir sans regarder', 'Accélérer fortement pour s’insérer vite', 'Klaxonner puis partir'], 'On observe, on avertit, puis on s’insère en cédant le passage aux usagers qui circulent.'),
    q('Peut-on stationner devant l’entrée d’un garage qui n’est pas le sien ?', 'Non, c’est un stationnement gênant', ['Oui, si le garage est fermé', 'Oui, pour moins d’une heure', 'Oui, le dimanche'], 'Bloquer une entrée de garage est un stationnement gênant, verbalisable.'),
  ],
}

export const COMPETENCY_2_LESSON_MODULES = [
  signalisationModule,
  positionnementModule,
  allureModule,
  intersectionsModule,
  tournerModule,
  giratoireModule,
  stationnementModule,
]
