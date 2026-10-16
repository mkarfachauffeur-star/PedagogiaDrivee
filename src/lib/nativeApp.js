import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'

export const isNativeApp = Capacitor.isNativePlatform()
export const isIOS = Capacitor.getPlatform() === 'ios'

// Sans viewport-fit=cover, WKWebView résout env(safe-area-inset-*) à 0 et tout
// le contenu passe sous la barre d'état. Le HTML réellement servi dans l'app
// peut être plus ancien que le dépôt : on l'impose aussi à l'exécution.
function ensureViewportFitCover() {
  const viewport = document.querySelector('meta[name="viewport"]')
  if (!viewport) return
  if (/viewport-fit=cover/.test(viewport.content)) return
  viewport.content = /viewport-fit=[^,]+/.test(viewport.content)
    ? viewport.content.replace(/viewport-fit=[^,]+/, 'viewport-fit=cover')
    : `${viewport.content}, viewport-fit=cover`
}

// Sur certains iPhone (régression WebKit, famille iOS 26), le WebView résout
// env(safe-area-inset-top) à 0 même avec viewport-fit=cover : tous les
// paddings de sécurité s'effondrent et la barre d'état recouvre le contenu.
// La hauteur native de la barre d'état, mesurée par le plugin, alimente
// --pd-safe-top ; le CSS prend max(env(...), var(--pd-safe-top)), donc les
// appareils sains restent sur env() et rien n'est doublé.
async function applyNativeSafeAreaTop() {
  try {
    const info = await StatusBar.getInfo()
    const height = Number(info?.height) || 0
    document.documentElement.style.setProperty('--pd-safe-top', `${Math.round(height)}px`)
    return height
  } catch {
    return 0
  }
}

// Diagnostic visible dans la console Xcode : mesure réelle des insets du
// WebView après application du viewport. envTop=0px avec une hauteur native
// > 0 confirme que WKWebView ne fournit pas les insets (bug WebKit).
async function logSafeAreaProbe(nativeHeight) {
  window.requestAnimationFrame(() => {
    const probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText =
      'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)'
    document.body.appendChild(probe)
    const style = window.getComputedStyle(probe)
    console.info(
      `[pd-safe-area] envTop=${style.paddingTop} envBottom=${style.paddingBottom} nativeTop=${nativeHeight}px`,
    )
    probe.remove()
  })
}

export async function initNativeApp() {
  if (!isNativeApp) return

  document.documentElement.classList.add(`capacitor-${Capacitor.getPlatform()}`)

  if (isIOS) {
    ensureViewportFitCover()
    const nativeSafeTop = await applyNativeSafeAreaTop()
    logSafeAreaProbe(nativeSafeTop)
    window.addEventListener('orientationchange', () => {
      applyNativeSafeAreaTop()
    })
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#2563eb' })
    await Keyboard.setScroll({ isDisabled: false })

    Keyboard.addListener('keyboardWillShow', () => {
      document.documentElement.classList.add('capacitor-keyboard-open')
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.classList.remove('capacitor-keyboard-open')
    })
  }

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) document.documentElement.classList.remove('capacitor-background')
    else document.documentElement.classList.add('capacitor-background')
  })

  window.addEventListener('load', () => {
    SplashScreen.hide().catch(() => {})
  })
}
