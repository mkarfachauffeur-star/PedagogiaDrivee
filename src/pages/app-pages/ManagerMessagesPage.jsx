import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { useConversationFromLocation } from '../../hooks/useConversationFromLocation'
import { useConversations } from '../../hooks/useConversations'
import { useConversationMessages } from '../../hooks/useConversationMessages'
import { findOrCreateDirectConversation, sendMessageWithAttachments } from '../../services/messaging'
import { listInternalContacts } from '../../services/directory'
import { AttachmentList, ChatMessageBubble, MessageComposer } from '../../components/messaging/Attachments'
import { contactDisplayName, roleLabel } from '../../utils/messagingLabels'

const formatTime = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function ManagerMessagesPage() {
  const { profileId, organizationId } = useAuth()
  const { conversations, refresh } = useConversations()

  const [activeId, setActiveId] = useState(null)
  useConversationFromLocation(setActiveId)
  const [newMessage, setNewMessage] = useState('')
  const [files, setFiles] = useState([])
  const [sendError, setSendError] = useState(null)
  const [sending, setSending] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [contacts, setContacts] = useState([])

  const messages = useConversationMessages(activeId)
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  )

  useEffect(() => {
    if (!pickerOpen) return undefined
    let active = true
    listInternalContacts(profileId).then((rows) => {
      if (active) setContacts(rows)
    })
    return () => {
      active = false
    }
  }, [pickerOpen, profileId])

  const startConversation = async (otherProfileId) => {
    if (!profileId || !organizationId) return
    try {
      const { id } = await findOrCreateDirectConversation({
        organizationId,
        kind: 'internal',
        createdBy: profileId,
        otherProfileId,
      })
      await refresh()
      setActiveId(id)
      setPickerOpen(false)
    } catch {
      // ignore
    }
  }

  const handleSend = async (event) => {
    event.preventDefault()
    const body = newMessage.trim()
    if ((!body && !files.length) || !activeId || !profileId || sending) return
    const toSend = files
    setSending(true)
    setSendError(null)
    try {
      await sendMessageWithAttachments({ conversationId: activeId, organizationId, senderId: profileId, body, files: toSend })
      setNewMessage('')
      setFiles([])
      await refresh()
    } catch (error) {
      setSendError(error?.message || 'Envoi impossible.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="pd-page pd-msg-page">
      <section className="pd-card overflow-hidden p-0">
        <div className="pd-hero-banner">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(107,143,178,0.22),transparent_42%)]" />
          <p className="relative z-10 pd-eyebrow">Messagerie gérant</p>
          <h1 className="relative z-10 mt-4 pd-title-page">Échanges internes direction</h1>
          <p className="relative z-10 mt-3 max-w-4xl pd-subtitle">
            Messagerie réservée aux échanges avec les enseignants et le secrétariat, en temps réel.
          </p>
        </div>
      </section>

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte pour accéder à la messagerie." icon="💬" />
      ) : (
        <div className="pd-msg-panel grid grid-cols-1 gap-0 lg:grid-cols-[320px_1fr]">
          <aside className="pd-msg-sidebar">
            <div className="flex items-center justify-between gap-2">
              <h2 className="pd-msg-sidebar-title">Contacts internes</h2>
              <button type="button" onClick={() => setPickerOpen((v) => !v)} className="pd-msg-btn-accent">+ Nouvelle</button>
            </div>

            {pickerOpen && (
              <div className="pd-msg-picker mt-3">
                {contacts.length === 0 && <p className="text-xs text-slate-500">Aucun contact.</p>}
                {contacts.map((c) => (
                  <button key={c.id} type="button" onClick={() => startConversation(c.id)} className="pd-msg-thread rounded-xl px-3 py-2 text-left text-xs">
                    <span className="pd-msg-contact-name">{contactDisplayName(c.full_name, c.role)}</span>
                    <span className="pd-msg-meta-muted ml-1">· {roleLabel(c.role)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              {conversations.length === 0 ? (
                <p className="rounded-2xl border-2 border-slate-300 bg-slate-50/80 px-4 py-5 text-center text-sm font-medium text-slate-500">
                  Aucune conversation enregistrée.
                </p>
              ) : (
                conversations.map((item) => (
                  <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`rounded-2xl border p-4 text-left transition-all duration-200 ${activeId === item.id ? 'pd-msg-thread-active' : 'pd-msg-thread hover:-translate-y-0.5'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <span className="pd-msg-chip">Interne</span>
                    </div>
                    <p className="pd-msg-meta mt-2">{item.unread ? 'Nouveau message' : formatTime(item.lastMessageAt)}</p>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex flex-col bg-slate-50/80 p-5 md:p-6">
            {activeConversation ? (
              <>
                <div className="pd-msg-chat-divider flex items-center justify-between gap-3">
                  <div>
                    <h2 className="pd-title-section text-xl">{activeConversation.title}</h2>
                    <p className="text-sm text-slate-600">Conversation interne</p>
                  </div>
                  <button type="button" onClick={() => setActiveId(null)} className="pd-msg-close-btn">Fermer</button>
                </div>

                <div className="pd-msg-thread-list">
                  {messages.length === 0 && <p className="text-sm text-slate-500">Aucun message. Démarrez la conversation.</p>}
                  {messages.map((message) => (
                    <ChatMessageBubble key={message.id} mine={message.mine}>
                      <p>{message.body}</p>
                      <AttachmentList attachments={message.attachments} />
                      <p className={`mt-2 text-[11px] font-medium ${message.mine ? 'text-white/75' : 'text-slate-500'}`}>
                        {formatTime(message.created_at)}{message.mine && message.status ? ` · ${message.status}` : ''}
                      </p>
                    </ChatMessageBubble>
                  ))}
                </div>

                <MessageComposer
                  value={newMessage}
                  onChange={setNewMessage}
                  onSubmit={handleSend}
                  files={files}
                  onAddFiles={(f) => setFiles((cur) => [...cur, ...f])}
                  onRemoveFile={(i) => setFiles((cur) => cur.filter((_, idx) => idx !== i))}
                  sending={sending}
                  error={sendError}
                  placeholder="Écrire un message interne…"
                />
              </>
            ) : (
              <EmptyState
                icon="💬"
                message={
                  conversations.length === 0
                    ? 'Cliquez sur « + Nouvelle » pour contacter un enseignant ou un membre du secrétariat.'
                    : 'Choisissez une conversation dans la liste de gauche.'
                }
                title={
                  conversations.length === 0
                    ? 'Aucune conversation'
                    : 'Sélectionnez une conversation'
                }
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
