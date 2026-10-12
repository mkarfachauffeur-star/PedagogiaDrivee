import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LandingHeader from '../components/marketing/landing/LandingHeader'
import { LandingFooter } from '../components/marketing/landing/LandingSections'
import { useMarketingTheme } from '../hooks/useMarketingTheme'
import { isNativeApp } from '../lib/nativeApp'

// Dans l'app iPhone, les pages légales s'ouvrent sans l'en-tête ni le pied de page du site.
function NativeBackBar() {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
      <button
        className="inline-flex h-11 items-center gap-1.5 text-sm font-bold text-slate-800"
        onClick={goBack}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>
    </header>
  )
}

export default function PublicPageLayout({ title, children }) {
  const { theme, isDark } = useMarketingTheme()

  return (
    <div className="landing-page flex min-h-screen flex-col overflow-x-clip" data-theme={theme}>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-xl focus:bg-[#1769FF] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        href="#main-content"
      >
        Aller au contenu principal
      </a>
      {isNativeApp ? <NativeBackBar /> : <LandingHeader />}

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8" id="main-content">
        <article className="mx-auto w-full max-w-3xl rounded-[20px] border border-[var(--lp-border)] bg-white p-6 text-slate-800 shadow-sm md:p-8">
          <h1 className="text-3xl font-extrabold text-slate-950">{title}</h1>
          <div className="prose-public mt-8 space-y-8 text-sm leading-7 text-slate-600">{children}</div>
        </article>
      </main>

      {!isNativeApp && <LandingFooter isDark={isDark} />}
    </div>
  )
}
