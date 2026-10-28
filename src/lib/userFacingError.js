/** Messages par défaut selon le contexte métier. */
export const ERROR_CONTEXT = {
  login: 'Adresse e-mail ou mot de passe incorrect.',
  signup: 'Inscription impossible. Veuillez réessayer dans quelques instants.',
  invite: 'L\'invitation n\'a pas pu être envoyée. Veuillez réessayer dans quelques instants.',
  createStudent: 'La création de l\'élève a échoué. Veuillez réessayer.',
  practiceExam: 'L\'examen blanc n\'a pas pu être enregistré. Veuillez réessayer.',
  messaging: 'L\'envoi du message a échoué. Veuillez réessayer.',
  document: 'Le document n\'a pas pu être enregistré. Veuillez réessayer.',
  export: 'L\'export a échoué. Veuillez réessayer.',
  save: 'Enregistrement impossible. Veuillez réessayer.',
  saveSimulator: 'Le simulateur n\'a pas pu être enregistré. Réessayez dans quelques instants.',
  load: 'Chargement impossible. Veuillez réessayer.',
  password: 'Le mot de passe n\'a pas pu être mis à jour. Veuillez réessayer.',
  permission: 'Vous n\'avez pas les autorisations nécessaires pour effectuer cette action.',
  generic: 'Une erreur inattendue est survenue. Veuillez réessayer.',
}

const EXACT_RULES = [
  { pattern: /^invalid login credentials\.?$/i, message: ERROR_CONTEXT.login },
  { pattern: /^invalid email or password\.?$/i, message: ERROR_CONTEXT.login },
  { pattern: /^user already registered\.?$/i, message: 'Un compte existe déjà avec cette adresse e-mail.' },
  { pattern: /^email already (registered|in use)\.?$/i, message: 'Un compte existe déjà avec cette adresse e-mail.' },
  { pattern: /^email not confirmed\.?$/i, message: 'Veuillez confirmer votre adresse e-mail avant de vous connecter.' },
  { pattern: /^user not found\.?$/i, message: 'Aucun compte trouvé avec cette adresse e-mail.' },
  { pattern: /^compte désactivé\.?$/i, message: 'Votre compte est désactivé. Contactez votre auto-école.' },
  { pattern: /^compte en lecture seule/i, message: null, passthrough: true },
  { pattern: /^non authentifié\.?$/i, message: 'Votre session a expiré. Veuillez vous reconnecter.' },
]

const CONTAINS_RULES = [
  {
    pattern: /email rate limit|over_email_send_rate_limit|rate limit exceeded|only request this after|too many requests|\b429\b/i,
    message: 'Trop d’e-mails envoyés en peu de temps. Patientez une heure avant de réessayer.',
  },
  {
    pattern: /email address .*(not authorized|invalid)|not authorized to send|email_address_not_authorized|email_address_invalid/i,
    message: 'Le service d’envoi refuse cette adresse e-mail. Vérifiez qu’elle existe et peut recevoir des e-mails.',
  },
  {
    pattern: /error sending (recovery|reset|confirmation) email|smtp/i,
    message: 'L’e-mail n’a pas pu être envoyé par le service de messagerie. Réessayez plus tard.',
  },
  {
    pattern: /failed to fetch|networkerror|network request failed|load failed|net::/i,
    message: null,
    network: true,
  },
  {
    pattern: /dynamically imported module|import\(\)/i,
    message: null,
    exportChunk: true,
  },
  {
    pattern: /edge function|non-2xx status|functionsfetcherror|functionsrelayerror|failed to send a request to the edge function/i,
    message: null, // résolu selon le contexte
    edgeFunction: true,
  },
  {
    pattern: /permission denied|row-level security|42501|not authorized|insufficient privilege|action réservée/i,
    message: ERROR_CONTEXT.permission,
  },
  {
    pattern: /jwt expired|invalid jwt|token expired|session expired|refresh token/i,
    message: 'Votre session a expiré. Veuillez vous reconnecter.',
  },
  {
    pattern: /invalid login credentials|invalid email or password/i,
    message: ERROR_CONTEXT.login,
  },
  {
    pattern: /user already registered|already been registered|duplicate key.*email|email.*already exists/i,
    message: 'Un compte existe déjà avec cette adresse e-mail.',
  },
  {
    pattern: /password should be at least|weak password|password.*8/i,
    message: 'Le mot de passe doit contenir au moins 8 caractères, dont 1 majuscule, 1 minuscule et 1 chiffre.',
  },
  {
    pattern: /resource_type|save_teaching_resource|teaching_resource_type|simulator_sessions|list_organization_simulator_sessions|fiche ressource introuvable|column .* does not exist/i,
    message: 'La base de données doit être mise à jour. Contactez le support ou réessayez après migration Supabase.',
  },
  {
    pattern: /PGRST201|more than one relationship was found|Could not embed because/i,
    message: null,
    exportEmbed: true,
  },
  {
    pattern: /sqlstate|pgrst|postgres|duplicate key value|violates unique constraint|violates foreign key|syntax error at/i,
    message: ERROR_CONTEXT.generic,
  },
  {
    pattern: /unexpected error|internal server error|500|502|503|504/i,
    message: ERROR_CONTEXT.generic,
  },
  {
    pattern: /timeout|timed out|abort/i,
    message: 'La requête a pris trop de temps. Veuillez réessayer.',
  },
  {
    pattern: /storage.*object not found|bucket not found|payload too large|file too large/i,
    message: 'Le fichier n\'a pas pu être téléversé. Vérifiez le format et la taille.',
  },
]

