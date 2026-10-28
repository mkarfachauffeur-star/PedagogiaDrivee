import { PRACTICE_EXAM_MAX_SCORE } from '../../data/practiceExamGrid'

export default function PracticeExamEvolutionChart({ exams = [] }) {
  const history = [...exams]
    .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
    .map((exam) => ({
      id: exam.id,
      label: new Date(exam.exam_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      score: Number(exam.score_total || 0),
    }))

  if (history.length < 2) return null

  return (
    <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-slate-950">Évolution des examens blancs</h4>
          <p className="mt-1 text-sm text-slate-500">{history.length} examens · objectif {25}/{PRACTICE_EXAM_MAX_SCORE}</p>
        </div>
      </div>
      <div className="mt-6 flex h-48 items-end gap-3 border-b border-slate-300 pb-2">
        {history.map((point) => {
          const height = Math.max(8, (point.score / PRACTICE_EXAM_MAX_SCORE) * 100)
          const tone =
            point.score >= 25 ? 'from-emerald-500 to-emerald-300' : point.score >= 20 ? 'from-amber-500 to-amber-300' : 'from-rose-500 to-rose-300'
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.id}>
              <span className="text-xs font-semibold text-slate-700">{point.score}</span>
              <div className="flex w-full items-end justify-center" style={{ height: '140px' }}>
                <div
                  className={`w-full max-w-12 rounded-t-xl bg-gradient-to-t ${tone}`}
                  style={{ height: `${height}%` }}
                  title={`${point.label} : ${point.score}/${PRACTICE_EXAM_MAX_SCORE}`}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{point.label}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-blue-300 to-transparent" aria-hidden="true" />
      <p className="mt-2 text-center text-xs font-semibold text-slate-400">Ligne de référence : 25/31</p>
    </section>
  )
}
