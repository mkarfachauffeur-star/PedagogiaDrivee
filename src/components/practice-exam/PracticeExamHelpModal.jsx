import {
  AUTONOMY_NOTE_OPTIONS,
  ELIMINATORY_ERRORS,
  PRACTICE_EXAM_HELP_ITEMS,
  PRACTICE_EXAM_MAX_SCORE,
  PRACTICE_EXAM_SECTIONS,
  STANDARD_NOTE_OPTIONS,
} from '../../data/practiceExamGrid'
import AppModal, { AppModalFooter } from '../ui/AppModal'

export default function PracticeExamHelpModal({ open, onClose, onStart }) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      eyebrow="Examen blanc permis B"
      title="Déroulement de l'épreuve"
      subtitle="Rappel du format officiel avant de lancer la grille d'évaluation."
      size="lg"
      zIndex={130}
      footer={(
        <AppModalFooter onClose={onClose} hideSubmit>
          <button className="pd-btn-primary w-full sm:w-auto" onClick={onStart} type="button">
            Commencer l'évaluation
          </button>
        </AppModalFooter>
      )}
    >
      <ul className="space-y-3">
        {PRACTICE_EXAM_HELP_ITEMS.map((item) => (
          <li className="flex gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700" key={item}>
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </AppModal>
  )
}

export function PracticeExamScorePreview({ form, liveScore, liveResultLabel }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">Score en direct</p>
          <p className="mt-1 text-4xl font-semibold text-slate-950">
            {liveScore} <span className="text-xl text-slate-500">/ {PRACTICE_EXAM_MAX_SCORE}</span>
          </p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-800">{liveResultLabel}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        {form.bonusCourtesy && <span className="rounded-full bg-white px-3 py-1">+1 Courtoisie</span>}
        {form.bonusEco && <span className="rounded-full bg-white px-3 py-1">+1 Éco-conduite</span>}
        {form.eliminatoryErrors.length > 0 && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">Erreur éliminatoire</span>
        )}
      </div>
    </div>
  )
}

export function PracticeExamGridEditor({ form, onChangeScore, onCommentChange, onToggleBonus, onToggleEliminatory }) {
  return (
    <div className="space-y-5">
      {PRACTICE_EXAM_SECTIONS.map((section) => (
        <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm" key={section.id}>
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Notes : {section.scale === 'autonomy' ? AUTONOMY_NOTE_OPTIONS.join(' / ') : STANDARD_NOTE_OPTIONS.join(' / ')}
            </p>
          </div>
          <div className="divide-y divide-slate-200">
            {section.items.map((item) => (
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
                <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                <div className="flex flex-wrap gap-2">
                  {(section.scale === 'autonomy' ? AUTONOMY_NOTE_OPTIONS : STANDARD_NOTE_OPTIONS).map((option) => {
                    const active = form.scores[item.id] === option
                    return (
                      <button
                        className={`min-w-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? 'bg-[#1769FF] text-white shadow-md'
                            : 'border border-slate-300 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                        key={option}
                        onClick={() => onChangeScore(item.id, option)}
                        type="button"
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50">
        <div className="border-b border-emerald-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Bonifications</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {[
            { key: 'bonusCourtesy', label: '+1 Courtoisie au volant' },
            { key: 'bonusEco', label: '+1 Conduite économique et respectueuse de l\'environnement' },
          ].map((bonus) => (
            <label className="flex items-center gap-3 rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-slate-700" key={bonus.key}>
              <input
                checked={form[bonus.key]}
                className="h-4 w-4 rounded border-slate-300"
                onChange={() => onToggleBonus(bonus.key)}
                type="checkbox"
              />
              {bonus.label}
            </label>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50/50">
        <div className="border-b border-rose-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Erreurs éliminatoires</h3>
        </div>
        <div className="grid gap-2 p-5">
          {ELIMINATORY_ERRORS.map((error) => (
            <label className="flex items-start gap-3 rounded-2xl border border-white bg-white px-4 py-3 text-sm font-semibold text-slate-700" key={error.id}>
              <input
                checked={form.eliminatoryErrors.includes(error.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
                onChange={() => onToggleEliminatory(error.id)}
                type="checkbox"
              />
              {error.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-5">
        <label className="block text-sm font-semibold text-slate-900">
          Commentaire final
          <textarea
            className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="Observations, axes de travail, consignes pour la prochaine séance..."
            value={form.comment}
          />
        </label>
      </section>
    </div>
  )
}
