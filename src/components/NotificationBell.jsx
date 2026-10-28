import { Bell } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAutomatedReminderRoute,
  getExpiryReminderRoute,
  getMessagesRoute,
  getPreRegistrationsRoute,
  getStudentDossierRoute,
} from '../lib/messagesRoutes'
import {
  getNotificationPreview,
  getNotificationTitle,
  listRecentNotifications,
  markNotificationRead,
  subscribeToNotifications,
} from '../services/notifications'

const formatWhen = (iso) => {
  if (!iso) return ''
  try {
    const date = new Date(iso)
    const now = new Date()
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    if (sameDay) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

function unreadIndicatorClass(notification) {
  if (notification.notification_type === 'automated_reminder') {
    return 'bg-red-500'
  }
  return 'bg-blue-600'
}

export default function NotificationBell({ role, unreadCount }) {
  const navigate = useNavigate()
  const { profileId } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const messagesRoute = getMessagesRoute(role)
  const preRegistrationsRoute = getPreRegistrationsRoute(role)

  const refresh = useCallback(() => {
    if (!profileId) {
      setItems([])
      return
    }
    setLoading(true)
    listRecentNotifications(profileId).then((rows) => {
      setItems(rows)
      setLoading(false)
    })
  }, [profileId])

  useEffect(() => {
    if (!open) return undefined
    refresh()
    if (!profileId) return undefined
    const unsubscribe = subscribeToNotifications(profileId, refresh, 'panel')
    return unsubscribe
  }, [open, profileId, refresh])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event) => {
      const target = event.target
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    const timerId = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown)
    }, 0)

    return () => {
      window.clearTimeout(timerId)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const markRead = async (notification) => {
    if (!notification?.is_read) {
      await markNotificationRead(notification.id)
      setItems((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      )
    }
  }

  const openNotification = async (notification) => {
    await markRead(notification)
    setOpen(false)

    if (notification.notification_type === 'pre_registration') {
      if (preRegistrationsRoute) {
        navigate(preRegistrationsRoute)
        return
      }
      if (role === 'teacher') {
        navigate('/teacher/students')
        return
      }
    }

    if (notification.notification_type === 'expiry_reminder') {
      const route = getExpiryReminderRoute(role, notification.expiry_kind)
      if (route) {
        navigate(route)
        return
      }
    }

    if (notification.notification_type === 'exam_scheduled') {
      if (role === 'student') {
        navigate('/student/dashboard')
        return
      }
    }

    if (notification.notification_type === 'automated_reminder') {
      const route = getAutomatedReminderRoute(role, notification.reminder_kind, notification.student_id)
      if (route) {
        navigate(route)
        return
      }
    }

    if (notification.notification_type === 'license_obtained') {
      const route = getStudentDossierRoute(role, notification.student_id)
        || getAutomatedReminderRoute(role, notification.reminder_kind, notification.student_id)
      if (route) {
        navigate(route)
        return
      }
    }

    if (notification.notification_type === 'access_expiring' && role === 'student') {
      navigate('/student/dashboard')
      return
    }

    if (!messagesRoute || !notification?.conversation_id) return
    navigate(messagesRoute, { state: { conversationId: notification.conversation_id } })
  }

  const openStudentDossier = async (event, notification) => {
    event.stopPropagation()
    const route = getStudentDossierRoute(role, notification.student_id)
      || getAutomatedReminderRoute(role, notification.reminder_kind, notification.student_id)
    if (!route) return
    await markRead(notification)
    setOpen(false)
    navigate(route)
  }

  const openMessages = () => {
    if (!messagesRoute) return
    setOpen(false)
    navigate(messagesRoute)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => setOpen((current) => !current)}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-slate-500 shadow-sm transition hover:text-blue-600 ${
          open ? 'border-blue-300 text-blue-600' : 'border-blue-100 hover:border-blue-300'
        }`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[100] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg shadow-blue-500/10"
        >
          <div className="flex items-center justify-between border-b border-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {messagesRoute && (
              <button
                type="button"
                onClick={openMessages}
                className="text-xs font-medium text-blue-600 transition hover:text-blue-700"
              >
                Voir la messagerie
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Chargement…</p>
            ) : items.length === 0 ? (
              messagesRoute ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={openMessages}
                  className="w-full px-4 py-6 text-center text-sm text-slate-500 transition hover:bg-blue-50/80 hover:text-slate-700"
                >
                  Aucune notification
                  <span className="mt-1 block text-xs font-medium text-blue-600">Ouvrir la messagerie</span>
                </button>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Aucune notification</p>
              )
            ) : (
              <ul className="divide-y divide-blue-50">
                {items.map((item) => {
                  const senderName = getNotificationTitle(item)
                  const unread = !item.is_read
                  const showDossierAction = (
                    (item.notification_type === 'automated_reminder' || item.notification_type === 'license_obtained')
                    && item.student_id
                  )
                  return (
                    <li key={item.id}>
                      <div
                        role="menuitem"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openNotification(item)
                          }
                        }}
                        className={`flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-blue-50/80 ${
                          unread ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openNotification(item)}
                          className="flex w-full flex-col gap-2 text-left"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                              {unread && (
                                <span
                                  aria-hidden
                                  className={`h-2 w-2 shrink-0 rounded-full ${unreadIndicatorClass(item)}`}
                                />
                              )}
                              <span className={`truncate text-sm ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                {senderName}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-400">{formatWhen(item.created_at)}</span>
                          </span>
                          <span className={`line-clamp-3 text-sm ${unread ? 'text-slate-600' : 'text-slate-500'}`}>
                            {getNotificationPreview(item)}
                          </span>
                        </button>
                        {showDossierAction && (
                          <button
                            type="button"
                            onClick={(event) => openStudentDossier(event, item)}
                            className="inline-flex w-fit items-center gap-1 rounded-xl bg-[#1769FF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            ➡️ Ouvrir le dossier élève
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
