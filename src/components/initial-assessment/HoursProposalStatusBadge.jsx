import { getHoursProposalStatus } from '../../lib/initialAssessmentUtils'

const TONE_CLASSES = {
  accepted: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  declined: 'border-rose-200 bg-rose-50 text-rose-800',
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
}

export default function HoursProposalStatusBadge({ assessment, compact = false }) {
  const status = getHoursProposalStatus(assessment)

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs'
      } ${TONE_CLASSES[status.tone]}`}
    >
      {status.label}
    </span>
  )
}
