import { formatPersonName } from '../lib/staffAccounts'
import { downloadBlob } from '../utils/csvExport'
import {
  ASSESSMENT_MODULES,
  FSB_OPTIONS,
  PROFILE_LABELS,
  computeAssessmentScores,
  recommendHoursFromScore,
} from '../data/initialAssessmentForm'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateFr(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return '—'
  }
}

function slugify(value) {
  return String(value ?? 'eleve')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'eleve'
}

function buildStudentName(student = {}) {
  return formatPersonName(student) || student.full_name || 'Élève'
}

function buildModuleSection(mod, answers) {
  if (!mod.available || mod.readOnly) return ''

  let rows = ''
  ;(mod.fields || []).forEach((field) => {
    rows += `<tr><td>${escapeHtml(field.label)}</td><td><strong>${escapeHtml(answers[field.id] || '—')}</strong></td></tr>`
  })
  ;(mod.ratings || []).forEach((rating) => {
    const val = answers[rating.id]
    const label = FSB_OPTIONS.find((o) => o.value === val)?.label || val || '—'
    rows += `<tr><td>${escapeHtml(rating.label)}</td><td><strong>${escapeHtml(label)}</strong></td></tr>`
  })

  if (!rows) return ''

  return `
    <section class="module">
      <h2>Module ${mod.moduleNumber} — ${escapeHtml(mod.title)}</h2>
      <p class="objective">${escapeHtml(mod.objective || '')}</p>
      <table>
        <thead><tr><th>Question / critère</th><th>Réponse</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `
}

function buildAssessmentHtml({
  student = {},
  assessment = {},
  answers = {},
  organizationName = 'Auto-école',
}) {
  const scores = computeAssessmentScores(answers)
  const recommendation = recommendHoursFromScore({ ...scores, moduleScores: scores.moduleScores })
  const profileLabel = PROFILE_LABELS[recommendation.resultLevel] || recommendation.profileLabel
  const studentName = buildStudentName(student)
  const fileNumber = student.file_number || '—'

  const modulesHtml = ASSESSMENT_MODULES
    .filter((m) => !m.readOnly)
    .map((mod) => buildModuleSection(mod, answers))
    .join('')

  return {
    studentName,
    html: `
      <div class="pdf-root">
        <style>
          .pdf-root {
            font-family: Arial, sans-serif;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.45;
            background: #fff;
            padding: 24px 24px 80px;
            box-sizing: border-box;
          }
          .pdf-root h1 { font-size: 22px; margin: 0 0 4px; }
          .pdf-root .header { border-bottom: 3px solid #0e7490; padding-bottom: 16px; margin-bottom: 24px; }
          .pdf-root .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 16px; }
          .pdf-root .meta dt { font-weight: bold; color: #475569; }
          .pdf-root .meta dd { margin: 0 0 8px; }
          .pdf-root .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
          .pdf-root .summary .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
          .pdf-root .summary .value { font-size: 20px; font-weight: bold; color: #0e7490; margin: 0; }
          .pdf-root .module { margin-bottom: 24px; }
          .pdf-root .module h2 { font-size: 14px; color: #0e7490; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .pdf-root table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .pdf-root th, .pdf-root td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
          .pdf-root th { background: #f8fafc; }
          .pdf-root .footer { margin-top: 32px; padding-bottom: 12px; font-size: 10px; color: #64748b; }
        </style>
        <header class="header">
          <p style="margin:0;color:#64748b;font-size:11px;">PEDAGOGIA DRIVE</p>
          <h1>Évaluation de départ — Permis B</h1>
          <p>${escapeHtml(organizationName)}</p>
          <dl class="meta">
            <div><dt>Élève</dt><dd>${escapeHtml(studentName)}</dd></div>
            <div><dt>N° dossier</dt><dd>${escapeHtml(fileNumber)}</dd></div>
            <div><dt>Date</dt><dd>${escapeHtml(formatDateFr(assessment.completed_at || new Date()))}</dd></div>
            <div><dt>Enseignant</dt><dd>${escapeHtml(assessment.teacherName || assessment.teacher?.full_name || '—')}</dd></div>
          </dl>
        </header>
        <section class="summary">
          <div class="card"><p>Score total</p><p class="value">${scores.finalScore} %</p></div>
          <div class="card"><p>Profil</p><p class="value">${escapeHtml(profileLabel)}</p></div>
          <div class="card"><p>Volume horaire estimé</p><p class="value">${escapeHtml(recommendation.label)}</p></div>
        </section>
        ${modulesHtml}
        ${(answers.teacher_comment || '').trim()
          ? `<section class="module">
              <h2>Commentaire enseignant</h2>
              <p style="white-space:pre-wrap;line-height:1.5;">${escapeHtml(answers.teacher_comment.trim())}</p>
            </section>`
          : ''}
        <footer class="footer">Document généré le ${escapeHtml(formatDateFr(new Date()))} — PEDAGOGIA DRIVE.</footer>
      </div>
    `,
  }
}

async function renderPdfFromElement(element, filename) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const content = element.querySelector('.pdf-root') || element
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 80)))

  const canvas = await html2canvas(content, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
    scrollX: 0,
    scrollY: 0,
    width: content.scrollWidth,
    height: content.scrollHeight,
    windowWidth: content.scrollWidth,
    windowHeight: content.scrollHeight,
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const printableWidth = pageWidth - margin * 2
  const printableHeight = pageHeight - margin * 2
  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const imgHeight = (canvas.height * printableWidth) / canvas.width

  let yOffset = 0
  let pageIndex = 0

  while (yOffset < imgHeight) {
    if (pageIndex > 0) pdf.addPage()
    pdf.addImage(imgData, 'JPEG', margin, margin - yOffset, printableWidth, imgHeight)
    yOffset += printableHeight
    pageIndex += 1
  }

  downloadBlob(filename, pdf.output('blob'))
}

/** Télécharge un PDF de l'évaluation de départ. */
export async function exportInitialAssessmentPdf({
  student = {},
  assessment = {},
  answers = {},
  organizationName = 'Auto-école',
}) {
  const { studentName, html } = buildAssessmentHtml({
    student,
    assessment,
    answers,
    organizationName,
  })

  const container = document.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  Object.assign(container.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '794px',
    background: '#ffffff',
    pointerEvents: 'none',
  })
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    await renderPdfFromElement(container, `evaluation-depart-${slugify(studentName)}.pdf`)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Le téléchargement du PDF a échoué.' }
  } finally {
    container.remove()
  }
}
