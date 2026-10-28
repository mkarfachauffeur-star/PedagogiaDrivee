import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Calendar } from 'lucide-react'
import { getCategoryLabel, CATEGORY_BADGE_CLASS, BLOG_CATEGORY_MAP } from '../../data/blog/categories'
import { formatBlogDate, getReadingTimeMinutes } from '../../data/blog/utils'

export default function BlogArticleCard({ article, isDark, skin }) {
  const category = BLOG_CATEGORY_MAP[article.category]
  const badgeClass = category ? CATEGORY_BADGE_CLASS[category.color] : CATEGORY_BADGE_CLASS.blue
  const readingTime = getReadingTimeMinutes(article)

  return (
    <article className={skin.cardHover}>
      <Link className="block" to={`/blog/${article.slug}`}>
        <div className="aspect-[16/10] overflow-hidden rounded-t-xl bg-slate-900/40">
          <img
            alt={article.coverImageAlt}
            className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
            decoding="async"
            height={400}
            loading="lazy"
            src={article.coverImage}
            width={640}
          />
        </div>
        <div className="p-5 sm:p-6">
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}
          >
            {getCategoryLabel(article.category)}
          </span>
          <h2 className={`mt-3 text-lg font-semibold leading-snug sm:text-xl ${skin.heading}`}>
            {article.title}
          </h2>
          <p className={`mt-2 line-clamp-3 text-sm leading-6 ${skin.bodyMuted}`}>{article.excerpt}</p>
          <div className={`mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="inline-flex items-center gap-1">
              <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
              <time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt)}</time>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              {readingTime} min de lecture
            </span>
          </div>
          <span
            className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}
          >
            Lire l&apos;article
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </article>
  )
}
