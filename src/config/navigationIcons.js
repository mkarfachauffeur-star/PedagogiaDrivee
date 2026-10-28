import {
  Activity,
  Award,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  Car,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileSignature,
  FileText,
  GraduationCap,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Monitor,
  Package,
  Receipt,
  ScrollText,
  Settings,
  Star,
  Tag,
  Target,
  UserPlus,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'

/** Icônes de navigation, identiques d'un espace à l'autre pour une même rubrique. */
const BY_SEGMENT = {
  dashboard: LayoutDashboard,
  planning: CalendarDays,
  'initial-assessment': ClipboardCheck,
  lessons: BookOpen,
  'competency-reports': History,
  'accompanied-driving': Car,
  'next-lesson': CalendarClock,
  documents: FileText,
  messages: MessageSquare,
  charter: ScrollText,
  teachers: UserRound,
  students: GraduationCap,
  'simulator-sessions': Monitor,
  'pre-registrations': ClipboardList,
  inscriptions: UserPlus,
  users: Users,
  vehicles: Car,
  contracts: FileSignature,
  contract: FileSignature,
  payments: Wallet,
  paiements: Wallet,
  finance: Wallet,
  packages: Tag,
  exports: Download,
  statistics: LineChart,
  settings: Settings,
  exams: Target,
  'license-results': Award,
  profile: UserRound,
  prospects: Inbox,
  reviews: Star,
  organizations: Building2,
  subscriptions: Package,
  pricing: Tag,
  audit: Activity,
}

const BY_HREF = {
  '/manager/users': KeyRound,
  '/platform/payments': Receipt,
}

export function navigationIconFor(href = '') {
  if (BY_HREF[href]) return BY_HREF[href]
  const segments = href.split('/').filter(Boolean)
  const segment = segments.findLast((part) => BY_SEGMENT[part])
  return BY_SEGMENT[segment] || null
}
