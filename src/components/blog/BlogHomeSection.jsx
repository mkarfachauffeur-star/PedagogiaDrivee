import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen } from 'lucide-react'
import BlogArticleCard from './BlogArticleCard'
import { getLatestPosts } from '../../data/blog/utils'

export default function BlogHomeSection({ isDark, skin, shouldReduceMotion, reveal }) {
  const latestPosts = getLatestPosts(3)

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20" id="blog">
      <div className="mx-auto max-w-2xl text-center">
        <p className={skin.eyebrowBlue}>
          <BookOpen aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
          Blog
        </p>
        <h2 className={`mt-3 text-2xl font-semibold sm:text-3xl ${skin.heading}`}>
          Guides pour les gérants d&apos;auto-école
        </h2>
        <p className={`mt-4 text-base leading-8 ${skin.bodyMuted}`}>
          Livret numérique, REMC, suivi pédagogique et digitalisation : nos articles vous aident
          à moderniser votre auto-école et à améliorer la réussite de vos élèves.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {latestPosts.map((article, index) => (
          <motion.div {...(reveal ? reveal(shouldReduceMotion, index * 0.05) : {})} key={article.slug}>
            <BlogArticleCard article={article} isDark={isDark} skin={skin} />
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          aria-label="Voir tous les articles du blog Pedagogia Drive"
          className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition ${isDark ? 'border border-white/15 bg-white/[0.04] text-white hover:bg-white/10' : 'border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-blue-400 hover:text-blue-700'}`}
          to="/blog"
        >
          Voir tous les articles
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
