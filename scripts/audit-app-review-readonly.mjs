/**
 * Audit LECTURE SEULE — préparation App Review Apple (Pedagogia Drive)
 *
 * Ce script ne crée, ne supprime et ne modifie RIEN.
 * Il n'émet aucun INSERT / UPDATE / UPSERT / DELETE / RPC d'écriture,
 * aucune migration, aucune modification RLS, aucune modification de structure.
 *
 * Secrets :
 *   - lit SUPABASE_SERVICE_ROLE_KEY depuis l'environnement (jamais depuis le chat)
 *   - ne log jamais la clé, ni un fragment, ni sa longueur
 *   - n'écrit jamais la clé dans un fichier
 *
 * Usage (après validation du propriétaire) :
 *   npm run audit:app-review
 *
 * Prérequis : SUPABASE_URL (ou VITE_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY
 * déjà présentes dans l'environnement backend / .env.local (gitignored).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_PATH = join(ROOT, 'scripts/output/app-review-audit.txt')

const WRITE_METHODS = ['insert', 'update', 'upsert', 'delete']
const AUTH_WRITE_METHODS = ['createUser', 'deleteUser', 'updateUserById', 'inviteUserByEmail']

const ROLE_LABELS = {
  student: 'Élève',
  teacher: 'Enseignant',
  secretary: 'Secrétariat',
  manager: 'Gérant / Manager',
  super_admin: 'Super Admin',
}

const PROTECTED_EMAILS = new Set(['m.karfa@hotmail.com'])
const PROTECTED_EMAIL_DOMAINS = ['pedagogia-drive.fr']

const ORG_COUNT_TABLES = [
  'profiles',
  'students',
  'teachers',
  'secretaries',
  'appointments',
  'documents',
  'contracts',
  'payments',
  'conversations',
  'vehicles',
  'exams',
  'student_charter_acceptances',
  'student_initial_assessments',
  'student_lesson_observations',
  'pre_registrations',
]

function loadGitignoredEnv() {
  for (const name of ['.env.local', '.env']) {
    try {
      const text = readFileSync(join(ROOT, name), 'utf8')
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq <= 0) continue
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = value
      }
    } catch {
      // fichier absent : normal
    }
  }
}

function forbid(name) {
  return () => {
    throw new Error(`INTERDIT: ${name}() — ce script est strictement en lecture seule.`)
  }
}

function createReadOnlyAdmin(url, serviceKey) {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const originalFrom = admin.from.bind(admin)
  admin.from = (table) => {
    const query = originalFrom(table)
    for (const method of WRITE_METHODS) {
      query[method] = forbid(`from(${table}).${method}`)
    }
    return query
  }

  for (const method of AUTH_WRITE_METHODS) {
    admin.auth.admin[method] = forbid(`auth.admin.${method}`)
  }

  return admin
}

function hostOf(url) {
  try {
    return new URL(url).host
  } catch {
    return '(url invalide)'
  }
}

function fmtDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toISOString()
  } catch {
    return String(value)
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function roleLabel(role) {
  return ROLE_LABELS[role] || `Rôle inconnu (${role || 'vide'})`
}

function isProtectedEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  if (PROTECTED_EMAILS.has(normalized)) return true
  return PROTECTED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`))
}

function looksTechnical(email, role) {
  const normalized = normalizeEmail(email)
  if (role === 'super_admin') return true
  if (isProtectedEmail(normalized)) return true
  if (normalized.startsWith('noreply@') || normalized.startsWith('no-reply@')) return true
  if (normalized.startsWith('system@') || normalized.startsWith('admin@pedagogia')) return true
  return false
}

function looksDemoOrDisposable(email) {
  const normalized = normalizeEmail(email)
  return (
    normalized.endsWith('.local') ||
    normalized.includes('+demo') ||
    normalized.includes('+recette') ||
    normalized.includes('@example.') ||
    normalized.includes('@test.')
  )
}

async function listAllAuthUsers(admin) {
  const perPage = 200
  const users = []
  let page = 1

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Lecture auth.users impossible: ${error.message}`)
    const batch = data?.users ?? []
    users.push(...batch)
    if (batch.length < perPage) break
    page += 1
  }

  return users
}

async function selectAll(admin, table, columns) {
  const { data, error } = await admin.from(table).select(columns)
  if (error) throw new Error(`Lecture ${table} impossible: ${error.message}`)
  return data ?? []
}

async function countBy(admin, table, column, value) {
  const { count, error } = await admin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, value)

  if (error) {
    return { table, ok: false, count: null, error: error.message }
  }
  return { table, ok: true, count: count ?? 0, error: null }
}

function line(title, value) {
  return `${title}: ${value}`
}

function section(letter, title) {
  return [`\n${'='.repeat(72)}`, `${letter}. ${title}`, '='.repeat(72)].join('\n')
}

async function run() {
  loadGitignoredEnv()

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url) {
    console.error(
      'Variable SUPABASE_URL (ou VITE_SUPABASE_URL) absente. Aucune requête n’a été envoyée.',
    )
    process.exit(2)
  }
  if (!serviceKey) {
    console.error(
      'Variable SUPABASE_SERVICE_ROLE_KEY absente de l’environnement. Aucune requête n’a été envoyée. Ne transmettez jamais cette clé dans le chat.',
    )
    process.exit(2)
  }

  const admin = createReadOnlyAdmin(url, serviceKey)
  const generatedAt = new Date().toISOString()

  const [authUsers, profiles, organizations, superAdmins] = await Promise.all([
    listAllAuthUsers(admin),
    selectAll(admin, 'profiles', 'id, email, role, organization_id, created_at, first_name, last_name, is_active'),
    selectAll(admin, 'organizations', 'id, name, created_at, status, email, slug'),
    selectAll(admin, 'super_admins', 'profile_id, is_active, granted_at, granted_by'),
  ])

  const authById = new Map(authUsers.map((user) => [user.id, user]))
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const orgById = new Map(organizations.map((org) => [org.id, org]))
  const superAdminByProfileId = new Map(superAdmins.map((row) => [row.profile_id, row]))

  const byRole = new Map()
  for (const profile of profiles) {
    const role = profile.role || '(vide)'
    if (!byRole.has(role)) byRole.set(role, [])
    byRole.get(role).push(profile)
  }

  const orphanAuth = authUsers.filter((user) => !profileById.has(user.id))
  const orphanProfiles = profiles.filter((profile) => !authById.has(profile.id))

  const technical = []
  for (const profile of profiles) {
    const authUser = authById.get(profile.id)
    const email = profile.email || authUser?.email || ''
    if (looksTechnical(email, profile.role) || superAdminByProfileId.has(profile.id)) {
      technical.push({ profile, authUser, email, reason: 'super_admin / email protégé / technique' })
    }
  }
  for (const user of orphanAuth) {
    if (looksTechnical(user.email, null)) {
      technical.push({
        profile: null,
        authUser: user,
        email: user.email,
        reason: 'utilisateur Auth technique sans profil',
      })
    }
  }

  const orgCounts = new Map()
  for (const org of organizations) {
    const counts = []
    for (const table of ORG_COUNT_TABLES) {
      counts.push(await countBy(admin, table, 'organization_id', org.id))
    }
    orgCounts.set(org.id, counts)
  }

  const profilesByOrg = new Map()
  for (const profile of profiles) {
    const key = profile.organization_id || '(aucune organisation)'
    if (!profilesByOrg.has(key)) profilesByOrg.set(key, [])
    profilesByOrg.get(key).push(profile)
  }

  const deletionCandidates = []
  for (const profile of profiles) {
    const authUser = authById.get(profile.id)
    const email = normalizeEmail(profile.email || authUser?.email || '')
    const protectedAccount =
      profile.role === 'super_admin' ||
      superAdminByProfileId.has(profile.id) ||
      isProtectedEmail(email)

    if (protectedAccount) continue

    deletionCandidates.push({
      id: profile.id,
      email: email || '(sans email)',
      role: profile.role,
      organization: orgById.get(profile.organization_id)?.name || profile.organization_id || '—',
      hint: looksDemoOrDisposable(email) ? 'compte de démo / test probable' : 'compte métier existant',
    })
  }
  for (const user of orphanAuth) {
    const email = normalizeEmail(user.email)
    if (isProtectedEmail(email)) continue
    deletionCandidates.push({
      id: user.id,
      email: email || '(sans email)',
      role: '(aucun profil)',
      organization: '—',
      hint: 'utilisateur Auth orphelin',
    })
  }

  const report = []
  report.push('AUDIT LECTURE SEULE — Pedagogia Drive / préparation App Review Apple')
  report.push(line('Généré le', generatedAt))
  report.push(line('Projet', hostOf(url)))
  report.push(line('Clé service_role', 'présente (valeur masquée, jamais affichée)'))
  report.push(line('Mode', 'SELECT / listUsers uniquement — aucune écriture'))
  report.push('')
  report.push('Aucune création, suppression, mise à jour, migration, RLS ou structure n’a été effectuée.')

  report.push(section('A', 'Comptes par rôle'))
  report.push(line('auth.users (total)', authUsers.length))
  report.push(line('public.profiles (total)', profiles.length))
  report.push('')
  const roles = [...byRole.keys()].sort((a, b) => a.localeCompare(b))
  if (roles.length === 0) {
    report.push('Aucun profil trouvé.')
  }
  for (const role of roles) {
    const list = byRole.get(role)
    report.push(`\n— ${roleLabel(role)} : ${list.length}`)
    for (const profile of list.sort((a, b) => normalizeEmail(a.email).localeCompare(normalizeEmail(b.email)))) {
      const authUser = authById.get(profile.id)
      const email = profile.email || authUser?.email || '(sans email)'
      const org = orgById.get(profile.organization_id)
      report.push(
        `  • ${email} | id=${profile.id} | org=${org?.name || profile.organization_id || '—'} | créé=${fmtDate(profile.created_at)} | dernière connexion=${fmtDate(authUser?.last_sign_in_at)} | actif=${profile.is_active ?? '—'}`,
      )
    }
  }

  report.push(section('B', 'Organisations existantes'))
  if (organizations.length === 0) {
    report.push('Aucune organisation.')
  }
  for (const org of organizations.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
    report.push(`\n— ${org.name}`)
    report.push(`  id=${org.id}`)
    report.push(`  statut=${org.status || '—'}`)
    report.push(`  slug=${org.slug || '—'}`)
    report.push(`  email org=${org.email || '—'}`)
    report.push(`  créée=${fmtDate(org.created_at)}`)
    report.push('  volumes (comptage exact, sans lecture des lignes) :')
    for (const item of orgCounts.get(org.id) || []) {
      if (item.ok) {
        report.push(`    - ${item.table}: ${item.count}`)
      } else {
        report.push(`    - ${item.table}: non disponible (${item.error})`)
      }
    }
  }

  report.push(section('C', 'Comptes par organisation'))
  const orgKeys = [...profilesByOrg.keys()].sort((a, b) => {
    const nameA = a === '(aucune organisation)' ? a : orgById.get(a)?.name || a
    const nameB = b === '(aucune organisation)' ? b : orgById.get(b)?.name || b
    return String(nameA).localeCompare(String(nameB))
  })
  for (const key of orgKeys) {
    const orgName = key === '(aucune organisation)' ? key : orgById.get(key)?.name || key
    const list = profilesByOrg.get(key)
    report.push(`\n— ${orgName} (${list.length} compte${list.length > 1 ? 's' : ''})`)
    for (const profile of list.sort((a, b) => String(a.role).localeCompare(String(b.role)))) {
      const authUser = authById.get(profile.id)
      const email = profile.email || authUser?.email || '(sans email)'
      report.push(`  • [${roleLabel(profile.role)}] ${email} | id=${profile.id}`)
    }
  }

  report.push(section('D', 'Super Admins'))
  report.push(line('Lignes public.super_admins', superAdmins.length))
  report.push(line('Profils role=super_admin', (byRole.get('super_admin') || []).length))
  if (superAdmins.length === 0) {
    report.push('Aucun enregistrement dans public.super_admins.')
  }
  for (const row of superAdmins) {
    const profile = profileById.get(row.profile_id)
    const authUser = authById.get(row.profile_id)
    const email = profile?.email || authUser?.email || '(sans email)'
    report.push(`\n— ${email}`)
    report.push(`  profile_id=${row.profile_id}`)
    report.push(`  actif=${row.is_active ?? '—'}`)
    report.push(`  granted_at=${fmtDate(row.granted_at)}`)
    report.push(`  rôle profil=${profile?.role || '—'}`)
    report.push(`  organisation=${orgById.get(profile?.organization_id)?.name || profile?.organization_id || 'aucune (attendu pour Super Admin)'}`)
    report.push(`  à conserver: ${isProtectedEmail(email) || profile?.role === 'super_admin' ? 'OUI' : 'à confirmer'}`)
  }

  report.push(section('E', 'Comptes orphelins'))
  report.push(line('Auth sans profil', orphanAuth.length))
  for (const user of orphanAuth) {
    report.push(
      `  • ${user.email || '(sans email)'} | id=${user.id} | créé=${fmtDate(user.created_at)} | dernière connexion=${fmtDate(user.last_sign_in_at)}`,
    )
  }
  report.push(line('Profils sans utilisateur Auth', orphanProfiles.length))
  for (const profile of orphanProfiles) {
    report.push(
      `  • ${profile.email || '(sans email)'} | id=${profile.id} | rôle=${profile.role || '—'} | org=${profile.organization_id || '—'}`,
    )
  }
  if (orphanAuth.length === 0 && orphanProfiles.length === 0) {
    report.push('Aucun orphelin détecté.')
  }

  report.push(section('F', 'Comptes techniques à protéger'))
  report.push('Règles appliquées : Super Admin, m.karfa@hotmail.com, domaine pedagogia-drive.fr, emails système.')
  report.push('Le compte Apple Developer / Apple Account n’est PAS stocké dans cette base : il ne peut pas être listé ici et ne doit pas être touché.')
  if (technical.length === 0) {
    report.push('Aucun compte technique identifié par les heuristiques ci-dessus.')
  }
  for (const item of technical) {
    report.push(`  • ${item.email || '(sans email)'} | ${item.reason} | id=${item.profile?.id || item.authUser?.id}`)
  }

  report.push(section('G', 'Résumé des éléments qui pourraient éventuellement être supprimés plus tard'))
  report.push('CECI N’EST PAS une liste de suppression. Rien n’a été ni ne sera supprimé par ce script.')
  report.push('Les comptes protégés (Super Admin / emails techniques) sont exclus.')
  report.push(line('Candidats éventuels (hors comptes protégés)', deletionCandidates.length))
  for (const item of deletionCandidates) {
    report.push(`  • ${item.email} | ${roleLabel(item.role)} | org=${item.organization} | ${item.hint} | id=${item.id}`)
  }
  report.push('')
  report.push('Prochaine étape possible (uniquement après validation explicite) :')
  report.push('  - ne rien supprimer tant que ce rapport n’a pas été relu')
  report.push('  - ne pas créer encore l’organisation / les comptes de démo Apple Review')

  const text = `${report.join('\n')}\n`
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, text, 'utf8')

  console.log(text)
  console.log(`Rapport également écrit dans ${OUTPUT_PATH} (fichier gitignored, sans secret).`)
}

run().catch((error) => {
  console.error('Audit interrompu (aucune écriture effectuée).')
  console.error(error instanceof Error ? error.message : 'erreur inconnue')
  process.exit(1)
})
