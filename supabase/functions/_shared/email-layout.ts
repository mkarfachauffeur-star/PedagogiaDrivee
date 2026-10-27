// Mise en page commune des e-mails Pedagogia Drive : logo et nom en en-tête, carte blanche,
// bouton d'action, pied de page. Tableaux et styles en ligne pour les messageries (Gmail, Outlook, Apple Mail).
import { escapeHtml } from './email-utils.ts'
import { appBaseUrl } from './app-url.ts'

type EmailOptions = {
  /** Titre affiché en haut de la carte. */
  title: string
  /** Texte d'aperçu affiché par la messagerie à côté de l'objet. */
  preheader?: string
  /** Contenu HTML déjà échappé (paragraphes, encadré…). */
  bodyHtml: string
  cta?: { label: string; url: string }
  /** Mention discrète sous la carte (ex. raison de l'envoi). */
  footerNote?: string
}

const BRAND_BLUE = '#1769FF'
const INK = '#0B1526'
const MUTED = '#5B6B80'

export function emailParagraph(html: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK};">${html}</p>`
}

/** Encadré chiffré, par ex. « 40 / 50 élèves ». */
export function emailHighlight(value: string, label: string, color = BRAND_BLUE) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-collapse:separate;">
  <tr><td style="background:#F4F7FB;border:1px solid #E3E9F2;border-radius:12px;padding:18px 20px;">
    <div style="font-size:28px;line-height:32px;font-weight:700;color:${color};">${value}</div>
    <div style="margin-top:4px;font-size:13px;line-height:18px;color:${MUTED};">${label}</div>
  </td></tr>
</table>`
}

export function renderEmail({ title, preheader = '', bodyHtml, cta, footerNote }: EmailOptions) {
  const base = appBaseUrl()
  const logo = `${base}/brand/pedagogia-drive-p-mark-light.png`
  const year = new Date().getFullYear()
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr><td style="border-radius:10px;background:${BRAND_BLUE};">
        <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(cta.label)}</a>
      </td></tr></table>`
    : ''

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F1F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F4F8;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;"><img src="${logo}" width="40" height="40" alt="" style="display:block;border:0;width:40px;height:40px;"></td>
          <td style="vertical-align:middle;padding-left:12px;">
            <div style="font-size:11px;line-height:14px;font-weight:700;letter-spacing:3px;color:${INK};">PEDAGOGIA</div>
            <div style="font-size:20px;line-height:22px;font-weight:800;letter-spacing:1px;"><span style="color:${BRAND_BLUE};">DRI</span><span style="color:#EF3340;">VE</span></div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #E3E9F2;border-radius:16px;padding:32px 28px;">
        <h1 style="margin:0 0 20px;font-size:22px;line-height:28px;font-weight:700;color:${INK};">${escapeHtml(title)}</h1>
        ${bodyHtml}
        ${button}
      </td></tr>
      <tr><td style="padding:20px 8px 0;font-size:12px;line-height:18px;color:${MUTED};text-align:center;">
        ${footerNote ? `${footerNote}<br>` : ''}
        Pedagogia Drive · Livret d’apprentissage numérique pour auto-écoles<br>
        <a href="${base}" style="color:${MUTED};">www.pedagogia-drive.fr</a> · © ${year} Pedagogia Drive
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
