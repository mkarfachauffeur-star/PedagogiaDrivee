/** CSV UTF-8 BOM + séparateur point-virgule (Excel France). */

import ExcelJS from 'exceljs'
import { isNativeApp } from '../lib/nativeApp'

function escapeCsvCell(value) {
  const text = value == null ? '' : String(value)
  if (/[;"\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function formatGeneratedAt(date = new Date()) {
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function buildProfessionalCsv(headers, rows) {
  const lines = ['sep=;']
  lines.push(headers.map(escapeCsvCell).join(';'))
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsvCell(row[header])).join(';'))
  })
  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadProfessionalCsv(filename, headers, rows) {
  const content = buildProfessionalCsv(headers, rows)
  downloadBlob(filename, new Blob([content], { type: 'text/csv;charset=utf-8;' }))
}

export async function downloadXlsxSheet({ filename, sheetName, headers, rows }) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PEDAGOGIA DRIVE'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet((sheetName || 'Export').slice(0, 31))
  worksheet.addRow(headers)
  rows.forEach((row) => worksheet.addRow(headers.map((header) => row[header] ?? '')))
  worksheet.getRow(1).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
    throw new Error('Le fichier Excel généré est invalide.')
  }

  downloadBlob(filename, new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }))
}

export function formatAmount(value) {
  if (value == null || value === '') return ''
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toFixed(2).replace('.', ',')
}

export function buildCsvContent({ generatedAt, meta = [], headers, rows }) {
  const lines = []
  lines.push(`Généré le;${escapeCsvCell(generatedAt)}`)
  meta.forEach(([label, value]) => lines.push(`${escapeCsvCell(label)};${escapeCsvCell(value)}`))
  if (meta.length || true) lines.push('')
  lines.push(headers.map(escapeCsvCell).join(';'))
  rows.forEach((row) => {
    lines.push(headers.map((key) => escapeCsvCell(row[key])).join(';'))
  })
  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(filename, blob)
}

// L'app iPhone ne gère pas les téléchargements de navigateur : le fichier passe par
// la feuille de partage d'iOS (Enregistrer dans Fichiers, Mail, AirDrop…).
function shareFileOnDevice(filename, blob) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
  const share = () => navigator.share({ files: [file], title: filename })

  share().catch((error) => {
    if (error?.name === 'AbortError') return
    // Le partage exige un geste récent de l'utilisateur : après une génération longue,
    // on propose un bouton pour ouvrir la feuille de partage.
    const overlay = document.createElement('div')
    overlay.setAttribute('role', 'dialog')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.45);padding:24px'
    const card = document.createElement('div')
    card.style.cssText = 'width:100%;max-width:340px;border-radius:16px;background:#fff;padding:20px;font-family:inherit;text-align:center'
    const title = document.createElement('p')
    title.textContent = 'Fichier prêt'
    title.style.cssText = 'margin:0 0 4px;font-weight:700;font-size:16px;color:#0f172a'
    const name = document.createElement('p')
    name.textContent = filename
    name.style.cssText = 'margin:0 0 16px;font-size:13px;color:#475569;word-break:break-all'
    const open = document.createElement('button')
    open.type = 'button'
    open.textContent = 'Enregistrer ou partager'
    open.style.cssText = 'display:block;width:100%;border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:700;font-size:15px;padding:12px'
    const close = document.createElement('button')
    close.type = 'button'
    close.textContent = 'Fermer'
    close.style.cssText = 'display:block;width:100%;margin-top:8px;border:0;background:none;color:#475569;font-size:14px;padding:10px'
    const dismiss = () => overlay.remove()
    open.addEventListener('click', () => {
      share().catch(() => {}).finally(dismiss)
    })
    close.addEventListener('click', dismiss)
    card.append(title, name, open, close)
    overlay.append(card)
    document.body.append(overlay)
  })
}

export function downloadBlob(filename, blob) {
  if (isNativeApp && typeof navigator.share === 'function') {
    shareFileOnDevice(filename, blob)
    return
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.style.display = 'none'
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 3000)
}

export function timestampForFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`
}

export { splitFullName } from '../lib/staffAccounts'

export function formatDateFr(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
}

export function formatTimeFr(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function formatDurationMinutes(minutes) {
  const mins = Number(minutes)
  if (!Number.isFinite(mins) || mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m} min`
  if (!m) return `${h} h`
  return `${h} h ${m} min`
}

export function addMinutes(iso, minutes) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() + Number(minutes || 0))
  return date.toISOString()
}
