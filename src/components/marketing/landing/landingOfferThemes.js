import { Crown, Gift, Rocket } from 'lucide-react'

/**
 * Couleur de chaque offre, reprise par les cartes de tarifs et le formulaire de démonstration :
 * vert pour l'essai, bleu pour Starter, violet pour Premium.
 */
export const OFFER_THEMES = {
  trial: {
    icon: Gift,
    bar: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    chip: 'bg-emerald-500/12 text-[var(--lp-offer-trial)]',
    name: 'text-[var(--lp-offer-trial)]',
    check: 'text-[var(--lp-offer-trial)]',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
    ring: 'border-emerald-500 ring-2 ring-emerald-500',
    hover: 'hover:border-emerald-400',
    tint: 'bg-emerald-500/[0.06]',
  },
  starter: {
    icon: Rocket,
    bar: 'bg-gradient-to-r from-sky-400 to-[#1769FF]',
    chip: 'bg-[#1769FF]/12 text-[var(--lp-offer-starter)]',
    name: 'text-[var(--lp-offer-starter)]',
    check: 'text-[var(--lp-offer-starter)]',
    button: 'bg-[#1769FF] text-white hover:bg-[#145fe8]',
    ring: 'border-[#1769FF] ring-2 ring-[#1769FF]',
    hover: 'hover:border-[#1769FF]',
    tint: 'bg-[#1769FF]/[0.06]',
  },
  premium: {
    icon: Crown,
    bar: 'bg-gradient-to-r from-violet-400 to-violet-600',
    chip: 'bg-violet-500/12 text-[var(--lp-offer-premium)]',
    name: 'text-[var(--lp-offer-premium)]',
    check: 'text-[var(--lp-offer-premium)]',
    button: 'bg-violet-600 text-white hover:bg-violet-700',
    ring: 'border-violet-500 ring-2 ring-violet-500',
    hover: 'hover:border-violet-400',
    tint: 'bg-violet-500/[0.06]',
  },
}

export function offerTheme(id) {
  return OFFER_THEMES[id] || OFFER_THEMES.starter
}
