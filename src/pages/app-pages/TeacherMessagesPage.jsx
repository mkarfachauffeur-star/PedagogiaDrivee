import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import { ConversationHeader, ConversationListItem, EmptyThread } from '../../components/messaging/ConversationParts'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { useConversationFromLocation } from '../../hooks/useConversationFromLocation'
import { useConversations } from '../../hooks/useConversations'
import { useConversationMessages } from '../../hooks/useConversationMessages'
import { findOrCreateDirectConversation, sendMessageWithAttachments } from '../../services/messaging'
import { listInternalContacts } from '../../services/directory'
import { AttachmentList, ChatMessageBubble, MessageComposer, MessageMeta } from '../../components/messaging/Attachments'
import { contactDisplayName, roleLabel } from '../../utils/messagingLabels'
import { getUserFacingError } from '../../lib/userFacingError'

const formatTime = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function TeacherMessagesPage() {
  const { profileId, organizationId } = useAuth()
  const { conversations, refresh } = useConversations()

  const [activeId, setActiveId] = useState(null)
  useConversationFromLocation(setActiveId)
  const [newMessage, setNewMessage] = useState('')
  const [files, setFiles] = useState([])
  const [sendError, setSendError] = useState(null)
  const [sending, setSending] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [internalContacts, setInternalContacts] = useState([])

  const messages = useConversationMessages(activeId)
  // L'enseignant échange avec l'équipe (gérant, secrétariat, enseignants) ; l'élève écrit au secrétariat.
  const filtered = useMemo(() => conversations.filter((c) => c.kind !== 'student'), [conversations])
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  )

  useEffect(() => {
    if (!pickerOpen) return undefined
    let active = true
    listInternalContacts(profileId).then((rows) => active && setInternalContacts(rows))
    return () => {
      active = false
    }
  }, [pickerOpen, profileId])


  const startConversation = async (otherProfileId, kind, subject) => {
    if (!profileId || !organizationId || !otherProfileId) return
    try {
      const { id } = await findOrCreateDirectConversation({ organizationId, kind, createdBy: profileId, otherProfileId, subject })
      await refresh()
      setActiveId(id)
      setPickerOpen(false)
    } catch (error) {
      setSendError(getUserFacingError(error, 'messaging'))
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
      await sendMessageWithAttachments({
        conversationId: activeId,
        organizationId,
        senderId: profileId,
        body,
        files: toSend,
      })
      setNewMessage('')
      setFiles([])
      await refresh()
    } catch (error) {
      setSendError(getUserFacingError(error, 'messaging'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="pd-page pd-msg-page">
      <PageHeader description="Vos échanges avec le gérant, le secrétariat et les autres enseignants." title="Messagerie" />

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte pour accéder à la messagerie." icon="💬" />
      ) : (
        <div className="pd-msg-panel grid grid-cols-1 gap-0 lg:grid-cols-[320px_1fr]">
          <aside className={`pd-msg-sidebar ${activeConversation ? 'hidden lg:block' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="pd-msg-sidebar-title">Conversations</h2>
              <button type="button" onClick={() => setPickerOpen((v) => !v)} className="pd-msg-btn-accent">+ Nouvelle</button>
            </div>

            {pickerOpen && (
              <div className="pd-msg-picker mt-4">
                <p className="text-xs font-medium text-slate-600">Écrire à un membre de l’équipe</p>
                <div className="grid gap-2">
                  {internalContacts.length === 0 && <p className="text-xs text-slate-500">Aucun contact.</p>}
                  {internalContacts.map((c) => (
                    <button key={c.id} type="button" onClick={() => startConversation(c.id, 'internal', null)} className="pd-msg-thread rounded-lg border px-3 py-2 text-left text-xs">
                      <span className="pd-msg-contact-name">{contactDisplayName(c.full_name, c.role)}</span>
                      <span className="pd-msg-meta-muted ml-1">· {roleLabel(c.role)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-2">
              {filtered.length === 0 ? (
                <EmptyState title="Aucune conversation" message="Aucune conversation pour le moment." icon="💬" />
              ) : (
                filtered.map((item) => (
                  <ConversationListItem
                    active={activeId === item.id}
                    key={item.id}
                    kindLabel="Équipe"
                    onSelect={() => setActiveId(item.id)}
                    time={formatTime(item.lastMessageAt)}
                    title={item.title}
                    unread={item.unread}
                  />
                ))
              )}
            </div>
          </aside>

          <section className={`min-h-[28rem] flex-col bg-slate-50/60 p-4 md:p-6 ${activeConversation ? 'flex' : 'hidden lg:flex'}`}>
            {activeConversation ? (
              <>
                <ConversationHeader
                  onClose={() => setActiveId(null)}
                  subtitle={activeConversation.kind === 'student' ? 'Élève' : 'Équipe de l’auto-école'}
                  title={activeConversation.title}
                />

                <div className="pd-msg-thread-list">
                  {messages.length === 0 && <EmptyThread />}
                  {messages.map((message) => (
                    <ChatMessageBubble key={message.id} mine={message.mine}>
                      <p>{message.body}</p>
                      <AttachmentList attachments={message.attachments} />
                      <MessageMeta mine={message.mine} status={message.status} time={formatTime(message.created_at)} />
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
                />
              </>
            ) : (
              <EmptyState title="Aucune conversation" message="Sélectionnez une conversation ou démarrez-en une nouvelle." icon="💬" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
