/**
 * Catalogue de libellés français.
 * Source de vérité unique pour les chaînes réutilisables de l'UI.
 * Pour ajouter une langue : créer `en.ts` avec les mêmes clés et brancher
 * un sélecteur dans `src/i18n/index.ts` (le type `Dictionary` garantit la parité).
 */
export const fr = {
  nav: {
    home: 'Accueil',
    transactions: 'Opérations',
    budgets: 'Budgets',
    goals: 'Objectifs',
    subscriptions: 'Abonnements',
    subscriptionsShort: 'Abos',
    accounts: 'Comptes',
    alerts: 'Notifications',
    settings: 'Réglages',
  },
  common: {
    appName: 'Foyer',
    loading: 'Chargement…',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    confirm: 'Confirmer',
    close: 'Fermer',
    back: 'Retour',
  },
  greeting: {
    night: 'Bonne nuit',
    morning: 'Bonjour',
    afternoon: 'Bon après-midi',
    evening: 'Bonsoir',
  },
} as const

export type Dictionary = typeof fr
