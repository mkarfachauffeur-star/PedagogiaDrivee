import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatPersonName } from '../lib/staffAccounts'
import { fetchExportStudents } from './adminExports'
import { listTeachers } from './teachers'
import { formatRecommendedHours } from '../lib/initialAssessmentUtils'
import {
  downloadBlob,
  downloadProfessionalCsv,
  downloadXlsxSheet,
  formatAmount,
  formatDateFr,
  formatGeneratedAt,
  splitFullName,
  timestampForFilename,
} from '../utils/csvExport'

export const REGULATORY_EXPORTS = {
  students: {
    id: 'students',
    title: 'Élèves',
    description: 'Registre des dossiers élèves — une ligne par élève.',
    filenamePrefix: 'reglementaire-eleves',
    sheetName: 'Élèves',
  },
  teachers: {
    id: 'teachers',
    title: 'Enseignants',
    description: 'Registre du personnel enseignant et autorisations.',
    filenamePrefix: 'reglementaire-enseignants',
    sheetName: 'Enseignants',
  },
  lessons: {
    id: 'lessons',
    title: 'Leçons',
    description: 'Journal des leçons réalisées — une ligne par leçon.',
    filenamePrefix: 'reglementaire-lecons',
    sheetName: 'Leçons',
  },
  payments: {
    id: 'payments',
    title: 'Paiements',
    description: 'Registre des encaissements sur la période.',
    filenamePrefix: 'reglementaire-paiements',
    sheetName: 'Paiements',
  },
  contracts: {
    id: 'contracts',
    title: 'Contrats',
    description: 'Registre des contrats de formation élève.',
    filenamePrefix: 'reglementaire-contrats',
    sheetName: 'Contrats',
  },
  vehicles: {
    id: 'vehicles',
    title: 'Véhicules',
    description: 'Parc automobile de l\'établissement.',
    filenamePrefix: 'reglementaire-vehicules',
    sheetName: 'Véhicules',
  },
}

export const STUDENT_HEADERS = [
  'N° dossier',
  'Nom',
  'Prénom',
  'Date de naissance',
  'Adresse',
  'Code postal',
  'Ville',
  'Téléphone',
  'Email',
  'NEPH',
  'Date inscription',
  'Formule',
  'Statut',
  'Enseignant référent',
  'Date évaluation de départ',
  'Volume prévisionnel recommandé',
]

export const TEACHER_HEADERS = [
  'Nom',
  'Prénom',
  'Email',
  'Téléphone',
  'N° autorisation d\'enseigner',
  'Date de validité',
  'Catégories autorisées',
  'Date d\'affectation',
]

export const LESSON_HEADERS = [
  'Date',
  'Heure début',
  'Heure fin',
  'Élève',
  'Enseignant',
  'Véhicule',
  'Durée',
  'Compétence REMC travaillée',
  'Observations',
]

export const PAYMENT_HEADERS = [
  'Élève',
  'Date',
  'Montant',
  'Mode de paiement',
  'N° reçu',
  'Référence',
  'Commentaire',
]

export const CONTRACT_HEADERS = [
  'N° contrat',
  'Élève',
  'Date signature',
  'Formule',
  'Montant total',
  'Statut',
]

export const VEHICLE_HEADERS = [
  'Immatriculation',
  'Marque',
  'Modèle',
  'Énergie',
  'Date mise en circulation',
  'Assurance',
  'Date expiration assurance',
]

function referentTeacherName(student) {
  const assignments = student?.student_assignments || []
  const referent = assignments.find((row) => row.is_referent) || assignments[0]
  return referent?.teacher?.full_name || ''
}

function studentFullName(student) {
  if (!student) return ''
  return formatPersonName(student)
}

function vehicleLabel(vehicle) {
  if (!vehicle) return ''
  return [vehicle.plate, vehicle.brand, vehicle.model].filter(Boolean).join(' · ')
}

function parseDurationToMinutes(duration = '') {
  const text = String(duration).trim().toLowerCase()
  if (!text) return 0
  const hoursMatch = text.match(/(\d+(?:[.,]\d+)?)\s*h/)
  const minsMatch = text.match(/(\d+)\s*min/)
  let total = 0
  if (hoursMatch) total += Number(hoursMatch[1].replace(',', '.')) * 60
  if (minsMatch) total += Number(minsMatch[1])
  if (!hoursMatch && !minsMatch && /^\d+$/.test(text)) total += Number(text)
  return Math.round(total)
}

