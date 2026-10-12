import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { useConversationFromLocation } from '../../hooks/useConversationFromLocation'
import { useConversations } from '../../hooks/useConversations'
import { useConversationMessages } from '../../hooks/useConversationMessages'
import { findOrCreateDirectConversation, sendMessageWithAttachments } from '../../services/messaging'
import { listInternalContacts, listStudentContacts } from '../../services/directory'
import { AttachmentList, ChatMessageBubble, MessageComposer } from '../../components/messaging/Attachments'
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

  const [filter, setFilter] = useState('all')
  const [activeId, setActiveId] = useState(null)
  useConversationFromLocation(setActiveId)
  const [newMessage, setNewMessage] = useState('')
  const [files, setFiles] = useState([])
  const [sendError, setSendError] = useState(null)
  const [sending, setSending] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState('internal')
  const [internalContacts, setInternalContacts] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [studentResults, setStudentResults] = useState([])

  const messages = useConversationMessages(activeId)
  const filtered = useMemo(() => {
    if (filter === 'internal') return conversations.filter((c) => c.kind === 'internal')
    if (filter === 'student') return conversations.filter((c) => c.kind === 'student')
    return conversations
  }, [filter, conversations])
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  )

  useEffect(() => {
    if (!pickerOpen || pickerTab !== 'internal') return undefined
    let active = true
    listInternalContacts(profileId).then((rows) => active && setInternalContacts(rows))
    return () => {
      active = false
    }
  }, [pickerOpen, pickerTab, profileId])

  useEffect(() => {
    if (!pickerOpen || pickerTab !== 'student') return undefined
    let active = true
    listStudentContacts({ search: studentSearch }).then((rows) => active && setStudentResults(rows))
    return () => {
      active = false
    }
  }, [pickerOpen, pickerTab, studentSearch])

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
      <section className="pd-card overflow-hidden p-0">
        <div className="pd-hero-banner">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(107,143,178,0.22),transparent_42%)]" />
          <p className="relative z-10 pd-eyebrow">Messagerie enseignant</p>
          <h1 className="relative z-10 mt-4 pd-title-page">Échanges instantanés</h1>
          <p className="relative z-10 mt-3 max-w-4xl pd-subtitle">
            Échanges avec le secrétariat, le gérant et vos élèves affectés, en temps réel.
          </p>
        </div>
      </section>

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte pour accéder à la messagerie." icon="💬" />
      ) : (
        <div className="pd-msg-panel grid grid-cols-1 gap-0 lg:grid-cols-[320px_1fr]">
          <aside className="pd-msg-sidebar">
            <div className="flex items-center justify-between gap-2">
              <h2 className="pd-msg-sidebar-title">Conversations</h2>
              <button type="button" onClick={() => setPickerOpen((v) => !v)} className="pd-msg-btn-accent">+ Nouvelle</button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[['all', 'Toutes'], ['internal', 'Internes'], ['student', 'Élèves']].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${filter === id ? 'pd-msg-thread-active' : 'pd-msg-thread'}`}>{label}</button>
              ))}
            </div>

            {pickerOpen && (
              <div className="pd-msg-picker mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPickerTab('internal')} className={`rounded-xl px-2 py-2 text-xs font-semibold ${pickerTab === 'internal' ? 'pd-msg-thread-active' : 'pd-msg-thread'}`}>Équipe</button>
                  <button type="button" onClick={() => setPickerTab('student')} className={`rounded-xl px-2 py-2 text-xs font-semibold ${pickerTab === 'student' ? 'pd-msg-thread-active' : 'pd-msg-thread'}`}>Élève</button>
                </div>
                {pickerTab === 'internal' ? (
                  <div className="mt-3 grid gap-2">
                    {internalContacts.length === 0 && <p className="text-xs text-slate-500">Aucun contact.</p>}
                    {internalContacts.map((c) => (
                      <button key={c.id} type="button" onClick={() => startConversation(c.id, 'internal', null)} className="pd-msg-thread rounded-xl px-3 py-2 text-left text-xs">
                        <span className="pd-msg-contact-name">{contactDisplayName(c.full_name, c.role)}</span>
                        <span className="pd-msg-meta-muted ml-1">· {roleLabel(c.role)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <input className="pd-input-dark" placeholder="Rechercher un élève affecté…" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />
                    <div className="mt-2 grid gap-2">
                      {studentResults.length === 0 && <p className="text-xs text-slate-500">Aucun élève.</p>}
                      {studentResults.map((s) => (
                        <button key={s.studentId} type="button" onClick={() => startConversation(s.profileId, 'student', s.name)} className="pd-msg-thread rounded-xl px-3 py-2 text-left text-xs">
                          <span className="pd-msg-contact-name">{s.name || 'Élève'}</span>
                          {s.fileNumber && <span className="pd-msg-meta-muted ml-1">· Dossier {s.fileNumber}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              {filtered.length === 0 ? (
                <EmptyState title="Aucune conversation" message="Aucune conversation pour le moment." icon="💬" />
              ) : (
                filtered.map((item) => (
                  <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`rounded-2xl border p-4 text-left transition-all duration-200 ${activeId === item.id ? 'pd-msg-thread-active' : 'pd-msg-thread hover:-translate-y-0.5'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <span className="pd-msg-chip">{item.kind === 'student' ? 'Élève' : 'Interne'}</span>
                    </div>
                    <p className="pd-msg-meta mt-2">{item.unread ? 'Nouveau message' : formatTime(item.lastMessageAt)}</p>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-[28rem] flex-col bg-slate-50/80 p-5 md:p-6">
            {activeConversation ? (
              <>
                <div className="pd-msg-chat-divider flex items-center justify-between gap-3">
                  <div>
                    <h2 className="pd-title-section text-xl">{activeConversation.title}</h2>
                    <p className="text-sm text-slate-600">{activeConversation.kind === 'student' ? 'Conversation élève' : 'Conversation interne'}</p>
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
