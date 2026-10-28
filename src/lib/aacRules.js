/** Règles métier AAC (conduite accompagnée) — France. */

export const AAC_KM_TARGET = 3000
export const AAC_MIN_AGE = 17
/** Service-Public : 2 rendez-vous pédagogiques obligatoires, un supplémentaire possible. */
export const AAC_REQUIRED_RVP_COUNT = 2
export const AAC_MAX_RVP_COUNT = 20
export const AAC_STATUS = {
  en_cours: 'en_cours',
  conditions_remplies: 'conditions_remplies',
  terminee: 'terminee',
}

export const AAC_STATUS_LABELS = {
  en_cours: 'En cours',
  conditions_remplies: 'Conditions remplies',
  terminee: 'Terminée',
}

export function addYears(dateInput, years) {
  if (!dateInput) return null
  const d = dateInput instanceof Date ? new Date(dateInput) : parseLocalDate(dateInput)
  if (!d || Number.isNaN(d.getTime())) return null
  const next = new Date(d)
  next.setFullYear(next.getFullYear() + years)
  return formatIsoDate(next)
}

export function addOneYear(dateInput) {
  return addYears(dateInput, 1)
}

/**
 * Date à partir de laquelle l'examen est possible : la plus tardive entre la fin de
 * l'année de conduite accompagnée et les 17 ans de l'élève.
 * `reason` vaut 'age' quand c'est l'âge qui repousse la date.
 */
export function examEligibleDate({ startedAt, birthDate }) {
  const yearDate = addOneYear(startedAt)
  const ageDate = addYears(birthDate, AAC_MIN_AGE)
  if (!yearDate) return { date: null, reason: null, ageDate }
  if (ageDate && ageDate > yearDate) return { date: ageDate, reason: 'age', ageDate }
  return { date: yearDate, reason: 'year', ageDate }
}

export function parseLocalDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function formatIsoDate(date) {
  if (!date || Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateFr(value) {
  const d = parseLocalDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR')
}

export function daysBetween(start, end = new Date()) {
  const a = parseLocalDate(start)
  const b = end instanceof Date ? end : parseLocalDate(end)
  if (!a || !b) return null
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.floor(ms / 86400000)
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function ageOnDate(birthDate, onDate = new Date()) {
  const birth = parseLocalDate(birthDate)
  const on = onDate instanceof Date ? onDate : parseLocalDate(onDate)
  if (!birth || !on) return null
  let age = on.getFullYear() - birth.getFullYear()
  const m = on.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && on.getDate() < birth.getDate())) age -= 1
  return age
}

export function yearCompleted(startedAt, onDate = new Date()) {
  const eligible = addOneYear(startedAt)
  if (!eligible) return false
  const on = onDate instanceof Date ? onDate : parseLocalDate(onDate)
  const el = parseLocalDate(eligible)
  if (!on || !el) return false
  return startOfDay(on).getTime() >= startOfDay(el).getTime()
}

export function kmProgress(kmTotal, target = AAC_KM_TARGET) {
  const km = Number(kmTotal) || 0
  const pct = Math.min(100, Math.round((km / target) * 100))
  return {
    km,
    target,
    remaining: Math.max(0, Math.round((target - km) * 10) / 10),
    percent: pct,
  }
}

export function evaluateAacConditions({
  startedAt,
  kmTotal,
  birthDate,
  rvpCompletedCount,
  onDate = new Date(),
}) {
  const yearOk = yearCompleted(startedAt, onDate)
  const kmOk = (Number(kmTotal) || 0) >= AAC_KM_TARGET
  const age = ageOnDate(birthDate, onDate)
  const ageOk = age != null && age >= AAC_MIN_AGE
  const rvpOk = (Number(rvpCompletedCount) || 0) >= AAC_REQUIRED_RVP_COUNT
  const allMet = yearOk && kmOk && ageOk && rvpOk
  return {
    yearOk,
    kmOk,
    ageOk,
    rvpOk,
    allMet,
    age,
    eligibleAt: examEligibleDate({ startedAt, birthDate }).date,
  }
}

export function statusLabel(status) {
  return AAC_STATUS_LABELS[status] || status || '—'
}

export function isMandatoryRvpSequence(sequence) {
  const n = Number(sequence)
  return n >= 1 && n <= AAC_REQUIRED_RVP_COUNT
}

/** Seul le personnel gère les rendez-vous pédagogiques (identique à la RLS). */
export function canManageAacRvp(role) {
  return role === 'manager' || role === 'secretary' || role === 'teacher'
}

/** Seuls les rendez-vous 1 et 2 comptent pour la condition légale. */
export function countMandatoryRvpCompleted(rvp = []) {
  return (rvp || []).filter((row) => isMandatoryRvpSequence(row?.sequence) && row?.completed).length
}

export function rvpRequirementLabel(sequence) {
  const n = Number(sequence)
  if (n === 1) {
    return 'Obligatoire — entre 4 et 6 mois après l’attestation de fin de formation initiale'
  }
  if (n === 2) {
    return 'Obligatoire — lorsque 3 000 km ont été parcourus'
  }
  return 'Supplémentaire — sur conseil de l’enseignant, à la demande de l’élève ou de l’accompagnateur'
}

export function mandatoryRvpTitle(sequence) {
  return `RVP ${sequence} — ${rvpRequirementLabel(sequence)}`
}

/** Critères facultatifs saisis sur un trajet. Identifiants stables, libellés affichés. */
export const AAC_DRIVING_CONDITIONS = [
  { id: 'nuit', label: 'Conduite de nuit' },
  { id: 'pluie', label: 'Conduite sous la pluie' },
  { id: 'autoroute', label: 'Conduite sur autoroute' },
  { id: 'voie_rapide', label: 'Conduite sur voie rapide' },
  { id: 'agglomeration', label: 'Conduite en agglomération' },
  { id: 'hors_agglomeration', label: 'Conduite hors agglomération' },
  { id: 'circulation_dense', label: 'Circulation dense' },
  { id: 'mauvais_temps', label: 'Mauvais temps' },
  { id: 'conditions_difficiles', label: 'Conditions difficiles' },
]

export function drivingConditionLabel(id) {
  return AAC_DRIVING_CONDITIONS.find((item) => item.id === id)?.label || id
}