function computeEndTime(startTime, duration) {
  if (!startTime) return ''
  const [hours, minutes] = startTime.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return ''
  const totalMinutes = hours * 60 + minutes + parseDurationToMinutes(duration)
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

function contractNumber(contract) {
  if (!contract?.id) return ''
  return String(contract.id).slice(0, 8).toUpperCase()
}

function paymentReference(payment) {
  return payment?.payment_reference || (payment?.id ? String(payment.id).slice(0, 8).toUpperCase() : '')
}

function receiptNumber(payment) {
  return payment?.receipt_number || ''
}

const CONTRACT_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  signed: 'Signé',
  cancelled: 'Annulé',
}

function contractStatus(contract) {
  if (contract?.status) return CONTRACT_STATUS_LABELS[contract.status] || contract.status
  if (contract?.signed_at) return 'Signé'
  return 'Brouillon'
}

async function logExport(exportType, format, filters) {
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'export_regulatory',
      p_entity_type: 'export',
      p_entity_label: `Export réglementaire ${exportType} ${format}`,
      p_metadata: { exportType, format, filters },
    })
  } catch {
    // non bloquant
  }
}

async function getCurrentOrganizationId() {
  const { data } = await supabase.from('organizations').select('id').maybeSingle()
  return data?.id || null
}

async function trackRegulatoryExportAnalytics(format, exportType) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) return
  const { trackExportCsv, trackExportExcel, trackExportPdf } = await import('../lib/analytics')
  if (format === 'xlsx') trackExportExcel(organizationId, exportType)
  else if (format === 'pdf') trackExportPdf(organizationId, exportType)
  else trackExportCsv(organizationId, exportType)
}

async function fetchOrgMeta() {
  const { data, error } = await supabase
    .from('organizations')
    .select('name, siret, prefecture_approval, address, city, postal_code, phone, email')
    .maybeSingle()
  if (error) throw error
  return data
}

async function loadProfilesById(profileIds = []) {
  const ids = [...new Set(profileIds.filter(Boolean))]
  if (!ids.length) return new Map()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .in('id', ids)
  if (error) throw error
  return new Map((data || []).map((profile) => [profile.id, profile]))
}

async function loadStudentsById(studentIds = []) {
  const ids = [...new Set(studentIds.filter(Boolean))]
  if (!ids.length) return new Map()
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, file_number')
    .in('id', ids)
  if (error) throw error
  return new Map((data || []).map((student) => [student.id, student]))
}

async function loadPackagesById(packageIds = []) {
  const ids = [...new Set(packageIds.filter(Boolean))]
  if (!ids.length) return new Map()
  const { data, error } = await supabase
    .from('pricing_packages')
    .select('id, name')
    .in('id', ids)
  if (error) throw error
  return new Map((data || []).map((pkg) => [pkg.id, pkg]))
}

async function loadVehiclesById(vehicleIds = []) {
  const ids = [...new Set(vehicleIds.filter(Boolean))]
  if (!ids.length) return new Map()
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, brand, model, plate')
    .in('id', ids)
  if (error) throw error
  return new Map((data || []).map((vehicle) => [vehicle.id, vehicle]))
}

async function fetchTeachers(filters = {}) {
  const { teachers, error } = await listTeachers()
  if (error) throw error

  let rows = teachers || []
  if (filters.dateFrom) {
    rows = rows.filter((teacher) => teacher.created_at >= `${filters.dateFrom}T00:00:00`)
  }
  if (filters.dateTo) {
    rows = rows.filter((teacher) => teacher.created_at <= `${filters.dateTo}T23:59:59`)
  }
  return rows
}

async function fetchInitialAssessmentsMap(studentIds = []) {
  if (!studentIds.length) return {}
  const { data, error } = await supabase
    .from('student_initial_assessments')
    .select('student_id, completed_at, status, recommended_hours_min, recommended_hours_max')
    .in('student_id', studentIds)
  if (error) throw error
  return Object.fromEntries((data || []).map((row) => [row.student_id, row]))
}

