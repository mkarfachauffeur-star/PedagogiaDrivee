export default function PanelTabs({ tabs, activeId, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeId === tab.id
              ? 'bg-[#1769FF] text-white shadow-md'
              : 'border border-slate-300 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-800'
          }`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 ? (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
