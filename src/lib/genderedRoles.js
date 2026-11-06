/** Libellés de rôle conjugués selon le genre + initiales pour la sidebar. */

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculin' },
  { value: 'female', label: 'Féminin' },
]

const ROLE_LABELS = {
  student: { male: 'Élève', female: 'Élève' },
  teacher: { male: 'Enseignant', female: 'Enseignante' },
  secretary: { male: 'Secrétaire', female: 'Secrétaire' },
  manager: { male: 'Gérant', female: 'Gérante' },
  super_admin: { male: 'Super Admin', female: 'Super Admin' },
}

/**
 * @param {string} role
 * @param {'male'|'female'|null|undefined} gender
 */
export function roleLabelFor(role, gender) {
  const entry = ROLE_LABELS[role]
  if (!entry) return role || ''
  if (gender === 'female') return entry.female
  return entry.male
}

/** Initiales à partir d'un nom affiché (ex. "Dupont Marie" → "DM"). */
export function personInitials(fullName = '') {
  const parts = String(fullName)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function normalizeGender(value) {
  const g = String(value || '').trim().toLowerCase()
  if (g === 'male' || g === 'female') return g
  return null
}
