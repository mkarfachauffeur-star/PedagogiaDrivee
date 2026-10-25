/**
 * Comptes de test et de démonstration, exclus par défaut des indicateurs et des listes du Super Admin.
 *
 * Un marquage explicite dans `subscriptions.metadata.is_test` (case « Compte de test » de la page
 * Abonnements) l'emporte toujours. À défaut, on reconnaît les comptes créés pour les tests
 * (noms « TEST-… », adresses en .local, compte de démonstration utilisé pour la revue Apple).
 */

const NAME_PATTERNS = [/^test[\s_-]/i, /isolation/i, /d[ée]monstration/i, /\bdebug\b/i, /\bga4\b/i]
const EMAIL_PATTERNS = [/\.local$/i, /apple-review/i]

function matches(patterns, value) {
  const text = String(value || '').trim()
  return Boolean(text) && patterns.some((pattern) => pattern.test(text))
}

function subscriptionOf(org) {
  return Array.isArray(org?.subscriptions) ? org.subscriptions[0] : org?.subscriptions
}

/** `sub` facultatif : sinon lu dans `org.subscriptions`. */
export function isTestOrganization(org, sub = subscriptionOf(org)) {
  const flag = sub?.metadata?.is_test
  if (flag === true || flag === false) return flag
  return matches(NAME_PATTERNS, org?.name) || matches(EMAIL_PATTERNS, org?.email)
}

export function isTestProspect(prospect) {
  return (
    matches(NAME_PATTERNS, prospect?.school_name)
    || matches(NAME_PATTERNS, prospect?.contact_name)
    || matches(EMAIL_PATTERNS, prospect?.email)
  )
}

export function isTestProfile(profile, testOrganizationIds = new Set()) {
  return testOrganizationIds.has(profile?.organization?.id) || matches(EMAIL_PATTERNS, profile?.email)
}
