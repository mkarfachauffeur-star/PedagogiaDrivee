import { useEffect, useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Calendar, Clock, UserRound } from 'lucide-react'
import BlogArticleContent from '../components/blog/BlogArticleContent'
import BlogRelatedArticles from '../components/blog/BlogRelatedArticles'
import PageSeo from '../components/seo/PageSeo'
import BlogMarketingLayout, { useBlogSkin } from '../layouts/BlogMarketingLayout'
import { getCategoryLabel } from '../data/blog/categories'
import {
  formatBlogDate,
  getPostBySlug,
  getReadingTimeMinutes,
  getRelatedPosts,
} from '../data/blog/utils'
import { buildBlogArticleJsonLd } from '../lib/seo'

export default function BlogArticlePage() {
  const { slug } = useParams()
  const { skin, isDark } = useBlogSkin()
  const article = getPostBySlug(slug)

  const relatedPosts = useMemo(
    () => (article ? getRelatedPosts(article, 3) : []),
    [article],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [slug])

  if (!article) {
    return <Navigate replace to="/blog" />
  }

  const readingTime = getReadingTimeMinutes(article)
  const path = `/blog/${article.slug}`
  const title = `${article.title} | Blog Pedagogia Drive`
  const description = article.metaDescription
  const jsonLd = buildBlogArticleJsonLd(article)

  return (
    <BlogMarketingLayout>
      <PageSeo
        description={description}
        image={article.coverImage.startsWith('http') ? article.coverImage : `https://www.pedagogia-drive.fr${article.coverImage}`}
        imageAlt={article.coverImageAlt}
        jsonLd={jsonLd}
        ogType="article"
        path={path}
        title={title}
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <nav aria-label="Fil d'Ariane" className={`mb-6 text-sm font-semibold ${skin.bodyMuted}`}>
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link className={isDark ? 'hover:text-white' : 'hover:text-slate-900'} to="/">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link className={isDark ? 'hover:text-white' : 'hover:text-slate-900'} to="/blog">
                Blog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className={isDark ? 'text-slate-300' : 'text-slate-700'}>{getCategoryLabel(article.category)}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className={`text-3xl font-black leading-tight sm:text-4xl ${skin.heading}`}>
            {article.title}
          </h1>
          <p className={`mt-4 text-base leading-8 ${skin.body}`}>{article.excerpt}</p>
          <div className={`mt-5 flex flex-wrap items-center gap-4 text-sm font-semibold ${skin.bodyMuted}`}>
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden="true" className="h-4 w-4" />
              Pedagogia Drive
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar aria-hidden="true" className="h-4 w-4" />
              <time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt)}</time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="h-4 w-4" />
              {readingTime} min de lecture
            </span>
          </div>
        </header>

        <BlogArticleContent article={article} isDark={isDark} skin={skin} />

        <aside className={`mt-10 rounded-2xl border p-6 sm:p-8 ${isDark ? 'border-blue-400/25 bg-gradient-to-br from-[#0b2a52] via-[#103a75] to-[#0b2a52] text-white' : 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50'}`}>
          <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
            Pedagogia Drive
          </p>
          <p className={`mt-2 text-xl font-black sm:text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Le livret numérique de votre auto-école
          </p>
          <p className={`mt-2 text-sm leading-7 ${isDark ? 'text-sky-100/80' : 'text-slate-600'}`}>
            Suivi REMC, QCM, messagerie et gestion d’équipe : remplacez le livret papier
            par un logiciel pensé pour les auto-écoles.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
        </aside>

        <BlogRelatedArticles articles={relatedPosts} isDark={isDark} skin={skin} />
      </div>
    </BlogMarketingLayout>
  )
}
