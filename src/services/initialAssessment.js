import {
  ASSESSMENT_STATUS_LABELS,
  computeAssessmentScores,
  recommendHoursFromScore,
} from '../data/initialAssessmentForm'
import { supabase } from '../lib/supabase'
import { toUserError } from '../lib/userFacingError'
import { resolveAcceptedRecommendedHours } from '../lib/initialAssessmentUtils'
import { sumCompletedLessonHours } from './studentLessonObservations'

// « Effectué » est le statut posé par le planning ; « Confirmé » ne compte que si la leçon est passée.
const COMPLETED_APPOINTMENT_STATUSES = ['Effectué', 'Effectue', 'Réalisé', 'Realise', 'Confirmé', 'completed', 'done', 'Terminé']

export function formatAssessmentStatus(status) {
  const label = ASSESSMENT_STATUS_LABELS[status]
  if (label) return label
  if (typeof status === 'string') return status
  return ASSESSMENT_STATUS_LABELS.pending
}

export async function respondToRecommendedHours(assessmentId, response) {
  if (!assessmentId || !['accepted', 'declined'].includes(response)) {
    return { assessment: null, error: new Error('Réponse invalide') }
  }
  try {
    const { error } = await supabase.rpc('student_respond_recommended_hours', {
      p_assessment_id: assessmentId,
      p_response: response,
    })
    if (error) throw error

    const { data, error: fetchError } = await supabase
      .from('student_initial_assessments')
      .select(`
        *,
        teacher:completed_by(full_name)
      `)
      .eq('id', assessmentId)
      .maybeSingle()
    if (fetchError) throw fetchError
    return { assessment: data, error: null }
  } catch (error) {
    return { assessment: null, error: toUserError(error, 'save') }
  }
}

export async function getInitialAssessmentForStudent(studentId) {
  if (!studentId) return { assessment: null, error: null }
  try {
    const { data, error } = await supabase
      .from('student_initial_assessments')
      .select(`
        *,
        teacher:completed_by(full_name)
      `)
      .eq('student_id', studentId)
      .maybeSingle()
    if (error) throw error
    return { assessment: data, error: null }
  } catch (error) {
    return { assessment: null, error }
  }
}

export async function saveInitialAssessmentStep({
  assessmentId,
  studentId,
  organizationId,
  answers,
  status = 'in_progress',
  completedBy = null,
  markCompleted = false,
  commentOnly = false,
  updateCompleted = false,
}) {
  try {
    const now = new Date().toISOString()

    if (commentOnly && assessmentId) {
      const { data, error } = await supabase
        .from('student_initial_assessments')
        .update({ answers, updated_at: now })
        .eq('id', assessmentId)
        .select(`
          *,
          teacher:completed_by(full_name)
        `)
        .single()
      if (error) throw error
      return { assessment: data, error: null }
    }

    const scores = computeAssessmentScores(answers)
    const recommendation = recommendHoursFromScore(scores)

    const row = {
      answers,
      positive_score: scores.positiveScore,
      negative_score: scores.negativeScore,
      final_score: scores.finalScore,
      result_level: recommendation.resultLevel,
      recommended_hours_min: recommendation.recommendedHoursMin,
      recommended_hours_max: recommendation.recommendedHoursMax,
      status: markCompleted || updateCompleted ? 'completed' : status,
      updated_at: now,
      ...(markCompleted
        ? {
          recommended_hours_response: 'pending',
          recommended_hours_responded_at: null,
          completed_at: now,
          completed_by: completedBy,
        }
        : {}),
    }

    if (assessmentId) {
      const { data, error } = await supabase
        .from('student_initial_assessments')
        .update(row)
        .eq('id', assessmentId)
        .select(`
          *,
          teacher:completed_by(full_name)
        `)
        .single()
      if (error) throw error
      return { assessment: data, error: null }
    }

    const { data, error } = await supabase
      .from('student_initial_assessments')
      .insert({
        organization_id: organizationId,
        student_id: studentId,
        ...row,
      })
      .select(`
        *,
        teacher:completed_by(full_name)
      `)
      .single()
    if (error) throw error
    return { assessment: data, error: null }
  } catch (error) {
    return { assessment: null, error: toUserError(error, 'save') }
  }
}

