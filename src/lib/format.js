/** Formats d'affichage communs à tous les espaces (français, fuseau du navigateur). */

const EMPTY = '—'

const euroWhole = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const euroCents = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const number = new Intl.NumberFormat('fr-FR')
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 1 188 € ou 99,50 € ; `fromCents` pour les montants stockés en centimes. */
export function formatEuros(value, { fromCents = false } = {}) {
  const parsed = toNumber(value)
  if (parsed === null) return EMPTY
  const euros = fromCents ? parsed / 100 : parsed
  return Number.isInteger(euros) ? euroWhole.format(euros) : euroCents.format(euros)
}

/** 1 234 */
export function formatNumber(value) {
  const parsed = toNumber(value)
  return parsed === null ? EMPTY : number.format(parsed)
}

/** 12,5 % — la valeur est déjà exprimée en pourcentage. */
export function formatPercent(value) {
  const parsed = toNumber(value)
  return parsed === null ? EMPTY : `${decimal.format(parsed)} %`
}

/** 4,6 / 5 */
export function formatRating(value) {
  const parsed = toNumber(value)
  return parsed === null ? EMPTY : `${decimal.format(parsed)} / 5`
}

/** 25/10/2026 */
export function formatDate(value) {
  const date = toDate(value)
  return date ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : EMPTY
}

/** 25/10/2026 à 14:05 */
export function formatDateTime(value) {
  const date = toDate(value)
  if (!date) return EMPTY
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${formatDate(date)} à ${time}`
}