async function fetchLessonObservations(filters = {}) {
  let query = supabase
    .from('student_lesson_observations')
    .select('id, student_id, teacher_id, lesson_date, lesson_time, duration, observations, skills, opened_at')
    .order('opened_at', { ascending: true })

  if (filters.dateFrom) query = query.gte('lesson_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('lesson_date', filters.dateTo)
  if (filters.teacherId) query = query.eq('teacher_id', filters.teacherId)
  if (filters.studentId) query = query.eq('student_id', filters.studentId)

  const { data, error } = await query
  if (error) throw error

  const rows = data || []
  const [studentsById, profilesById] = await Promise.all([
    loadStudentsById(rows.map((row) => row.student_id)),
    loadProfilesById(rows.map((row) => row.teacher_id)),
  ])

  return rows.map((row) => ({
    ...row,
    student: studentsById.get(row.student_id) || null,
    teacher: profilesById.get(row.teacher_id) || null,
  }))
}

async function fetchAppointmentVehicleMap(filters = {}) {
  let query = supabase
    .from('appointments')
    .select('starts_at, student_id, vehicle_id')
    .order('starts_at', { ascending: true })

  if (filters.dateFrom) query = query.gte('starts_at', `${filters.dateFrom}T00:00:00`)
  if (filters.dateTo) query = query.lte('starts_at', `${filters.dateTo}T23:59:59`)
  if (filters.teacherId) query = query.eq('teacher_id', filters.teacherId)
  if (filters.studentId) query = query.eq('student_id', filters.studentId)

  const { data, error } = await query
  if (error) throw error

  const vehiclesById = await loadVehiclesById((data || []).map((row) => row.vehicle_id))
  const map = new Map()
  ;(data || []).forEach((appointment) => {
    const dateKey = appointment.starts_at?.slice(0, 10)
    if (!dateKey || !appointment.student_id) return
    map.set(`${appointment.student_id}_${dateKey}`, vehicleLabel(vehiclesById.get(appointment.vehicle_id)))
  })
  return map
}

async function fetchPayments(filters = {}) {
  let query = supabase
    .from('payments')
    .select('id, amount, paid_at, method, comment, receipt_number, payment_reference, student_id')
    .order('paid_at', { ascending: true })

  if (filters.dateFrom) query = query.gte('paid_at', filters.dateFrom)
  if (filters.dateTo) query = query.lte('paid_at', filters.dateTo)
  if (filters.studentId) query = query.eq('student_id', filters.studentId)

  const { data, error } = await query
  if (error) throw error

  const studentsById = await loadStudentsById((data || []).map((row) => row.student_id))
  return (data || []).map((payment) => ({
    ...payment,
    student: studentsById.get(payment.student_id) || null,
  }))
}

async function fetchContracts(filters = {}) {
  let query = supabase
    .from('contracts')
    .select('id, contract_total, signed_at, updated_at, status, student_id, package_id')
    .order('updated_at', { ascending: true })

  if (filters.dateFrom) query = query.gte('signed_at', filters.dateFrom)
  if (filters.dateTo) query = query.lte('signed_at', filters.dateTo)
  if (filters.studentId) query = query.eq('student_id', filters.studentId)

  const { data, error } = await query
  if (error) throw error

  const rows = data || []
  const [studentsById, packagesById] = await Promise.all([
    loadStudentsById(rows.map((row) => row.student_id)),
    loadPackagesById(rows.map((row) => row.package_id)),
  ])

  return rows.map((contract) => ({
    ...contract,
    student: studentsById.get(contract.student_id) || null,
    package: packagesById.get(contract.package_id) || null,
  }))
}

async function fetchVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, brand, model, plate, energy, details, created_at')
    .order('created_at')
  if (error) throw error
  return data || []
}

function mapStudentRows(students, assessmentsMap) {
  return students.map((student) => {
    const assessment = assessmentsMap[student.id]
    return {
      'N° dossier': student.file_number || '',
      Nom: student.last_name || '',
      Prénom: student.first_name || '',
      'Date de naissance': formatDateFr(student.birth_date),
      Adresse: [student.street_number, student.street].filter(Boolean).join(' '),
      'Code postal': student.postal_code || '',
      Ville: student.city || '',
      Téléphone: student.phone || '',
      Email: student.email || '',
      NEPH: student.neph || '',
      'Date inscription': formatDateFr(student.registration_date),
      Formule: student.package_name || '',
      Statut: student.status || '',
      'Enseignant référent': referentTeacherName(student),
      'Date évaluation de départ': assessment?.status === 'completed'
        ? formatDateFr(assessment.completed_at)
        : '',
      'Volume prévisionnel recommandé': assessment?.status === 'completed'
        ? formatRecommendedHours(assessment)
        : '',
    }
  })
}

function mapTeacherRows(teachers) {
  return teachers.map((teacher) => {
    const { firstName, lastName } = splitFullName(teacher.full_name || '')
    return {
      Nom: lastName,
      Prénom: firstName,
      Email: teacher.email || '',
      Téléphone: teacher.phone || '',
      'N° autorisation d\'enseigner': teacher.authorization_number || '',
      'Date de validité': formatDateFr(teacher.authorization_expires_at),
      'Catégories autorisées': (teacher.authorized_categories || []).join(', '),
      'Date d\'affectation': formatDateFr(teacher.created_at),
    }
  })
}

