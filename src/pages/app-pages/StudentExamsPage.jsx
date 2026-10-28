import { useMemo, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import { permitVerificationQuestions } from '../../data/permitVerificationQuestions'

const categories = [
  'Vérifications extérieures',
  'Vérifications intérieures',
  'Questions en lien avec la sécurité routière',
  'Premiers secours',
]

function normalizeQuestion(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getUniqueQuestions(questions) {
  const seen = new Set()
  return questions.filter((question) => {
    const key = normalizeQuestion(question.question)
    const answer = question.answer || ''
    if (!key || seen.has(key) || answer === 'Réponse à vérifier avec l’enseignant.' || answer.length < 8) return false
    seen.add(key)
    return true
  })
}

function categoryTone(category) {
  if (category === 'Vérifications extérieures') return 'cyan'
  if (category === 'Vérifications intérieures') return 'violet'
  if (category === 'Questions en lien avec la sécurité routière') return 'amber'
  return 'emerald'
}

function toneClasses(tone) {
  const tones = {
    cyan: 'border-blue-200/85 bg-gradient-to-br from-blue-100/75 via-slate-50/95 to-sky-100/70 text-blue-900 shadow-[0_8px_22px_rgba(14,116,144,0.12)]',
    violet: 'border-violet-200/85 bg-gradient-to-br from-violet-100/75 via-slate-50/95 to-indigo-100/70 text-violet-900 shadow-[0_8px_22px_rgba(109,40,217,0.12)]',
    amber: 'border-amber-200/85 bg-gradient-to-br from-amber-100/75 via-slate-50/95 to-orange-100/70 text-amber-900 shadow-[0_8px_22px_rgba(217,119,6,0.12)]',
    emerald: 'border-emerald-200/85 bg-gradient-to-br from-emerald-100/75 via-slate-50/95 to-blue-100/70 text-emerald-900 shadow-[0_8px_22px_rgba(5,150,105,0.12)]',
  }
  return tones[tone] || tones.cyan
}

export default function StudentExamsPage() {
  const questions = useMemo(() => getUniqueQuestions(permitVerificationQuestions), [])
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [search, setSearch] = useState('')
  const [openedAnswers, setOpenedAnswers] = useState({})

  const normalizedSearch = normalizeQuestion(search)
  const filteredQuestions = useMemo(
    () => questions.filter((question) => {
      const searchable = normalizeQuestion(`${question.question} ${question.answer} ${question.category} ${question.source}`)
      return question.category === activeCategory && (!normalizedSearch || searchable.includes(normalizedSearch))
    }),
    [activeCategory, normalizedSearch, questions],
  )

  const groupedCounts = categories.map((category) => ({
    category,
    count: questions.filter((question) => question.category === category).length,
  }))

  const toggleAnswer = (questionId) => {
    setOpenedAnswers((current) => ({ ...current, [questionId]: !current[questionId] }))
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader description="Les vérifications et les questions de l’examen pratique, classées par catégorie." title="Examens" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groupedCounts.map(({ category, count }) => (
          <article
            className={`group flex min-h-[176px] flex-col rounded-xl border p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,23,42,0.14)] ${toneClasses(categoryTone(category))}`}
            key={category}
          >
            <p className="text-center text-sm font-semibold tracking-tight text-slate-600">{category}</p>
            <div className="flex flex-1 items-center justify-center py-2">
              <p className="text-center text-5xl font-semibold leading-none tracking-tight text-slate-950">{count}</p>
            </div>
            <p className="text-center text-xs font-semibold text-slate-500">questions avec reponses</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Recherche intelligente</span>
          <input
            className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="feux, premiers secours, triangle, huile, frein..."
            value={search}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeCategory === category ? 'bg-[#1769FF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-700">Mode apprentissage</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{activeCategory}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Cliquez sur une carte pour afficher la réponse officielle. Aucun QCU aléatoire n’est affiché.
            </p>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {filteredQuestions.length} résultat{filteredQuestions.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredQuestions.map((question, index) => {
            const opened = Boolean(openedAnswers[question.id])
            return (
              <article className="rounded-xl border border-slate-300 bg-slate-50 p-4 transition hover:shadow-lg" key={question.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                    {index + 1}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-300">
                    {question.source}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-7 text-slate-950">{question.question}</h3>
                {opened && (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-4 text-sm font-semibold leading-7 text-slate-700 shadow-sm">
                    {question.answer}
                  </div>
                )}
                <button
                  className="mt-4 rounded-2xl bg-[#1769FF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  onClick={() => toggleAnswer(question.id)}
                  type="button"
                >
                  {opened ? 'Masquer la réponse' : 'Voir réponse'}
                </button>
              </article>
            )
          })}
        </div>

        {!filteredQuestions.length && (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
            Aucune question ne correspond à cette recherche dans la catégorie sélectionnée.
          </p>
        )}
      </section>
    </div>
  )
}
