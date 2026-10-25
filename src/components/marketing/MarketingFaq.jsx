export default function MarketingFaq({ items, skin, isDark }) {
  return (
    <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl" id="faq">
      <div className="text-center">
        <p className={skin.eyebrowBlue}>Questions fréquentes</p>
        <h2 className={`mt-3 text-2xl font-black sm:text-3xl ${skin.heading}`} id="faq-heading">
          Tout savoir sur Pedagogia Drive
        </h2>
        <p className={`mt-4 text-base leading-8 ${skin.bodyMuted}`}>
          Les réponses essentielles avant de demander votre démonstration.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className={`group rounded-[1.25rem] border p-5 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-300 bg-white shadow-sm'}`}
          >
            <summary
              className={`cursor-pointer list-none text-base font-black leading-snug marker:content-none ${skin.heading} [&::-webkit-details-marker]:hidden`}
            >
              <span className="flex items-start justify-between gap-4">
                {item.question}
                <span
                  aria-hidden="true"
                  className={`mt-0.5 shrink-0 text-lg transition group-open:rotate-45 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}
                >
                  +
                </span>
              </span>
            </summary>
            <p className={`mt-4 text-sm leading-7 ${skin.bodyMuted}`}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
