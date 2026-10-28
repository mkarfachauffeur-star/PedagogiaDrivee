import { ArrowLeft } from 'lucide-react'

function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase() || '?'
}

function Initials({ name }) {
  return (
    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
      {initialsOf(name)}
    </span>
  )
}

/** Ligne de la liste des conversations : initiales, nom, heure, type et point « non lu ». */
export function ConversationListItem({ active, kindLabel, onSelect, time, title, unread }) {
  return (
    <button
      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${active ? 'pd-msg-thread-active' : 'pd-msg-thread'}`}
      onClick={onSelect}
      type="button"
    >
      <Initials name={title} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm text-slate-900 ${unread ? 'font-semibold' : 'font-medium'}`}>{title}</span>
          <span className="shrink-0 text-xs text-slate-400">{time}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{kindLabel}</span>
          {unread ? <span aria-label="Nouveau message" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1769FF]" /> : null}
        </span>
      </span>
    </button>
  )
}

/** En-tête d'une conversation ouverte ; sur téléphone, la flèche ramène à la liste. */
export function ConversationHeader({ onClose, subtitle, title }) {
  return (
    <div className="pd-msg-chat-divider flex items-center gap-3">
      <button
        aria-label="Retour aux conversations"
        className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onClose}
        type="button"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <Initials name={title} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <button className="pd-msg-close-btn hidden lg:inline-flex" onClick={onClose} type="button">
        Fermer
      </button>
    </div>
  )
}

export function EmptyThread() {
  return <p className="m-auto max-w-xs text-center text-sm text-slate-500">Aucun message pour l’instant. Écrivez le premier ci-dessous.</p>
}
