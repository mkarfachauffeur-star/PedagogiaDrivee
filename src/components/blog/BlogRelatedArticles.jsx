import BlogArticleCard from './BlogArticleCard'

export default function BlogRelatedArticles({ articles, isDark, skin, title = 'Articles similaires' }) {
  if (!articles?.length) return null

  return (
    <section aria-labelledby="related-articles-title" className="mt-14">
      <h2 className={`text-xl font-semibold sm:text-2xl ${skin.heading}`} id="related-articles-title">
        {title}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <BlogArticleCard article={article} isDark={isDark} key={article.slug} skin={skin} />
        ))}
      </div>
    </section>
  )
}
