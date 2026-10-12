import { ChevronLeft, LogOut, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import NotificationBell from '../components/NotificationBell'
import PlatformNotificationBell from '../components/PlatformNotificationBell'
import OrgStatusBanner from '../components/OrgStatusBanner'
import PageSeo from '../components/seo/PageSeo'
import { NAVIGATION } from '../config/navigation'
import { useAuth } from '../context/AuthContext'
import { SITE_NAME } from '../lib/seo'
import { useStudentTrack } from '../hooks/useStudentTrack'
import { useProspectNotifications } from '../hooks/useProspectNotifications'
import { usePlatformUnreadCount } from '../hooks/usePlatformUnreadCount'
import { useUnreadCount } from '../hooks/useUnreadCount'
import { getTrackLabel } from '../lib/studentTrack'
import ManagerOnboardingTutorial from '../components/onboarding/ManagerOnboardingTutorial'
import DeleteAccountModal from '../components/account/DeleteAccountModal'
import { roleLabelFor } from '../lib/genderedRoles'

export default function DashboardLayout({ role, children, fullWidth = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, profileId, profile, user } = useAuth()
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const config = NAVIGATION[role]
  const displayName =
    profile?.full_name?.trim()
    || String(user?.user_metadata?.full_name || '').trim()
    || String(profile?.email || user?.email || '').split('@')[0]?.trim()
    || ''
  const { navItems, track, loading: trackLoading, student: trackedStudent } = useStudentTrack(role === 'student' ? profileId : null)
  const studentFullName = [trackedStudent?.first_name, trackedStudent?.last_name].filter(Boolean).join(' ').trim()
    || displayName
  const formationLabel = trackedStudent?.package_name || trackedStudent?.formation_type || ''
  const studentIdentity = [...new Set([
    getTrackLabel(track),
    formationLabel,
    trackedStudent?.status,
  ].filter(Boolean))].join(' · ')
  const sidebarUser = role === 'student'
    ? {
        name: studentFullName || 'Élève',
        role: studentIdentity || roleLabelFor(role, profile?.gender),
      }
    : config?.user
      ? {
          name: displayName || 'Mon compte',
          role: roleLabelFor(role, profile?.gender),
        }
      : null
  const items = role === 'student' ? navItems : config.items
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // Le badge n'apparaît que lorsqu'il y a réellement des messages non lus
  // (compteur Supabase temps réel ; 0 tant qu'aucune session réelle).
  const notificationCount = useUnreadCount()
  const { newCount: newProspectCount } = useProspectNotifications()
  const { count: platformNotificationCount } = usePlatformUnreadCount(role === 'super_admin' ? profileId : null)

  // Chaque navigation repart du haut (inclut les changements de query/hash).
  useEffect(() => {
    const scrollNow = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    }
    scrollNow()
    const raf = window.requestAnimationFrame(scrollNow)
    return () => window.cancelAnimationFrame(raf)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    if (!sidebarOpen) return undefined

    const html = document.documentElement
    const previousOverflow = html.style.overflow
    html.style.overflow = 'hidden'

    return () => {
      html.style.overflow = previousOverflow
    }
  }, [sidebarOpen])

  if (fullWidth) {
    return (
      <div className="full-width-page min-h-screen w-full bg-[#f0f7ff]">
        <PageSeo
          description="Espace privé Pedagogia Drive réservé aux utilisateurs authentifiés."
          noindex
          path={location.pathname}
          title={`${config?.label || 'Espace'} — ${SITE_NAME}`}
        />
        {children}
      </div>
    )
  }

  const closeSidebar = () => setSidebarOpen(false)
  const activeItem = items.find((item) => location.pathname === item.href)

  const isMessagesNavItem = (href) => href.endsWith('/messages')

  const renderUnreadBadge = (compact = false) => {
    if (notificationCount <= 0) return null
    const label = notificationCount > 99 ? '99+' : notificationCount
    return (
      <span
        aria-label={`${notificationCount} message${notificationCount > 1 ? 's' : ''} non lu${notificationCount > 1 ? 's' : ''}`}
        className={`flex shrink-0 items-center justify-center rounded-full bg-red-500 font-bold text-white ${
          compact
            ? 'absolute -right-1 -top-1 h-4 min-w-4 px-0.5 text-[10px]'
            : 'ml-auto h-5 min-w-5 px-1.5 text-[11px] leading-none'
        }`}
      >
        {label}
      </span>
    )
  }

  const renderNavBadge = (count, compact = false) => {
    if (count <= 0) return null
    const label = count > 99 ? '99+' : count
    return (
      <span
        aria-label={`${count} nouvelle${count > 1 ? 's' : ''} demande${count > 1 ? 's' : ''}`}
        className={`flex shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-white ${
          compact
            ? 'absolute -right-1 -top-1 h-4 min-w-4 px-0.5 text-[10px]'
            : 'ml-auto h-5 min-w-5 px-1.5 text-[11px] leading-none'
        }`}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="pd-shell relative min-h-screen w-full lg:flex">
      <PageSeo
        description="Espace privé Pedagogia Drive réservé aux utilisateurs authentifiés."
        noindex
        path={location.pathname}
        title={`${config?.label || 'Espace'} — ${SITE_NAME}`}
      />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="app-sidebar-overlay fixed inset-0 z-[70] bg-slate-900/20 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`app-sidebar fixed left-0 top-0 z-[80] h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] lg:pointer-events-auto lg:sticky lg:z-50 lg:h-screen lg:max-h-screen lg:shrink-0 ${sidebarCollapsed ? 'lg:w-[84px]' : 'lg:w-[280px]'} w-[min(280px,100vw)]
          border-r border-blue-100/90 bg-white text-slate-800 shadow-[var(--shadow-sidebar)]
          transition-all duration-300 ease-out
          ${sidebarOpen ? 'is-open translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <button
          aria-label={sidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          className="absolute -right-4 top-8 z-[90] hidden h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-white text-slate-500 shadow-md transition hover:border-blue-300 hover:text-blue-600 lg:flex"
          onClick={() => setSidebarCollapsed((current) => !current)}
          title={sidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          type="button"
        >
          <ChevronLeft className={`h-4 w-4 transition ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex h-full max-h-[100dvh] min-h-0 flex-col">
          <div
            className={`border-b border-blue-50 px-5 py-5 transition-all duration-300 ${sidebarCollapsed ? 'lg:flex lg:justify-center lg:px-3' : ''}`}
          >
            <Link aria-label="PEDAGOGIA DRIVE" onClick={closeSidebar} to="/">
              <BrandLogo animated={false} compact={sidebarCollapsed} idPrefix={`sidebar-${role}`} variant="light" />
            </Link>
            {!sidebarCollapsed && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {config.spaceLabel || 'Espace professionnel'}
              </p>
            )}
          </div>

          {sidebarUser && (
            <div
              className={`mx-4 mt-4 rounded-2xl border border-blue-100/80 bg-blue-50/70 p-3 text-center transition-all duration-300 ${sidebarCollapsed ? 'lg:mx-3 lg:px-2' : ''}`}
            >
              <div
                className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:hidden' : ''}`}
              >
                <p className="truncate text-sm font-semibold text-slate-900">{sidebarUser.name}</p>
                {sidebarUser.role && (
                  <p className="text-xs text-slate-500">{sidebarUser.role}</p>
                )}
              </div>
            </div>
          )}

          <nav
            className={`flex-1 space-y-1 overflow-y-auto px-3 py-4 ${sidebarCollapsed ? 'lg:px-2' : ''}`}
            aria-label="Navigation principale"
          >
            {items.map((item) => {
              const active = location.pathname === item.href
              const showMessagesBadge = isMessagesNavItem(item.href)
              const showProspectBadge = role === 'super_admin' && item.badgeKey === 'prospects' && newProspectCount > 0
              const showReviewBadge = role === 'super_admin' && item.badgeKey === 'reviews' && platformNotificationCount > 0
              return (
                <Link
                  key={item.href}
                  title={item.label}
                  to={item.href}
                  onClick={closeSidebar}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} ${
                    active
                      ? 'border-2 border-blue-300 bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10'
                      : 'border border-transparent text-slate-600 hover:border-blue-100 hover:bg-blue-50/80 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-400" />
                  )}
                  <span
                    className={`pd-nav-icon relative ${active ? 'border-blue-300 bg-blue-50 text-blue-600' : 'group-hover:border-blue-300 group-hover:bg-white'}`}
                  >
                    {item.icon}
                    {showMessagesBadge && sidebarCollapsed && (
                      <span className="hidden lg:block">{renderUnreadBadge(true)}</span>
                    )}
                    {showProspectBadge && sidebarCollapsed && (
                      <span className="hidden lg:block">{renderNavBadge(newProspectCount, true)}</span>
                    )}
                    {showReviewBadge && sidebarCollapsed && (
                      <span className="hidden lg:block">{renderNavBadge(platformNotificationCount, true)}</span>
                    )}
                  </span>
                  <span
                    className={`truncate transition-all duration-300 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : 'opacity-100'}`}
                  >
                    {item.label}
                  </span>
                  {showMessagesBadge && (
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{renderUnreadBadge()}</span>
                  )}
                  {showProspectBadge && (
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{renderNavBadge(newProspectCount)}</span>
                  )}
                  {showReviewBadge && (
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{renderNavBadge(platformNotificationCount)}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className={`border-t border-blue-50 p-4 ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
            <button
              type="button"
              onClick={async () => {
                await signOut()
                navigate('/login', { replace: true })
              }}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 ${sidebarCollapsed ? 'lg:px-2' : ''}`}
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span
                className={`truncate transition-all duration-300 ${sidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : 'opacity-100'}`}
              >
                Déconnexion
              </span>
            </button>
            {role !== 'super_admin' && (
              <button
                type="button"
                onClick={() => setDeleteAccountOpen(true)}
                className={`mt-2 w-full text-center text-xs font-medium text-slate-500 underline-offset-2 hover:text-red-600 hover:underline ${sidebarCollapsed ? 'lg:hidden' : ''}`}
              >
                Supprimer mon compte
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="pd-main-content">
        <header className="pd-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                {activeItem?.label || 'Tableau de bord'}
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">
                {role === 'student' && !trackLoading
                  ? (studentFullName || getTrackLabel(track))
                  : (sidebarUser?.name || 'PEDAGOGIA DRIVE')}
              </p>
              {role === 'student' && !trackLoading && studentIdentity && (
                <p className="max-w-[14rem] truncate text-[11px] font-medium text-slate-500 sm:max-w-xs">
                  {studentIdentity}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {role === 'super_admin' ? (
              <PlatformNotificationBell unreadCount={platformNotificationCount} />
            ) : (
              <NotificationBell role={role} unreadCount={notificationCount} />
            )}
            {sidebarUser && (
              <div className="hidden items-center rounded-xl border border-blue-100 bg-white px-3 py-2 shadow-sm sm:flex">
                <span className="text-sm font-medium text-slate-700">{sidebarUser.name}</span>
              </div>
            )}
          </div>
        </header>

        <main className="pd-main min-w-0 flex-1 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <OrgStatusBanner />
          <div className="page-shell w-full min-w-0" key={location.pathname}>
            {children}
          </div>
        </main>
      </div>

      {role === 'manager' && <ManagerOnboardingTutorial />}
      {role !== 'super_admin' && (
        <DeleteAccountModal
          open={deleteAccountOpen}
          onClose={() => setDeleteAccountOpen(false)}
          onDeleted={async () => {
            setDeleteAccountOpen(false)
            await signOut()
            navigate('/login', { replace: true })
          }}
        />
      )}
    </div>
  )
}
