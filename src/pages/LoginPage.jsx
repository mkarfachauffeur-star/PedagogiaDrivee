import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import MarketingThemeToggle from '../components/marketing/MarketingThemeToggle'
import PageSeo from '../components/seo/PageSeo'
import { useAuth } from '../context/AuthContext'
import { StatusBar, Style } from '@capacitor/status-bar'
import { isIOS, isNativeApp } from '../lib/nativeApp'
import { useMarketingTheme } from '../hooks/useMarketingTheme'
import { trackLogin, trackFirstLogin } from '../lib/analytics'
import { supabase } from '../lib/supabase'
import { getUserFacingError } from '../lib/userFacingError'
import { breadcrumbsForPage, buildPageJsonLd, SEO_PAGES } from '../lib/seo'
import { roleDestinations } from '../utils/authSession'
import { applyRememberMePreference, readRememberedEmail } from '../utils/rememberSession'
import { isPasswordPolicyMet, PASSWORD_POLICY_HINT, validatePassword } from '../lib/passwordPolicy'

const PANEL_POINTS = [
  'Livret d’apprentissage et compétences REMC',
  'Planning, QCU et messagerie',
  'Un espace par rôle : gérant, secrétariat, enseignant, élève',
]

/** Panneau de marque affiché à gauche du formulaire sur grand écran (site web uniquement). */
function BrandPanel() {
  return (
    <aside className="relative hidden w-[44%] max-w-[560px] shrink-0 flex-col justify-between overflow-hidden bg-[#0b1628] px-12 py-12 text-white lg:flex">
      <Link aria-label="Retour à l'accueil" className="inline-flex self-start" to="/">
        <BrandLogo animated={false} idPrefix="login-panel" variant="marketing" />
      </Link>
      <div>
        <p className="text-[13px] font-semibold text-[#6ea6ff]">Logiciel pour auto-écoles</p>
        <p className="mt-4 max-w-sm text-[2rem] font-semibold leading-tight tracking-[-0.03em]">
          Le livret d’apprentissage numérique de votre auto-école.
        </p>
        <ul className="mt-8 space-y-3">
          {PANEL_POINTS.map((item) => (
            <li className="flex gap-3 text-[15px] leading-6 text-white/75" key={item}>
              <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#6ea6ff]" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50">
        <Link className="transition hover:text-white" to="/mentions-legales">
          Mentions légales
        </Link>
        <Link className="transition hover:text-white" to="/politique-confidentialite">
          Confidentialité
        </Link>
        <Link className="transition hover:text-white" to="/contact">
          Contact
        </Link>
      </nav>
    </aside>
  )
}

function PasswordField({ id, label, value, onChange, visible, onToggle, autoComplete, placeholder, inputClass, toggleClass, labelClass, minLength }) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          autoComplete={autoComplete}
          className={`${inputClass} pr-12`}
          id={id}
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        {onToggle ? (
          <button
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className={toggleClass}
            onClick={onToggle}
            type="button"
          >
            {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithPassword, completePasswordChange, isAuthenticated, loading, mustChangePassword: sessionMustChange, role: sessionRole } = useAuth()
  const { isDark, toggleTheme } = useMarketingTheme()
  const shouldReduceMotion = useReducedMotion()
  const [authError, setAuthError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotSending, setForgotSending] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [pendingRole, setPendingRole] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const loginPage = SEO_PAGES.login
  const loginJsonLd = useMemo(
    () =>
      buildPageJsonLd({
        path: loginPage.path,
        title: loginPage.title,
        description: loginPage.description,
        breadcrumbTrail: breadcrumbsForPage('login'),
      }),
    [loginPage.description, loginPage.path, loginPage.title],
  )

  useEffect(() => {
    const savedEmail = readRememberedEmail()
    if (savedEmail) setEmail(savedEmail)
  }, [])

  // Session valide restaurée au démarrage : ne pas réafficher le formulaire,
  // aller directement vers l'espace du rôle.
  useEffect(() => {
    if (loading || !isAuthenticated || sessionMustChange) return
    const destination = sessionRole && roleDestinations[sessionRole]
    if (destination) navigate(destination, { replace: true })
  }, [loading, isAuthenticated, sessionMustChange, sessionRole, navigate])

  useEffect(() => {
    if (sessionMustChange) {
      setMustChangePassword(true)
      setPendingRole(sessionRole)
    }
  }, [sessionMustChange, sessionRole])

  useEffect(() => {
    if (location.state?.forcePasswordChange) {
      setMustChangePassword(true)
    }
  }, [location.state?.forcePasswordChange])

  useEffect(() => {
    const previousBodyBg = document.body.style.backgroundColor
    const previousHtmlBg = document.documentElement.style.backgroundColor
    const pageBg = isDark ? '#050b18' : '#ffffff'

    document.body.classList.add('login-page-active')
    document.body.style.backgroundColor = pageBg
    document.documentElement.style.backgroundColor = pageBg

    return () => {
      document.body.classList.remove('login-page-active')
      document.body.style.backgroundColor = previousBodyBg
      document.documentElement.style.backgroundColor = previousHtmlBg
    }
  }, [isDark])

  // iPhone : la page passe sous la barre d'état (contentInset 'never').
  // Texte clair sur le fond sombre, texte foncé sur le fond clair ; retour au réglage de l'app ensuite.
  useEffect(() => {
    if (!isNativeApp || !isIOS) return undefined
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {})
    return () => {
      StatusBar.setStyle({ style: Style.Light }).catch(() => {})
    }
  }, [isDark])

  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    let timer = 0

    const scrollSubmitIntoView = () => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement) || !active.closest('.login-page-shell')) return
      const form = active.closest('form')
      const target = form?.querySelector('button[type="submit"]') || active
      target.scrollIntoView({ block: 'center', inline: 'nearest' })
    }

    const syncVisibleViewport = () => {
      const viewport = window.visualViewport
      if (!viewport) return
      const keyboardInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      const keyboardOpen = keyboardInset > 80
      root.style.setProperty('--vv-height', `${Math.round(viewport.height)}px`)
      root.style.setProperty('--vv-offset-top', `${Math.round(viewport.offsetTop)}px`)
      root.classList.toggle('keyboard-open', keyboardOpen)
      if (keyboardOpen) scrollSubmitIntoView()
    }

    const onFocusIn = () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      frame = window.requestAnimationFrame(syncVisibleViewport)
      timer = window.setTimeout(syncVisibleViewport, 320)
    }

    syncVisibleViewport()
    window.visualViewport?.addEventListener('resize', syncVisibleViewport)
    window.visualViewport?.addEventListener('scroll', syncVisibleViewport)
    document.addEventListener('focusin', onFocusIn)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      window.visualViewport?.removeEventListener('resize', syncVisibleViewport)
      window.visualViewport?.removeEventListener('scroll', syncVisibleViewport)
      document.removeEventListener('focusin', onFocusIn)
      root.style.removeProperty('--vv-height')
      root.style.removeProperty('--vv-offset-top')
      root.classList.remove('keyboard-open')
    }
  }, [])

  const canSubmit = useMemo(() => Boolean(email.trim() && password), [email, password])

  const handleForgotPassword = async () => {
    setAuthError('')
    setForgotSent(false)
    const targetEmail = email.trim().toLowerCase()
    if (!targetEmail) {
      setAuthError('Saisissez votre e-mail pour recevoir un lien de réinitialisation.')
      return
    }
    setForgotSending(true)
    const redirectTo = `${window.location.origin}/accept-invite`
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo })
    setForgotSending(false)
    if (error) {
      setAuthError(getUserFacingError(error, 'reset_password'))
      return
    }
    setForgotSent(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')
    if (!email.trim() || !password) {
      setAuthError('Saisissez votre e-mail et votre mot de passe.')
      return
    }
    setSubmitting(true)
    const { error, role: realRole, mustChangePassword: forceChange } = await signInWithPassword(email, password)
    setSubmitting(false)
    if (error) {
      setAuthError(error.message || getUserFacingError(error, 'login'))
      return
    }
    // Connexion réussie : la préférence pilote la persistance à la réouverture.
    applyRememberMePreference(rememberMe, email.trim())
    if (forceChange) {
      setMustChangePassword(true)
      setPendingRole(realRole)
      setNewPassword('')
      setConfirmPassword('')
      setAuthError('')
      return
    }
    const destination = roleDestinations[realRole] || '/'
    const { data: sessionData } = await supabase.auth.getUser()
    trackFirstLogin(sessionData.user?.id, realRole)
    trackLogin(realRole)
    navigate(destination, { replace: true })
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setAuthError('')
    const policy = validatePassword(newPassword)
    if (!policy.ok) {
      setAuthError(policy.error)
      return
    }
    if (newPassword !== confirmPassword) {
      setAuthError('Les mots de passe ne correspondent pas.')
      return
    }
    if (newPassword === password) {
      setAuthError('Choisissez un mot de passe différent du mot de passe temporaire.')
      return
    }
    setSubmitting(true)
    const { error } = await completePasswordChange(newPassword)
    setSubmitting(false)
    if (error) {
      setAuthError(error.message || getUserFacingError(error, 'save'))
      return
    }
    setMustChangePassword(false)
    const destination = roleDestinations[pendingRole] || '/'
    const { data: sessionData } = await supabase.auth.getUser()
    trackFirstLogin(sessionData.user?.id, pendingRole)
    trackLogin(pendingRole)
    navigate(destination, { replace: true })
  }

  const fadeUp = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: 'easeOut' },
        }

  const t = isDark
    ? {
        page: 'bg-[#050b18] text-white',
        title: 'text-white',
        muted: 'text-slate-400',
        label: 'block text-sm font-medium text-slate-200',
        input:
          'block h-12 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-[16px] text-white outline-none transition placeholder:text-slate-500 focus:border-[#6ea6ff] focus:ring-2 focus:ring-[#1769FF]/30',
        toggle: 'absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 transition hover:text-white',
        checkbox: 'h-4 w-4 rounded border-white/30 bg-transparent accent-[#1769FF]',
        link: 'font-medium text-[#6ea6ff] transition hover:text-white',
        box: 'rounded-lg border border-white/12 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300',
        error: 'rounded-lg border border-rose-400/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200',
        divider: 'border-white/10',
        toggleTheme: 'inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white',
        back: 'inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white',
      }
    : {
        page: 'bg-white text-slate-900',
        title: 'text-slate-950',
        muted: 'text-slate-500',
        label: 'block text-sm font-medium text-slate-700',
        input:
          'block h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1769FF] focus:ring-2 focus:ring-[#1769FF]/20',
        toggle: 'absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 transition hover:text-slate-700',
        checkbox: 'h-4 w-4 rounded border-slate-300 accent-[#1769FF]',
        link: 'font-medium text-[#1769FF] transition hover:text-[#0f4fc7]',
        box: 'rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600',
        error: 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700',
        divider: 'border-slate-200',
        toggleTheme: 'inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900',
        back: 'inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900',
      }
  const primaryButton =
    'flex h-12 w-full items-center justify-center rounded-lg bg-[#1769FF] text-[15px] font-semibold text-white transition hover:bg-[#145fe8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769FF] disabled:cursor-not-allowed disabled:opacity-50'
  const mobileLogo = <BrandLogo animated={false} idPrefix="login" lightMark={!isDark} variant={isDark ? 'marketing' : 'light'} />

  // Restauration de session en cours : éviter d'afficher le formulaire à
  // tort avant la redirection vers l'espace du rôle.
  if (loading && !sessionMustChange) {
    return (
      <div className={`login-page-shell fixed z-[200] flex items-center justify-center ${t.page}`}>
        <p className={`text-sm ${t.muted}`}>Ouverture de votre espace…</p>
      </div>
    )
  }

  return (
    <div className={`login-page-shell fixed z-[200] ${t.page}`}>
      <PageSeo {...loginPage} jsonLd={loginJsonLd} />

      <div className="relative flex min-h-full">
        {!isNativeApp && <BrandPanel />}

        <div className="login-page-frame flex min-w-0 flex-1 flex-col px-5 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:px-8">
          <header className="flex h-14 items-center justify-between gap-3">
            {isNativeApp ? (
              <span className="inline-flex">{mobileLogo}</span>
            ) : (
              <Link aria-label="Retour à l'accueil" className="inline-flex lg:hidden" to="/">
                {mobileLogo}
              </Link>
            )}
            <div className="ml-auto flex items-center gap-1">
              {!isNativeApp && (
                <Link className={t.back} to="/">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Accueil
                </Link>
              )}
              <MarketingThemeToggle className={t.toggleTheme} isDark={isDark} onToggle={toggleTheme} />
            </div>
          </header>

          <main className="flex flex-1 items-center justify-center py-10">
            <motion.div className="w-full max-w-[400px]" {...fadeUp(0)}>
              {mustChangePassword ? (
                <>
                  <h1 className={`text-[1.75rem] font-semibold tracking-[-0.025em] ${t.title}`}>Nouveau mot de passe</h1>
                  <p className={`mt-2 text-[15px] leading-6 ${t.muted}`}>
                    Pour des raisons de sécurité, définissez un mot de passe personnel avant d&apos;accéder à votre espace.
                  </p>
                  <form className="mt-8 grid gap-5" noValidate onSubmit={handlePasswordChange}>
                    <PasswordField
                      autoComplete="new-password"
                      id="login-new-password"
                      inputClass={t.input}
                      label="Nouveau mot de passe"
                      labelClass={t.label}
                      minLength={8}
                      onChange={setNewPassword}
                      onToggle={() => setShowNewPassword((current) => !current)}
                      placeholder="Ex. Pedagogia1"
                      toggleClass={t.toggle}
                      value={newPassword}
                      visible={showNewPassword}
                    />
                    <PasswordField
                      autoComplete="new-password"
                      id="login-confirm-password"
                      inputClass={t.input}
                      label="Confirmer le mot de passe"
                      labelClass={t.label}
                      minLength={8}
                      onChange={setConfirmPassword}
                      placeholder="Répétez le mot de passe"
                      value={confirmPassword}
                      visible={showNewPassword}
                    />
                    <p className={`-mt-2 text-xs leading-5 ${t.muted}`}>{PASSWORD_POLICY_HINT}</p>
                    {authError && (
                      <p className={t.error} role="alert">
                        {authError}
                      </p>
                    )}
                    <button
                      className={primaryButton}
                      disabled={submitting || !isPasswordPolicyMet(newPassword) || !confirmPassword}
                      type="submit"
                    >
                      {submitting ? 'Enregistrement…' : 'Enregistrer et continuer'}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h1 className={`text-[1.75rem] font-semibold tracking-[-0.025em] ${t.title}`}>Connexion</h1>
                  <p className={`mt-2 text-[15px] leading-6 ${t.muted}`}>
                    Connectez-vous avec les identifiants fournis par votre auto-école.
                  </p>

                  <form className="mt-8 grid gap-5" noValidate onSubmit={handleSubmit}>
                    <div>
                      <label className={t.label} htmlFor="login-email">
                        Adresse e-mail
                      </label>
                      <input
                        autoCapitalize="none"
                        autoComplete="username"
                        autoCorrect="off"
                        className={`mt-1.5 ${t.input}`}
                        id="login-email"
                        inputMode="email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="nom@auto-ecole.fr"
                        spellCheck={false}
                        type="email"
                        value={email}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className={t.label} htmlFor="login-password">
                          Mot de passe
                        </label>
                        <button className={`text-sm ${t.link}`} onClick={() => setForgotOpen(true)} type="button">
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className="relative mt-1.5">
                        <input
                          autoComplete="current-password"
                          className={`${t.input} pr-12`}
                          id="login-password"
                          onChange={(event) => setPassword(event.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                        />
                        <button
                          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          className={t.toggle}
                          onClick={() => setShowPassword((current) => !current)}
                          type="button"
                        >
                          {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                    </div>

                    {forgotOpen && (
                      <div className={t.box}>
                        <p className={`font-semibold ${t.title}`}>Réinitialiser le mot de passe</p>
                        {forgotSent ? (
                          <p className="mt-1">
                            Si un compte existe pour <strong>{email.trim()}</strong>, un e-mail contenant un lien de
                            réinitialisation vient d&apos;être envoyé. Pensez à vérifier vos courriers indésirables.
                          </p>
                        ) : (
                          <p className="mt-1">
                            Un lien sécurisé sera envoyé à l&apos;adresse e-mail saisie ci-dessus.
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-4">
                          {!forgotSent && (
                            <button
                              className="inline-flex h-9 items-center rounded-lg bg-[#1769FF] px-3.5 text-sm font-semibold text-white transition hover:bg-[#145fe8] disabled:opacity-50"
                              disabled={forgotSending || !email.trim()}
                              onClick={handleForgotPassword}
                              type="button"
                            >
                              {forgotSending ? 'Envoi…' : 'Envoyer le lien'}
                            </button>
                          )}
                          <button
                            className={`text-sm ${t.link}`}
                            onClick={() => {
                              setForgotOpen(false)
                              setForgotSent(false)
                            }}
                            type="button"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}

                    <label className={`inline-flex cursor-pointer items-center gap-2.5 text-sm ${t.muted}`}>
                      <input
                        checked={rememberMe}
                        className={t.checkbox}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        type="checkbox"
                      />
                      Rester connecté sur cet appareil
                    </label>

                    {authError && (
                      <p className={t.error} role="alert">
                        {authError}
                      </p>
                    )}

                    <button className={primaryButton} disabled={!canSubmit || submitting} type="submit">
                      {submitting ? 'Connexion…' : 'Se connecter'}
                    </button>
                  </form>

                  {!isNativeApp && (
                    <p className={`mt-8 border-t pt-6 text-sm ${t.divider} ${t.muted}`}>
                      Votre auto-école n&apos;utilise pas encore Pedagogia Drive ?{' '}
                      <Link className={t.link} to="/#demonstration">
                        Demander une démonstration
                      </Link>
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </main>

          <footer className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-2 text-xs ${t.muted} ${isNativeApp ? '' : 'lg:hidden'}`}>
            <Link className="transition hover:underline" to="/mentions-legales">
              Mentions légales
            </Link>
            <Link className="transition hover:underline" to="/politique-confidentialite">
              Confidentialité
            </Link>
            <span>© {new Date().getFullYear()} Pedagogia Drive</span>
          </footer>
        </div>
      </div>
    </div>
  )
}
