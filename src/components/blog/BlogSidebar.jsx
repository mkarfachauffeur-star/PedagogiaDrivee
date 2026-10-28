import { Search } from 'lucide-react'
import { BLOG_CATEGORIES } from '../../data/blog/categories'

export default function BlogSidebar({
  isDark,
  skin,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  popularPosts,
  latestPosts,
  onNavigate,
}) {
  const inputClass = isDark
    ? 'w-full rounded-xl border border-white/10 bg-[#070d18] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500'
    : 'w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm'

  const chipClass = (active) =>
    [
      'rounded-full border px-3 py-1 text-xs font-semibold transition',
      active
        ? isDark
          ? 'border-blue-400/40 bg-blue-500/15 text-blue-200'
          : 'border-blue-400 bg-blue-50 text-blue-700'
        : isDark
          ? 'border-white/10 text-slate-300 hover:bg-white/5'
          : 'border-slate-300 text-slate-600 hover:bg-slate-50',
    ].join(' ')

  return (
    <aside aria-label="Barre latérale du blog" className="space-y-6">
      <section className={`${skin.card} p-5`}>
        <h2 className={`text-sm font-semibold ${skin.heading}`}>Rechercher</h2>
        <label className="relative mt-3 block">
          <span className="sr-only">Rechercher un article</span>
          <Search
            aria-hidden="true"
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
          />
          <input
            className={inputClass}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Mots-clés, REMC, livret…"
            type="search"
            value={searchQuery}
          />
        </label>
      </section>

      <section className={`${skin.card} p-5`}>
        <h2 className={`text-sm font-semibold ${skin.heading}`}>Catégories</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            aria-label="Afficher toutes les catégories"
            className={chipClass(!selectedCategory)}
            onClick={() => onCategoryChange('')}
            type="button"
          >
            Toutes
          </button>
          {BLOG_CATEGORIES.map((category) => (
            <button
              aria-label={`Filtrer par ${category.label}`}
              className={chipClass(selectedCategory === category.id)}
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      {popularPosts.length > 0 && (
        <section className={`${skin.card} p-5`}>
          <h2 className={`text-sm font-semibold ${skin.heading}`}>Articles populaires</h2>
          <ul className="mt-3 space-y-3">
            {popularPosts.map((post) => (
              <li key={post.slug}>
                <a
                  className={`block text-sm font-semibold leading-snug transition ${isDark ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-blue-700'}`}
                  href={`/blog/${post.slug}`}
                  onClick={onNavigate}
                >
                  {post.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${skin.card} p-5`}>
        <h2 className={`text-sm font-semibold ${skin.heading}`}>Derniers articles</h2>
        <ul className="mt-3 space-y-3">
          {latestPosts.map((post) => (
            <li key={post.slug}>
              <a
                className={`block text-sm font-semibold leading-snug transition ${isDark ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-blue-700'}`}
                href={`/blog/${post.slug}`}
                onClick={onNavigate}
              >
                {post.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
