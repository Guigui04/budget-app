/** Libellés, couleurs et icônes des classes d'actifs et enveloppes. */
import {
  Bitcoin,
  CircleDashed,
  Home,
  Landmark,
  LineChart,
  Percent,
  PiggyBank,
  RefreshCw,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { HoldingEnvelope, HoldingKind, SavingsRuleType } from '@/types'

export interface KindMeta {
  label: string
  color: string
  icon: LucideIcon
  /** True si l'actif se valorise via un cours de marché (symbole requis). */
  quoted: boolean
}

export const KIND_META: Record<HoldingKind, KindMeta> = {
  etf: { label: 'ETF', color: '#7c5cff', icon: LineChart, quoted: true },
  stock: { label: 'Action', color: '#6fa8dc', icon: TrendingUp, quoted: true },
  crypto: { label: 'Crypto', color: '#e8b24c', icon: Bitcoin, quoted: true },
  fund: { label: 'Fonds', color: '#46c79a', icon: Landmark, quoted: false },
  livret: { label: 'Livret', color: '#7fd1a8', icon: PiggyBank, quoted: false },
  real_estate: { label: 'Immobilier', color: '#f0784a', icon: Home, quoted: false },
  cash: { label: 'Liquidités', color: '#a89e8c', icon: Wallet, quoted: false },
  other: { label: 'Autre', color: '#b58df1', icon: CircleDashed, quoted: false },
}

export const ENVELOPE_META: Record<HoldingEnvelope, string> = {
  PEA: 'PEA',
  AV: 'Assurance-vie',
  CTO: 'Compte-titres',
  crypto: 'Crypto',
  livret: 'Livret',
  autre: 'Autre',
}

export const KIND_ORDER: HoldingKind[] = ['etf', 'stock', 'crypto', 'fund', 'livret', 'real_estate', 'cash', 'other']
export const ENVELOPE_ORDER: HoldingEnvelope[] = ['PEA', 'AV', 'CTO', 'crypto', 'livret', 'autre']

export interface SavingsRuleMeta {
  label: string
  /** Promesse en une phrase, affichée sur les modèles. */
  desc: string
  icon: LucideIcon
  color: string
}

export const SAVINGS_RULE_META: Record<SavingsRuleType, SavingsRuleMeta> = {
  roundup: { label: 'Arrondir mes achats', desc: 'Chaque paiement arrondi à l’euro supérieur, mis de côté.', icon: RefreshCw, color: '#7c5cff' },
  surplus_sweep: { label: 'Balayer le surplus', desc: 'Le surplus prévu en fin de mois part vers un objectif.', icon: Zap, color: '#46c79a' },
  income_pct: { label: '% de mes revenus', desc: 'Une part de chaque rentrée automatiquement épargnée.', icon: Percent, color: '#f0784a' },
  category_trigger: { label: 'Déclencheur par catégorie', desc: 'Ex. chaque resto → un montant fixe de côté.', icon: Landmark, color: '#6fa8dc' },
}

export const SAVINGS_RULE_ORDER: SavingsRuleType[] = ['roundup', 'surplus_sweep', 'income_pct', 'category_trigger']
