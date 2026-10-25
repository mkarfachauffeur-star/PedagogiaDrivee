/** Offres affichées sur l’accueil. Alignées sur la table `plans`. */
export const LANDING_OFFERS = [
  {
    id: 'trial',
    name: 'Essai gratuit',
    price: '0 €',
    period: '30 jours',
    features: ['Toutes les fonctionnalités', 'Sans engagement'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '79 €',
    period: 'par mois',
    note: 'Engagement annuel, facturation mensuelle',
    features: ['Jusqu’à 50 élèves', 'Toutes les fonctionnalités'],
    highlighted: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '99 €',
    period: 'par mois',
    note: 'Engagement annuel, facturation mensuelle',
    features: ['Élèves illimités', 'Toutes les fonctionnalités'],
  },
]

export function landingOfferById(id) {
  return LANDING_OFFERS.find((offer) => offer.id === id) || null
}
