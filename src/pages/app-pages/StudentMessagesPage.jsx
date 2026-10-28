import { useEffect, useMemo, useState } from 'react'
import { Building2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { useConversationFromLocation } from '../../hooks/useConversationFromLocation'
import { useConversations } from '../../hooks/useConversations'
import { useConversationMessages } from '../../hooks/useConversationMessages'
import { ensureStudentSecretaryConversation, sendMessageWithAttachments } from '../../services/messaging'
import { listStudentSecretaryContacts } from '../../services/directory'
import { AttachmentList, ChatMessageBubble, MessageComposer, MessageMeta } from '../../components/messaging/Attachments'

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
      // La conversation existe (ou vient d'être créée) : l'ouverture est terminée.
      setOpening(false)
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
        <section className="pd-msg-panel flex min-h-[28rem] flex-col lg:min-h-[620px]">
          <div className="pd-msg-chat-body">
            <header className="pd-msg-chat-header flex items-center gap-3">
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-[#1769FF]">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">Secrétariat</h2>
                <p className="text-xs text-slate-500">
                  {opening && !activeConversation ? 'Ouverture de la conversation…' : 'Documents, inscriptions et questions administratives'}
                </p>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
              {openError && activeConversation ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{openError}</p>
              ) : null}
              {!activeConversation && !opening && (
                <EmptyState title="Conversation indisponible" message={openError || 'Le secrétariat n\'est pas joignable pour le moment.'} icon="💬" />
              )}
              {activeConversation && messages.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-500">Aucun message pour l’instant. Écrivez au secrétariat ci-dessous.</p>
              )}
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} mine={message.mine} className="animate-slide-up">
                  <p className="leading-6">{message.body}</p>
                  <AttachmentList attachments={message.attachments} />
                  <MessageMeta mine={message.mine} status={message.status} time={formatTime(message.created_at)} />
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
