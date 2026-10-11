import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BlogArticleCard from '../components/blog/BlogArticleCard'
import BlogPagination from '../components/blog/BlogPagination'
import BlogSidebar from '../components/blog/BlogSidebar'
import PageSeo from '../components/seo/PageSeo'
import BlogMarketingLayout, { useBlogSkin } from '../layouts/BlogMarketingLayout'
import {
  filterPosts,
  getLatestPosts,
  getPopularPosts,
} from '../data/blog/utils'
import {
  buildBlogListJsonLd,
  SEO_PAGES,
} from '../lib/seo'

const PER_PAGE = 6

export default function BlogListPage() {
  const { skin, isDark } = useBlogSkin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '')
  const selectedCategory = searchParams.get('category') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  const { posts, total, totalPages } = useMemo(
    () =>
      filterPosts({
        query: searchParams.get('q') ?? '',
        category: selectedCategory,
        page,
        perPage: PER_PAGE,
      }),
    [page, searchParams, selectedCategory],
  )

  const popularPosts = useMemo(() => getPopularPosts(5), [])
  const latestPosts = useMemo(() => getLatestPosts(6), [])

  const jsonLd = useMemo(() => buildBlogListJsonLd(), [])
  const pageSeo = SEO_PAGES.blog

  const isDefaultView = page === 1 && !selectedCategory && !(searchParams.get('q') ?? '')
  const featuredPost = isDefaultView ? latestPosts[0] : null
  const gridPosts = featuredPost ? posts.filter((post) => post.slug !== featuredPost.slug) : posts
  // La une n'apparaît pas une seconde fois dans la colonne « Derniers articles ».
  const sidebarLatestPosts = featuredPost
    ? latestPosts.filter((post) => post.slug !== featuredPost.slug).slice(0, 5)
    : latestPosts.slice(0, 5)

  function updateParams(next) {
    const params = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key)
      else params.set(key, String(value))
    })
    setSearchParams(params, { replace: true })
  }

  function handleSearchChange(value) {
    setSearchQuery(value)
    updateParams({ q: value, page: 1 })
  }

  function handleCategoryChange(category) {
    updateParams({ category, page: 1 })
  }

  function handlePageChange(nextPage) {
    updateParams({ page: nextPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <BlogMarketingLayout>
      <PageSeo {...pageSeo} jsonLd={jsonLd} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="mx-auto max-w-3xl text-center">
          <p className={skin.eyebrowBlue}>Ressources</p>
          <h1 className={`mt-3 text-3xl font-black sm:text-4xl ${skin.heading}`}>
            Conseils pratiques pour votre auto-école
          </h1>
          <p className={`mt-4 text-base leading-8 ${skin.bodyMuted}`}>
            Des articles concrets pour piloter votre auto-école : livret numérique, REMC,
            réussite des élèves et organisation.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <section aria-label="Liste des articles">
            {featuredPost && (
              <Link
                className={`group mb-6 grid overflow-hidden rounded-[1.15rem] transition sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] ${skin.cardHover}`}
                to={`/blog/${featuredPost.slug}`}
              >
                <div className="aspect-[16/10] overflow-hidden bg-slate-900/40 sm:aspect-auto sm:h-full">
                  <img
                    alt={featuredPost.coverImageAlt}
                    className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
                    decoding="async"
                    src={featuredPost.coverImage}
                  />
                </div>
                <div className="p-5 sm:p-7">
                  <span className="inline-flex rounded-full border border-blue-300/60 bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-blue-500">
                    À la une
                  </span>
                  <h2 className={`mt-3 text-xl font-black leading-snug sm:text-2xl ${skin.heading}`}>
                    {featuredPost.title}
                  </h2>
                  <p className={`mt-2 line-clamp-4 text-sm leading-6 ${skin.bodyMuted}`}>
                    {featuredPost.excerpt}
                  </p>
                  <span className={`mt-4 inline-flex items-center gap-2 text-sm font-black ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                    Lire l&apos;article →
                  </span>
                </div>
              </Link>
            )}
            {posts.length === 0 ? (
              <div className={`${skin.card} p-8 text-center`}>
                <p className={`text-base font-semibold ${skin.body}`}>
                  Aucun article ne correspond à votre recherche.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {gridPosts.map((article) => (
                  <BlogArticleCard article={article} isDark={isDark} key={article.slug} skin={skin} />
                ))}
              </div>
            )}
            <BlogPagination isDark={isDark} onPageChange={handlePageChange} page={page} totalPages={totalPages} />
            {total > 0 && (
              <p className={`mt-4 text-center text-xs font-semibold ${skin.bodyMuted}`}>
                {total} article{total > 1 ? 's' : ''} au total
              </p>
            )}
          </section>

          <BlogSidebar
            isDark={isDark}
            latestPosts={sidebarLatestPosts}
            onCategoryChange={handleCategoryChange}
            onNavigate={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            onSearchChange={handleSearchChange}
            popularPosts={popularPosts}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            skin={skin}
          />
        </div>

        <aside className={`mt-12 rounded-2xl border p-6 sm:p-8 ${isDark ? 'border-blue-400/25 bg-gradient-to-br from-[#0b2a52] via-[#103a75] to-[#0b2a52] text-white' : 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50'}`}>
          <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
            Le logiciel
          </p>
          <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className={`text-xl font-black sm:text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Pedagogia Drive, le livret numérique de votre auto-école
              </h2>
              <p className={`mt-2 text-sm leading-7 ${isDark ? 'text-sky-100/80' : 'text-slate-600'}`}>
                Suivi REMC, QCM, messagerie et gestion d’équipe : tout ce que ces articles
                décrivent est déjà disponible dans un seul logiciel, pensé pour les auto-écoles.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-bold transition ${
                  isDark
                    ? 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                    : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:brightness-110'
                }`}
                to="/livret-numerique-auto-ecole"
              >
                Découvrir le livret numérique
              </Link>
              <Link
                className={`inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-bold transition ${
                  isDark
                    ? 'border-white/25 text-white hover:bg-white/10'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-sky-400'
                }`}
                to="/#demonstration"
              >
                Demander une démonstration
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </BlogMarketingLayout>
  )
}