export async function listInitialAssessmentsForStudents(studentIds = []) {
  if (!studentIds.length) return { assessments: [], error: null }
  try {
    const { data, error } = await supabase
      .from('student_initial_assessments')
      .select(`
        *,
        teacher:completed_by(full_name)
      `)
      .in('student_id', studentIds)
    if (error) throw error
    return { assessments: data || [], error: null }
  } catch (error) {
    return { assessments: [], error }
  }
}

export async function getStudentHoursSummary(studentId) {
  if (!studentId) {
    return {
      contractHours: 0,
      completedHours: 0,
      remainingHours: 0,
      recommendedHours: null,
    }
  }

  try {
    const [studentRes, contractRes, appointmentsRes, assessmentRes, lessonHoursRes, lessonsRes] =
      await Promise.all([
      supabase.from('students').select('extra_hours, package_id').eq('id', studentId).maybeSingle(),
      supabase
        .from('contracts')
        .select('extra_hours, package:package_id(included_hours)')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('appointments')
        .select('duration_minutes, status, kind, starts_at')
        .eq('student_id', studentId)
        .in('status', COMPLETED_APPOINTMENT_STATUSES),
      getInitialAssessmentForStudent(studentId),
      supabase.rpc('student_completed_lesson_hours', { p_student_id: studentId }),
      supabase
        .from('student_lesson_observations')
        .select('duration, status')
        .eq('student_id', studentId),
    ])

    const student = studentRes.data
    const contract = contractRes.data
    const appointments = appointmentsRes.data
    const assessment = assessmentRes.assessment

    const packageHours = Number(contract?.package?.included_hours || 0)
    const extraHours = Number(contract?.extra_hours ?? student?.extra_hours ?? 0)
    const contractHours = packageHours + extraHours

    let completedHours = Number(lessonHoursRes.data)
    if (lessonHoursRes.error || Number.isNaN(completedHours)) {
      completedHours = sumCompletedLessonHours(lessonsRes.data || [])
    }

    const appointmentMinutes = (appointments || [])
      .filter((row) => {
        if (row.status === 'Confirmé' && row.starts_at && new Date(row.starts_at) > new Date()) return false
        const kind = String(row.kind || '').toLowerCase()
        return !kind || kind.includes('leçon') || kind.includes('lecon') || kind === 'lesson'
      })
      .reduce((sum, row) => sum + Number(row.duration_minutes || 60), 0)
    const appointmentHours = Math.round((appointmentMinutes / 60) * 10) / 10

    if (appointmentHours > completedHours) {
      completedHours = appointmentHours
    }

    completedHours = Math.round(completedHours * 10) / 10
    const recommended = assessment?.status === 'completed'
      ? assessment.recommended_hours_max === assessment.recommended_hours_min
        ? assessment.recommended_hours_min
        : `${assessment.recommended_hours_min} à ${assessment.recommended_hours_max}`
      : null

    const acceptedTargetHours = resolveAcceptedRecommendedHours(assessment)
    const remainingHours =
      acceptedTargetHours != null
        ? Math.max(Math.round((acceptedTargetHours - completedHours) * 10) / 10, 0)
        : contractHours > 0
          ? Math.max(Math.round((contractHours - completedHours) * 10) / 10, 0)
          : null

    return {
      contractHours,
      completedHours,
      remainingHours,
      acceptedTargetHours,
      recommendedHours: recommended,
      assessment: assessment || null,
    }
  } catch {
    return {
      contractHours: 0,
      completedHours: 0,
      remainingHours: null,
      acceptedTargetHours: null,
      recommendedHours: null,
      assessment: null,
    }
  }
}
