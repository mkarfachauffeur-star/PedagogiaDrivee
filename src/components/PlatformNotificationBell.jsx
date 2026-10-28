import { Bell } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  listRecentPlatformNotifications,
  markPlatformNotificationRead,
  subscribeToPlatformNotifications,
} from '../services/platformNotifications'

const formatWhen = (iso) => {
  if (!iso) return ''
  try {
    const date = new Date(iso)
    const now = new Date()
    const sameDay =
      date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate()
    if (sameDay) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export default function PlatformNotificationBell({ unreadCount }) {
  const navigate = useNavigate()
  const { profileId } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)

  const refresh = useCallback(() => {
    if (!profileId) {
      setItems([])
      return
    }
    setLoading(true)
    listRecentPlatformNotifications(profileId).then((rows) => {
      setItems(rows)
      setLoading(false)
    })
  }, [profileId])

  useEffect(() => {
    if (!open) return undefined
    refresh()
    if (!profileId) return undefined
    return subscribeToPlatformNotifications(profileId, refresh)
  }, [open, profileId, refresh])

  useEffect(() => {
    if (!profileId) return undefined
    return subscribeToPlatformNotifications(profileId, refresh)
  }, [profileId, refresh])

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

  const openNotification = async (notification) => {
    if (!notification?.is_read) {
      await markPlatformNotificationRead(notification.id)
      setItems((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      )
    }
    setOpen(false)
    navigate('/platform/reviews')
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Notifications plateforme"
        aria-expanded={open}
        aria-haspopup="true"
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
          aria-label="Notifications plateforme"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[100] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg shadow-blue-500/10"
        >
          <div className="flex items-center justify-between border-b border-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/platform/reviews')
              }}
              className="text-xs font-medium text-blue-600 transition hover:text-blue-700"
            >
              Voir les avis
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Aucune notification</p>
            ) : (
              <ul className="divide-y divide-blue-50">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openNotification(item)}
                      className={`flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-blue-50/80 ${
                        !item.is_read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          {!item.is_read && (
                            <span
                              aria-hidden
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                item.is_priority ? 'bg-red-500' : 'bg-blue-600'
                              }`}
                            />
                          )}
                          <span className={`truncate text-sm ${!item.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {item.title}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">{formatWhen(item.created_at)}</span>
                      </span>
                      <span className={`line-clamp-3 text-sm ${!item.is_read ? 'text-slate-600' : 'text-slate-500'}`}>
                        {item.body}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