function mapLessonRows(observations, vehicleMap) {
  return observations.map((lesson) => {
    const dateKey = lesson.lesson_date || lesson.opened_at?.slice(0, 10) || ''
    const vehicle = vehicleMap.get(`${lesson.student_id}_${dateKey}`) || ''
    return {
      Date: formatDateFr(lesson.lesson_date || lesson.opened_at),
      'Heure début': lesson.lesson_time || '',
      'Heure fin': computeEndTime(lesson.lesson_time, lesson.duration),
      Élève: studentFullName(lesson.student),
      Enseignant: lesson.teacher?.full_name || '',
      Véhicule: vehicle,
      Durée: lesson.duration || '',
      'Compétence REMC travaillée': (lesson.skills || []).join(', '),
      Observations: lesson.observations || '',
    }
  })
}

function mapPaymentRows(payments) {
  return payments.map((payment) => ({
    Élève: studentFullName(payment.student),
    Date: formatDateFr(payment.paid_at),
    Montant: formatAmount(payment.amount),
    'Mode de paiement': payment.method || '',
    'N° reçu': receiptNumber(payment),
    Référence: paymentReference(payment),
    Commentaire: payment.comment || '',
  }))
}

function mapContractRows(contracts) {
  return contracts.map((contract) => ({
    'N° contrat': contractNumber(contract),
    Élève: studentFullName(contract.student),
    'Date signature': formatDateFr(contract.signed_at),
    Formule: contract.package?.name || '',
    'Montant total': formatAmount(contract.contract_total),
    Statut: contractStatus(contract),
  }))
}

function mapVehicleRows(vehicles) {
  return vehicles.map((vehicle) => {
    const details = vehicle.details || {}
    return {
      Immatriculation: vehicle.plate || '',
      Marque: vehicle.brand || '',
      Modèle: vehicle.model || '',
      Énergie: vehicle.energy || '',
      'Date mise en circulation': formatDateFr(details.firstRegistrationDate || details.registrationDate || vehicle.created_at),
      Assurance: details.insuranceCompany || details.insurance || '',
      'Date expiration assurance': formatDateFr(details.insuranceExpiry || details.insuranceExpiresAt || ''),
    }
  })
}

async function downloadRegulatoryTable({
  exportType,
  format,
  filters,
  headers,
  rows,
  config,
}) {
  const stamp = timestampForFilename()
  const extension = format === 'xlsx' ? 'xlsx' : 'csv'
  const filename = `${config.filenamePrefix}_${stamp}.${extension}`

  if (format === 'xlsx') {
    await downloadXlsxSheet({ filename, sheetName: config.sheetName, headers, rows })
  } else {
    downloadProfessionalCsv(filename, headers, rows)
  }

  await logExport(exportType, format, filters)
  await trackRegulatoryExportAnalytics(format, exportType)
}

export async function exportRegulatoryStudents(filters = {}, format = 'csv') {
  const students = await fetchExportStudents(filters)
  const assessmentsMap = await fetchInitialAssessmentsMap(students.map((row) => row.id))
  const rows = mapStudentRows(students, assessmentsMap)
  await downloadRegulatoryTable({
    exportType: 'students',
    format,
    filters,
    headers: STUDENT_HEADERS,
    rows,
    config: REGULATORY_EXPORTS.students,
  })
}

export async function exportRegulatoryTeachers(filters = {}, format = 'csv') {
  const teachers = await fetchTeachers(filters)
  const rows = mapTeacherRows(teachers)
  await downloadRegulatoryTable({
    exportType: 'teachers',
    format,
    filters,
    headers: TEACHER_HEADERS,
    rows,
    config: REGULATORY_EXPORTS.teachers,
  })
}

export async function exportRegulatoryLessons(filters = {}, format = 'csv') {
  const [observations, vehicleMap] = await Promise.all([
    fetchLessonObservations(filters),
    fetchAppointmentVehicleMap(filters),
  ])
  const rows = mapLessonRows(observations, vehicleMap)
  await downloadRegulatoryTable({
    exportType: 'lessons',
    format,
    filters,
    headers: LESSON_HEADERS,
    rows,
    config: REGULATORY_EXPORTS.lessons,
  })
}

export async function exportRegulatoryPayments(filters = {}, format = 'csv') {
  const payments = await fetchPayments(filters)
  const rows = mapPaymentRows(payments)
  await downloadRegulatoryTable({
    exportType: 'payments',
    format,
    filters,
    headers: PAYMENT_HEADERS,
    rows,
    config: REGULATORY_EXPORTS.payments,
  })
}

