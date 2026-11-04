import { REMC_COMPETENCY_ORDER } from './remcCompetencies'

/** Modules pédagogiques (QCU) rattachés à chaque compétence REMC. */
export const LESSON_MODULE_IDS_BY_COMPETENCY = {
  C1: ['SC1.1', 'SC1.2', 'SC1.3', 'SC1.4', 'SC1.5', 'SC1.6', 'SC1.7', 'SC1.8'],
  C2: ['SC2.1', 'SC2.2', 'SC2.3', 'SC2.4', 'SC2.5', 'SC2.6', 'SC2.7'],
  C3: ['SC3.1', 'SC3.2', 'SC3.3', 'SC3.4', 'SC3.5', 'SC3.6', 'SC3.7'],
  C4: ['SC4.1', 'SC4.2', 'SC4.3', 'SC4.4', 'SC4.5', 'SC4.6', 'SC4.7'],
}

/** Clés localStorage des modules avec contenu pédagogique publié. */
export const LESSON_MODULE_STORAGE_KEYS = {
  'SC1.1': 'pedagogia:lesson:vehicle-organs',
  'SC1.2': 'pedagogia:lesson:driving-position',
  'SC1.3': 'pedagogia:lesson:steering-wheel',
  'SC1.4': 'pedagogia:lesson:start-stop',
  'SC1.5': 'pedagogia:lesson:acceleration-braking',
  'SC1.6': 'pedagogia:lesson:gearbox',
  'SC1.7': 'pedagogia:lesson:forward-reverse',
  'SC1.8': 'pedagogia:lesson:observation-warning',
  'SC2.1': 'pedagogia:lesson:c2-signalisation',
  'SC2.2': 'pedagogia:lesson:c2-positionnement',
  'SC2.3': 'pedagogia:lesson:c2-allure',
  'SC2.4': 'pedagogia:lesson:c2-intersections',
  'SC2.5': 'pedagogia:lesson:c2-tourner',
  'SC2.6': 'pedagogia:lesson:c2-giratoires',
  'SC2.7': 'pedagogia:lesson:c2-stationnement',
}

export function lessonModuleIdsForCompetency(code) {
  return LESSON_MODULE_IDS_BY_COMPETENCY[code] || []
}

export { REMC_COMPETENCY_ORDER }
