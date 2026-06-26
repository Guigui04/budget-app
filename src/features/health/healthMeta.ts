import { PiggyBank, Umbrella, Target, Repeat, type LucideIcon } from 'lucide-react'
import type { HealthComponentKey, HealthGrade } from '@/data/selectors'
import { formatPercent } from '@/lib/format'

export interface GradeMeta {
  label: string
  color: string
  /** Phrase d'accroche affichée sous la note. */
  blurb: string
}

export const GRADE_META: Record<HealthGrade, GradeMeta> = {
  excellent: { label: 'Excellente', color: 'var(--positive)', blurb: 'Tes finances sont solides — continue comme ça.' },
  good: { label: 'Bonne', color: 'var(--accent)', blurb: 'Bonne base, quelques marges de progression.' },
  fair: { label: 'Correcte', color: 'var(--amber)', blurb: 'Des points à renforcer pour gagner en sérénité.' },
  fragile: { label: 'Fragile', color: 'var(--negative)', blurb: 'Quelques réflexes à mettre en place en priorité.' },
}

export interface ComponentMeta {
  label: string
  icon: LucideIcon
  /** Format de la valeur brute en libellé lisible. */
  format: (value: number) => string
  /** Conseil affiché quand la dimension est faible. */
  tip: string
}

function months(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} mois`
}

export const HEALTH_META: Record<HealthComponentKey, ComponentMeta> = {
  savings: {
    label: 'Taux d’épargne',
    icon: PiggyBank,
    format: (v) => formatPercent(v),
    tip: 'Vise ~20 % d’épargne : automatise un virement dès la paie.',
  },
  emergency: {
    label: 'Fonds d’urgence',
    icon: Umbrella,
    format: months,
    tip: 'Constitue 3 à 6 mois de dépenses en épargne de précaution.',
  },
  budget: {
    label: 'Maîtrise du budget',
    icon: Target,
    format: (v) => `${formatPercent(v)} respecté`,
    tip: 'Tu dépasses certaines enveloppes — ajuste-les dans Budgets.',
  },
  subscriptions: {
    label: 'Poids des abonnements',
    icon: Repeat,
    format: (v) => `${formatPercent(v)} du revenu`,
    tip: 'Tes abonnements pèsent lourd — traque les doublons et oubliés.',
  },
}

/** Seuil sous lequel on affiche le conseil d'amélioration. */
export const TIP_THRESHOLD = 60
