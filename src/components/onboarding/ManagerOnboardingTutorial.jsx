import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppModal, { AppModalFooter } from '../ui/AppModal'
import { useAuth } from '../../context/AuthContext'
import { isNativeApp } from '../../lib/nativeApp'
import {
  MANAGER_ONBOARDING_STEPS,
  completeManagerOnboarding,
  shouldShowManagerOnboarding,
} from '../../lib/managerOnboarding'

function formatTrialEnd(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

export default function ManagerOnboardingTutorial() {
  const { user, organization, subscription, profile, role } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [busy, setBusy] = useState(false)

  const steps = MANAGER_ONBOARDING_STEPS
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  const trialEndLabel = useMemo(
    () => formatTrialEnd(subscription?.trial_ends_at),
    [subscription?.trial_ends_at],
  )

  useEffect(() => {
    if (role !== 'manager' || !user) {
      setOpen(false)
      return
    }
    if (shouldShowManagerOnboarding(user, location.state)) {
      setOpen(true)
      setStepIndex(0)
    }
  }, [role, user, location.state])

  useEffect(() => {
    if (!open || !location.state?.managerOnboarding) return
    navigate(location.pathname + location.search, { replace: true, state: {} })
  }, [open, location.pathname, location.search, location.state, navigate])

  const finish = useCallback(async (nextHref) => {
    setBusy(true)
    try {
      await completeManagerOnboarding()
    } catch (err) {
      console.warn('[ManagerOnboardingTutorial] complete failed', err)
    } finally {
      setBusy(false)
      setOpen(false)
      if (nextHref) navigate(nextHref)
    }
  }, [navigate])

  const handleSkip = () => {
    void finish(null)
  }

  const handleNext = () => {
    if (isLast) {
      void finish(null)
      return
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1))
  }

  const handlePrevious = () => {
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  const handleGoToPage = () => {
    const href = step.href
    void finish(href)
  }

  if (!open || !step) return null

  const orgName = organization?.name?.trim()
  const contactName = profile?.full_name?.trim()

  return (
    <AppModal
      open={open}
      onClose={handleSkip}
      closeOnBackdrop={false}
      eyebrow="Première connexion"
      title={step.title}
      subtitle={
        step.id === 'welcome' && orgName
          ? `${orgName}${contactName ? ` — ${contactName}` : ''}`
          : `Étape ${stepIndex + 1} sur ${steps.length}`
      }
      size="lg"
      ariaLabel="Tutoriel de première connexion gérant"
      footer={
        <AppModalFooter
          onClose={handleSkip}
          closeLabel="Passer le tutoriel"
          hideSubmit
        >
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  type="button"
                  className="pd-btn-secondary w-full sm:w-auto"
                  onClick={handlePrevious}
                  disabled={busy}
                >
                  Précédent
                </button>
              )}
              {step.href ? (
                <button
                  type="button"
                  className="pd-btn-primary w-full sm:w-auto"
                  onClick={handleGoToPage}
                  disabled={busy}
                >
                  {step.cta || 'Ouvrir la page'}
                </button>
              ) : (
                <button
                  type="button"
                  className="pd-btn-primary w-full sm:w-auto"
                  onClick={handleNext}
                  disabled={busy}
                >
                  {isLast ? 'Commencer' : 'Suivant'}
                </button>
              )}
            </div>
            {!isLast && step.href && (
              <button
                type="button"
                className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                onClick={handleNext}
                disabled={busy}
              >
                Continuer sans ouvrir
              </button>
            )}
          </div>
        </AppModalFooter>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          {steps.map((item, index) => (
            <span
              key={item.id}
              className={`h-2 flex-1 rounded-full transition-colors ${
                index <= stepIndex ? 'bg-blue-500' : 'bg-slate-200'
              }`}
              aria-hidden
            />
          ))}
        </div>

        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 text-center">
          <span className="text-5xl" role="img" aria-hidden>
            {step.icon}
          </span>
          <p className="mt-4 text-base leading-relaxed text-slate-700">{step.description}</p>
          {step.id === 'welcome' && trialEndLabel && !isNativeApp && (
            <p className="mt-3 text-sm font-semibold text-blue-800">
              Essai gratuit actif jusqu&apos;au {trialEndLabel}
            </p>
          )}
        </div>

        {step.id === 'dashboard' && (
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Menu latéral : accès rapide à toutes les sections de votre auto-école.</span>
            </li>
            {!isNativeApp && (
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>Bandeau cyan : suivi de votre essai gratuit et du nombre d&apos;élèves.</span>
              </li>
            )}
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Cloche de notification : messages non lus de votre équipe.</span>
            </li>
          </ul>
        )}
      </div>
    </AppModal>
  )
}