export async function exportRegulatoryContracts(filters = {}, format = 'csv') {
  const contracts = await fetchContracts(filters)
  const rows = mapContractRows(contracts)
  await downloadRegulatoryTable({
    exportType: 'contracts',
    format,
    filters,
    headers: CONTRACT_HEADERS,
    rows,
    config: REGULATORY_EXPORTS.contracts,
  })
}

export async function exportRegulatoryVehicles(filters = {}, format = 'csv') {
  const vehicles = await fetchVehicles()
  const rows = mapVehicleRows(vehicles)
  await downloadRegulatoryTable({
    exportType: 'vehicles',
    format,
    filters,
    headers: VEHICLE_HEADERS,
    rows,
    config: REGULATORY_EXPORTS.vehicles,
  })
}

function addPdfSection(doc, autoTable, title, headers, rows, pageWidth) {
  doc.addPage()
  doc.setFontSize(14)
  doc.setTextColor(14, 116, 144)
  doc.text(title, 14, 16)
  doc.setTextColor(15, 23, 42)

  if (!rows.length) {
    doc.setFontSize(10)
    doc.text('Aucune donnée sur la période sélectionnée.', 14, 26)
    return
  }

  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => headers.map((header) => String(row[header] ?? ''))),
    startY: 22,
    margin: { left: 14, right: 14 },
    tableWidth: pageWidth - 28,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })
}

export async function exportRegulatoryPdf(filters = {}) {
  const generatedAt = formatGeneratedAt()
  const org = await fetchOrgMeta()
  const [students, teachers, vehicles, payments] = await Promise.all([
    fetchExportStudents(filters),
    fetchTeachers(filters),
    fetchVehicles(),
    fetchPayments(filters),
  ])

  const assessmentsMap = await fetchInitialAssessmentsMap(students.map((row) => row.id))
  const studentRows = mapStudentRows(students, assessmentsMap)
  const teacherRows = mapTeacherRows(teachers)
  const vehicleRows = mapVehicleRows(vehicles)
  const paymentRows = mapPaymentRows(payments)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const orgName = org?.name || 'Auto-école'
  const orgAddress = [org?.address, org?.postal_code, org?.city].filter(Boolean).join(' ')

  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('Dossier réglementaire', 14, 18)
  doc.setFontSize(11)
  doc.text(orgName, 14, 28)
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(`SIRET : ${org?.siret || '—'}`, 14, 36)
  doc.text(`Agrément préfectoral : ${org?.prefecture_approval || '—'}`, 14, 42)
  if (orgAddress) doc.text(`Adresse : ${orgAddress}`, 14, 48)
  doc.text(`Document généré le ${generatedAt}`, 14, 56)
  if (filters.dateFrom || filters.dateTo) {
    doc.text(`Période exportée : ${filters.dateFrom || '…'} au ${filters.dateTo || '…'}`, 14, 62)
  }

  addPdfSection(doc, autoTable, 'Registre des élèves', STUDENT_HEADERS, studentRows, pageWidth)
  addPdfSection(doc, autoTable, 'Registre des enseignants', TEACHER_HEADERS, teacherRows, pageWidth)
  addPdfSection(doc, autoTable, 'Parc automobile', VEHICLE_HEADERS, vehicleRows, pageWidth)
  addPdfSection(doc, autoTable, 'Registre des paiements', PAYMENT_HEADERS, paymentRows, pageWidth)

  const pageCount = doc.getNumberOfPages()
  doc.setPage(pageCount)
  let signatureY = (doc.lastAutoTable?.finalY || 180) + 14
  if (signatureY > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage()
    signatureY = 24
  }

  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('Signature numérique de l\'établissement', 14, signatureY)
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Document certifié conforme — ${orgName}`, 14, signatureY + 6)
  doc.text(`Édité le ${generatedAt} via PEDAGOGIA DRIVE`, 14, signatureY + 12)
  doc.text(`Identifiant document : REG-${timestampForFilename()}`, 14, signatureY + 18)

  downloadBlob(`dossier-reglementaire_${timestampForFilename()}.pdf`, doc.output('blob'))
  await logExport('pdf', 'pdf', filters)
}

export const REGULATORY_EXPORT_RUNNERS = {
  students: exportRegulatoryStudents,
  teachers: exportRegulatoryTeachers,
  lessons: exportRegulatoryLessons,
  payments: exportRegulatoryPayments,
  contracts: exportRegulatoryContracts,
  vehicles: exportRegulatoryVehicles,
  pdf: exportRegulatoryPdf,
}
