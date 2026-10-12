/** @typedef {Record<string, string | number | boolean | undefined>} GtagEventParams */

import { isNativeApp } from './nativeApp'

const FALLBACK_MEASUREMENT_ID = ''

let initialized = false
let debugMode = false

function readEnv(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[name]) {
    return String(import.meta.env[name]).trim()
  }
  if (typeof process !== 'undefined' && process.env?.[name]) {
    return String(process.env[name]).trim()
  }
  return ''
}

function isTruthyEnv(value) {
  if (!value) return false
  const normalized = value.toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

/** ID GA4 — NEXT_PUBLIC_GA_MEASUREMENT_ID (Next.js / Vercel) ou VITE_GA_MEASUREMENT_ID (Vite). */
export function getGaMeasurementId() {
  return (
    readEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID')
    || readEnv('VITE_GA_MEASUREMENT_ID')
    || FALLBACK_MEASUREMENT_ID
  )
}

export const GA_MEASUREMENT_ID = getGaMeasurementId()

export function getGaScriptSrc(measurementId = getGaMeasurementId()) {
  return measurementId
    ? `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    : ''
}

function isProduction() {
  if (typeof import.meta !== 'undefined' && typeof import.meta.env?.PROD === 'boolean') {
    return import.meta.env.PROD
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === 'production'
  }
  return false
}

function hasUrlDebugFlag() {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('ga_debug') === '1'
  } catch {
    return false
  }
}

/** Active GA4 DebugView (prod, dev avec flag, ou ?ga_debug=1). */
export function isGaDebugEnabled() {
  return (
    isTruthyEnv(readEnv('NEXT_PUBLIC_GA_DEBUG'))
    || isTruthyEnv(readEnv('VITE_GA_DEBUG'))
    || hasUrlDebugFlag()
  )
}

function shouldSendAnalytics() {
  return isProduction() || isGaDebugEnabled()
}

function hasGtag() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/** Charge gtag.js — à appeler une seule fois (SPA ou après next/script). */
export function initGoogleAnalytics(measurementId = getGaMeasurementId()) {
  if (initialized || !measurementId || typeof document === 'undefined') {
    return false
  }
  if (!shouldSendAnalytics()) {
    return false
  }
  // Pas de mesure d'audience Google dans l'app iPhone (déclaration de confidentialité Apple).
  if (isNativeApp) {
    return false
  }

  debugMode = isGaDebugEnabled()
  initialized = true

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
    ...(debugMode ? { debug_mode: true } : {}),
  })

  if (!document.querySelector(`script[src="${getGaScriptSrc(measurementId)}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = getGaScriptSrc(measurementId)
    document.head.appendChild(script)
  }

  if (debugMode && typeof console !== 'undefined') {
    console.info('[GA4] DebugView activé — événements visibles dans Analytics → DebugView')
  }

  return true
}

export function trackPageView(pagePath, measurementId = getGaMeasurementId()) {
  if (!shouldSendAnalytics() || !measurementId || !hasGtag()) return

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function trackGtagEvent(eventName, params = {}) {
  if (!shouldSendAnalytics() || !hasGtag()) return

  const payload = { ...params }
  if (isGaDebugEnabled()) {
    payload.debug_mode = true
  }

  window.gtag('event', eventName, payload)

  if (isGaDebugEnabled() && typeof console !== 'undefined') {
    console.info(`[GA4] event → ${eventName}`, payload)
  }
}
