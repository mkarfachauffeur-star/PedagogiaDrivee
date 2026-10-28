import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRemcUnlock } from '../../hooks/useRemcUnlock'
import { useStudentAccount } from '../../hooks/useStudentAccount'
import { fetchStudentRemcStats } from '../../services/remcStats'
import { listLessonObservationsForStudent } from '../../services/studentLessonObservations'
import RemcProgressOverview from '../../components/remc/RemcProgressOverview'
import PanelTabs from '../../components/ui/PanelTabs'
import PageHeader from '../../components/ui/PageHeader'
import PaginationBar from '../../components/ui/PaginationBar'
import { useClientPagination } from '../../hooks/useClientPagination'
import { formatDateTime } from '../../lib/format'

function formatLessonDateFr(dateString) {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  if (!year || !month || !day) return dateString
  return `${day}/${month}/${year}`
}

function buildLessonHistory(lessons = []) {
  return lessons
    .map((lesson) => ({
      id: `lesson-${lesson.id}`,
      sortAt: lesson.openedAt || `${lesson.date || '1970-01-01'}T${lesson.time || '00:00'}`,
      lesson,
    }))
    .sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt))
}


export default function StudentCompetencyReportsPage() {
  const { profileId } = useAuth()
  const { student, loading: accountLoading } = useStudentAccount()
  const {
    unlockState,
    globalProgress,
    itemProgress,
    loading: remcLoading,
  } = useRemcUnlock(profileId)

  const [stats, setStats] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loadingExtras, setLoadingExtras] = useState(true)
  const [viewTab, setViewTab] = useState('overview')

  const lessonHistory = useMemo(() => buildLessonHistory(lessons), [lessons])

  const {
    page: historyPage,
    setPage: setHistoryPage,
    totalPages: historyTotalPages,
    totalItems: historyTotalItems,
    pageItems: historyPageItems,
    pageSize: historyPageSize,
  } = useClientPagination(lessonHistory, { pageSize: 8 })

  useEffect(() => {
    if (!student?.id) {
      setStats(null)
      setLessons([])
      setLoadingExtras(false)
      return
    }

    let cancelled = false
    setLoadingExtras(true)

    Promise.all([
      fetchStudentRemcStats(student.id),
      listLessonObservationsForStudent(student.id),
    ]).then(([{ stats: nextStats }, { lessons: nextLessons }]) => {
      if (cancelled) return
      setStats(nextStats)
      setLessons(nextLessons || [])
      setLoadingExtras(false)
    })

    return () => {
      cancelled = true
    }
  }, [student?.id])

  const loading = accountLoading || remcLoading || loadingExtras

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <p className="text-sm font-semibold text-slate-500">Chargement de vos bilans REMC…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <PageHeader
          description="Vos compétences REMC, vos leçons de conduite et les observations de votre enseignant."
          title="Historique des leçons"
        />
      </div>

      <PanelTabs
        activeId={viewTab}
        className="mb-6"
        onChange={setViewTab}
        tabs={[
          { id: 'overview', label: 'Vue d\'ensemble' },
          { id: 'history', label: 'Historique', badge: lessonHistory.length },
        ]}
      />

      {viewTab === 'overview' && (
      <section className="card-panel-lg mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-500">Progression globale</p>
            <p className="text-4xl font-semibold text-indigo-700">{globalProgress} %</p>
            <div className="mt-3 h-3 max-w-md overflow-hidden rounded-full bg-indigo-50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-700 to-violet-400 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, globalProgress))}%` }}
              />
            </div>
          </div>
          {stats?.item_counts && (
            <div className="text-sm font-semibold text-slate-600">
              {stats.item_counts.validated} / {stats.item_counts.total} sous-compétences validées
            </div>
          )}
        </div>
        <div className="mt-4">
          <RemcProgressOverview
            compact
            globalProgress={globalProgress}
            itemProgress={itemProgress}
            showGlobalPercent={false}
            unlockState={unlockState}
          />
        </div>
      </section>
      )}

      {viewTab === 'history' && (
      <section className="card-panel-lg">
        <h2 className="text-xl font-semibold text-slate-900">Historique récent</h2>
        <p className="mt-1 text-sm text-slate-500">
          Leçons de conduite et observations partagées par votre enseignant.
        </p>
        {lessonHistory.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Aucune leçon enregistrée pour le moment.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {historyPageItems.map((item) => {
              const lesson = item.lesson
              const lessonTitle = [
                lesson.date ? `Le ${formatLessonDateFr(lesson.date)}` : 'Leçon',
                lesson.time ? `· ${lesson.time}` : '',
                lesson.duration ? `· ${lesson.duration}` : '',
              ].filter(Boolean).join(' ')

              return (
                <li className="py-4" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Leçon
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {lesson.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{lessonTitle}</p>
                      {lesson.teacherName && (
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Par {lesson.teacherName}
                        </p>
                      )}
                      {lesson.sharedWithStudent && lesson.observations ? (
                        <p className="mt-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm leading-6 text-slate-700">
                          <span className="font-semibold text-blue-800">Observations : </span>
                          {lesson.observations}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          Observations non partagées avec l&apos;élève.
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs font-semibold text-slate-400">
                      {formatDateTime(item.sortAt)}
                    </time>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <PaginationBar
          className="mt-4"
          onPageChange={setHistoryPage}
          page={historyPage}
          pageSize={historyPageSize}
          totalItems={historyTotalItems}
          totalPages={historyTotalPages}
        />
      </section>
      )}
    </div>
  )
}
