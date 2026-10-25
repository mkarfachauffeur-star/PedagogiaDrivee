/**
 * Charte des espaces connectés : une couleur d'accent (#1769FF), deux graisses
 * (medium, semibold), bordures fines, rayons 8 px (contrôles) et 12 px (cartes).
 */

export const ui = {
  card: 'rounded-xl border border-slate-200 bg-white',
  cardBody: 'p-5 sm:p-6',
  sectionTitle: 'text-base font-semibold text-slate-900',
  sectionText: 'mt-1 text-sm text-slate-500',

  label: 'block text-sm font-medium text-slate-700',
  hint: 'mt-1.5 text-xs text-slate-500',
  input:
    'mt-1.5 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1769FF] focus:ring-2 focus:ring-[#1769FF]/20',
  checkbox: 'h-4 w-4 rounded border-slate-300 accent-[#1769FF]',

  btnPrimary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1769FF] px-4 text-sm font-medium text-white transition hover:bg-[#145fe8] disabled:cursor-not-allowed disabled:opacity-50',
  btnSecondary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
  btnSmall:
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
  btnSmallPrimary:
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#1769FF] px-2.5 text-xs font-medium text-white transition hover:bg-[#145fe8] disabled:cursor-not-allowed disabled:opacity-50',
  btnSmallDanger:
    'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50',

  tableWrap: 'overflow-x-auto rounded-xl border border-slate-200 bg-white',
  table: 'w-full text-left text-sm',
  th: 'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500',
  tr: 'border-b border-slate-100 last:border-0',
  td: 'px-4 py-3 text-slate-700',
  tdStrong: 'px-4 py-3 font-medium text-slate-900',
  tdNumber: 'px-4 py-3 text-right font-medium tabular-nums text-slate-900',
  tdMuted: 'px-4 py-3 text-slate-500',
  tdEmpty: 'px-4 py-10 text-center text-sm text-slate-500',
}