const EDGE_FUNCTION_MESSAGES = {
  signup: ERROR_CONTEXT.signup,
  invite: ERROR_CONTEXT.invite,
  createStudent: ERROR_CONTEXT.createStudent,
  saveSimulator: ERROR_CONTEXT.saveSimulator,
  default: 'Le service est momentanément indisponible. Veuillez réessayer dans quelques instants.',
}

function resolveFallback(context) {
  if (typeof context === 'string' && ERROR_CONTEXT[context]) {
    return ERROR_CONTEXT[context]
  }
  if (typeof context === 'string' && context.length > 0) {
    return context
  }
  return ERROR_CONTEXT.generic
}

function extractRawMessage(error) {
  if (!error) return ''
  if (typeof error === 'string') return error.trim()
  if (typeof error.message === 'string') return error.message.trim()
  if (typeof error.error === 'string') return error.error.trim()
  if (typeof error.error_description === 'string') return error.error_description.trim()
  if (typeof error.details === 'string') return error.details.trim()
  return String(error).trim()
}

function isLikelyUserFrenchMessage(message) {
  if (!message || message.length > 280) return false
  if (/[{}[\]<>\\/`]|sqlstate|pgrst|postgres|jwt|supabase|function|fetch failed|error:/i.test(message)) {
    return false
  }
  return /[àâäéèêëïîôùûüç]|'est |'a pas |Veuillez|obligatoire|impossible|réservée|invalide|déjà|connecter|enregistr|envoy/i.test(message)
}

/**
 * Convertit une erreur technique en message clair en français pour l'utilisateur.
 * @param {unknown} error
 * @param {keyof typeof ERROR_CONTEXT | string} [context='generic']
 */
export function getUserFacingError(error, context = 'generic') {
  const raw = extractRawMessage(error)
  const fallback = resolveFallback(context)

  if (!raw) return fallback

  if (isLikelyUserFrenchMessage(raw)) return raw

  for (const rule of EXACT_RULES) {
    if (!rule.pattern.test(raw)) continue
    if (rule.passthrough) return raw
    return rule.message
  }

  for (const rule of CONTAINS_RULES) {
    if (!rule.pattern.test(raw)) continue
    if (rule.network) {
      return context === 'export'
        ? 'Le fichier n\'a pas pu être généré. Réessayez ou utilisez le format CSV.'
        : 'Impossible de contacter le serveur. Vérifiez votre connexion Internet.'
    }
    if (rule.exportChunk) {
      return context === 'export'
        ? 'Le fichier n\'a pas pu être généré. Réessayez ou utilisez le format CSV.'
        : 'Le module d\'export est indisponible. Rechargez la page puis réessayez.'
    }
    if (rule.exportEmbed) {
      return context === 'export'
        ? 'Le chargement des données d\'export a échoué. Rechargez la page (Cmd+Shift+R) puis réessayez.'
        : ERROR_CONTEXT.load
    }
    if (rule.edgeFunction) {
      return EDGE_FUNCTION_MESSAGES[context] || EDGE_FUNCTION_MESSAGES.default
    }
    if (rule.message) return rule.message
    continue
  }

  return fallback
}

/** Retourne une Error avec message utilisateur (pour les services). */
export function toUserError(error, context = 'generic') {
  return new Error(getUserFacingError(error, context))
}
