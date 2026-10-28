import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { useConversationFromLocation } from '../../hooks/useConversationFromLocation'
import { useConversations } from '../../hooks/useConversations'
import { useConversationMessages } from '../../hooks/useConversationMessages'
import { ensureStudentSecretaryConversation, sendMessageWithAttachments } from '../../services/messaging'
import { listStudentSecretaryContacts } from '../../services/directory'
import { AttachmentList, ChatMessageBubble, MessageComposer } from '../../components/messaging/Attachments'

const formatTime = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function isSecretaryConversation(conversation) {
  return conversation?.others?.some((p) => p.role === 'secretary')
}

export default function StudentMessagesPage() {
  const location = useLocation()
  const { profileId, organizationId } = useAuth()
  const { conversations, refresh } = useConversations()

  const [activeId, setActiveId] = useState(null)
  useConversationFromLocation(setActiveId)
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState([])
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(null)
  const [sendError, setSendError] = useState(null)

  const secretaryConversations = useMemo(
    () => conversations.filter(isSecretaryConversation),
    [conversations],
  )

  const messages = useConversationMessages(activeId)
  const activeConversation = useMemo(
    () => secretaryConversations.find((c) => c.id === activeId) || null,
    [secretaryConversations, activeId],
  )

  // Ouvre automatiquement la conversation avec le secrétariat.
  useEffect(() => {
    if (location.state?.conversationId) return undefined
    if (!profileId || !organizationId) return undefined
    let cancelled = false

    async function openSecretaryConversation() {
      setOpening(true)
      setOpenError(null)
      try {
        const contacts = await listStudentSecretaryContacts(profileId)
        if (!contacts.length) {
          if (!cancelled) setOpenError('Aucun secrétariat disponible pour votre auto-école.')
          return
        }
        const result = await ensureStudentSecretaryConversation({ profileId, organizationId })
        if (!result?.id) {
          if (!cancelled) setOpenError('Impossible d\'ouvrir la conversation avec le secrétariat.')
          return
        }
        await refresh()
        if (!cancelled) setActiveId(result.id)
      } catch {
        if (!cancelled) setOpenError('Impossible d\'ouvrir la conversation avec le secrétariat.')
      } finally {
        if (!cancelled) setOpening(false)
      }
    }

    if (secretaryConversations.length > 0) {
      setActiveId((current) => {
        if (current && secretaryConversations.some((c) => c.id === current)) return current
        return secretaryConversations[0].id
      })
      return undefined
    }

    openSecretaryConversation()
    return () => {
      cancelled = true
    }
  }, [location.state?.conversationId, profileId, organizationId, secretaryConversations, refresh])

  const handleSend = async () => {
    const body = draft.trim()
    if ((!body && !files.length) || !activeId || !profileId) return
    const toSend = files
    setDraft('')
    setFiles([])
    setSendError(null)
    try {
      await sendMessageWithAttachments({
        conversationId: activeId,
        organizationId,
        senderId: profileId,
        body,
        files: toSend,
      })
      refresh()
    } catch {
      setSendError('Envoi impossible. Réessayez dans un instant.')
      setDraft(body)
      setFiles(toSend)
    }
  }

  return (
    <div className="pd-page pd-msg-page">
      <PageHeader description="Échangez avec le secrétariat de votre auto-école." title="Messagerie" />

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte pour accéder à la messagerie." icon="💬" />
      ) : (
        <section className="pd-msg-panel grid grid-cols-1 min-h-[20rem] min-w-0 lg:min-h-[680px] lg:grid-cols-[320px_1fr]">
          <aside className="pd-msg-sidebar">
            <h2 className="pd-msg-sidebar-title">Secrétariat</h2>
            <p className="pd-msg-sidebar-muted mt-1">Votre interlocuteur administratif</p>

            <div className="mt-4 grid gap-3">
              {opening && (
                <p className="text-xs font-medium text-slate-300">Ouverture de la conversation…</p>
              )}
              {openError && (
                <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{openError}</p>
              )}
              {secretaryConversations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 ${activeId === item.id ? 'pd-msg-thread-active' : 'pd-msg-thread hover:-translate-y-0.5'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.title || 'Secrétariat'}</p>
                    <span className="pd-msg-chip">{item.unread ? 'Nouveau' : 'Actif'}</span>
                  </div>
                  <p className="pd-msg-meta mt-2">{formatTime(item.lastMessageAt)}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="pd-stat-pill p-3">
                <p className="text-2xl font-semibold text-slate-900">{messages.length}</p>
                <p className="text-xs font-medium text-slate-500">Messages</p>
              </div>
              <div className="pd-stat-pill p-3">
                <p className="text-2xl font-semibold text-blue-600">{secretaryConversations.length}</p>
                <p className="text-xs font-medium text-slate-500">Conversation</p>
              </div>
            </div>
          </aside>

          <div className="pd-msg-chat-body">
            <header className="pd-msg-chat-header">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{activeConversation?.title || 'Secrétariat'}</h2>
                <span className="pd-msg-chip">Suivi administratif</span>
              </div>
              <p className="text-sm text-slate-600">Documents, inscriptions et questions administratives</p>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
              {!activeConversation && !opening && (
                <EmptyState title="Conversation indisponible" message={openError || 'Le secrétariat n\'est pas joignable pour le moment.'} icon="💬" />
              )}
              {activeConversation && messages.length === 0 && (
                <EmptyState title="Aucun message" message="Envoyez votre premier message au secrétariat." icon="💬" />
              )}
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} mine={message.mine} className="animate-slide-up">
                  <p className="leading-7">{message.body}</p>
                  <AttachmentList attachments={message.attachments} />
                  <p className={`mt-2 text-[11px] font-medium ${message.mine ? 'text-white/75' : 'text-slate-500'}`}>
                    {formatTime(message.created_at)}{message.mine && message.status ? ` · ${message.status}` : ''}
                  </p>
                </ChatMessageBubble>
              ))}
            </div>

            <MessageComposer
              className="px-4 pb-4"
              value={draft}
              onChange={setDraft}
              onSubmit={(event) => {
                event.preventDefault()
                handleSend()
              }}
              files={files}
              onAddFiles={(f) => setFiles((cur) => [...cur, ...f])}
              onRemoveFile={(i) => setFiles((cur) => cur.filter((_, idx) => idx !== i))}
              disabled={!activeConversation}
              error={sendError}
            />
          </div>
        </section>
      )}
    </div>
  )
}
