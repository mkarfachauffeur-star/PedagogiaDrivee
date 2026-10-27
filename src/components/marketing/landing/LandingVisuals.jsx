import DashboardWarningIcon from '../../DashboardWarningIcon'

/*
 * Aperçus de l'interface Pedagogia Drive, recomposés en code à partir des écrans réels
 * (libellés, navigation, parcours REMC). Les noms et chiffres affichés sont fictifs :
 * chaque aperçu est accompagné de la mention « données fictives » sur la page.
 */

const STUDENT_NAV = ['Tableau de bord', 'Planning', 'Évaluation de départ', 'Compétences', 'Historique des leçons', 'Documents', 'Messagerie']

const REMC = [
  { code: 'C1', title: 'Maîtriser le véhicule', progress: 100 },
  { code: 'C2', title: 'Appréhender la route', progress: 58 },
  { code: 'C3', title: 'Circuler en conditions difficiles', progress: 12 },
  { code: 'C4', title: 'Conduite autonome', progress: 0 },
]

const VOYANT_QCU = {
  lesson: 'Voyants du tableau de bord',
  question: 'Que signifie ce voyant ?',
  iconType: 'oil-pressure',
  choices: [
    'Il signale un manque d’huile moteur (danger pour le moteur).',
    'Il signale que le niveau d’huile est normal.',
    'Il signale que le moteur surchauffe.',
    'Il indique un manque de liquide lave-glace.',
  ],
}

export function BrowserFrame({ children, label = 'pedagogia-drive.fr', className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--lp-frame-border)] bg-[var(--lp-frame)] shadow-[0_24px_48px_-28px_rgba(2,8,23,0.45)] ${className}`}
    >
      <div className="flex h-9 items-center gap-3 border-b border-[var(--lp-frame-border)] px-3.5">
        <div aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lp-frame-dot)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lp-frame-dot)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lp-frame-dot)]" />
        </div>
        <span className="mx-auto truncate rounded-md bg-[var(--lp-frame-bar)] px-3 py-0.5 text-[11px] text-[var(--lp-muted)]">
          {label}
        </span>
        <span aria-hidden="true" className="w-[42px]" />
      </div>
      <div className="bg-white text-left text-slate-900">{children}</div>
    </div>
  )
}

export function PhoneFrame({ children, className = '' }) {
  return (
    <div
      className={`mx-auto w-full max-w-[300px] rounded-[2.2rem] border border-[var(--lp-frame-border)] bg-[#0b1220] p-2 shadow-[0_24px_48px_-28px_rgba(2,8,23,0.55)] ${className}`}
    >
      <div className="overflow-hidden rounded-[1.75rem] bg-white text-left text-slate-900">
        <div aria-hidden="true" className="flex h-7 items-center justify-center bg-white">
          <span className="h-[18px] w-20 rounded-full bg-[#0b1220]" />
        </div>
        {children}
      </div>
    </div>
  )
}

function ProgressBar({ value, tone = 'bg-[#1769FF]' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
    </div>
  )
}

function Badge({ children, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  }
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

/** Espace élève : tableau de bord et parcours REMC. */
export function StudentDashboardPreview() {
  return (
    <div className="flex min-h-[23rem]">
      <aside className="hidden w-48 shrink-0 border-r border-slate-200 bg-[#0b1628] px-3 py-4 sm:block">
        <p className="px-2 text-[11px] font-semibold text-white">Pedagogia Drive</p>
        <p className="px-2 text-[10px] text-white/45">Espace élève · Permis B</p>
        <nav className="mt-5 space-y-0.5">
          {STUDENT_NAV.map((item, index) => (
            <span
              className={`block rounded-md px-2 py-1.5 text-[11px] font-medium ${
                index === 0 ? 'bg-white/12 text-white' : 'text-white/55'
              }`}
              key={item}
            >
              {item}
            </span>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 bg-[#f6f8fb] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-slate-950">Tableau de bord</p>
            <p className="text-[11px] text-slate-500">Camille D. · Livret numérique Permis B</p>
          </div>
          <Badge>C2 en cours</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Heures', value: '11 h', detail: 'sur 20 h' },
            { label: 'Leçon suivante', value: 'Jeu. 14 h', detail: 'M. Bernard' },
            { label: 'QCU réussis', value: '7 / 9', detail: 'seuil 80 %' },
          ].map((item) => (
            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2" key={item.label}>
              <p className="truncate text-[10px] text-slate-500">{item.label}</p>
              <p className="mt-0.5 text-[14px] font-semibold text-slate-950">{item.value}</p>
              <p className="truncate text-[10px] text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-950">Compétences REMC</p>
            <p className="text-[10px] text-slate-400">Livret d’apprentissage</p>
          </div>
          <div className="mt-2.5 space-y-2.5">
            {REMC.map((item) => (
              <div key={item.code}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className={`min-w-0 truncate text-[11px] ${item.progress > 0 ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                    <span className="font-semibold">{item.code}</span> · {item.title}
                  </p>
                  <span className={`text-[10px] font-semibold ${item.progress === 100 ? 'text-emerald-600' : 'text-blue-700'}`}>
                    {item.progress === 100 ? 'Validée' : `${item.progress} %`}
                  </span>
                </div>
                <ProgressBar tone={item.progress === 100 ? 'bg-emerald-500' : 'bg-[#1769FF]'} value={item.progress} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** QCU sur les voyants du tableau de bord, repris des leçons de l’app. */
export function QcuPreview() {
  const letters = ['A', 'B', 'C', 'D']
  return (
    <div className="bg-white px-4 pb-5 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-500">{VOYANT_QCU.lesson}</p>
        <p className="text-[11px] text-slate-400">Question 3 / 10</p>
      </div>
      <div className="mt-2">
        <ProgressBar value={30} />
      </div>
      <div className="mt-4 flex justify-center rounded-xl bg-slate-50 py-4">
        <DashboardWarningIcon interactive={false} size={64} type={VOYANT_QCU.iconType} />
      </div>
      <p className="mt-4 text-[15px] font-semibold text-slate-950">{VOYANT_QCU.question}</p>
      <div className="mt-3 space-y-2">
        {VOYANT_QCU.choices.map((choice, index) => (
          <div
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[12px] leading-4 ${
              index === 0 ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-700'
            }`}
            key={choice}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold ${
                index === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {letters[index]}
            </span>
            {choice}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] font-medium text-emerald-700">Bonne réponse : correction immédiate.</p>
    </div>
  )
}

