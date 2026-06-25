/** Libellés, couleurs et icônes des classes d'actifs et enveloppes. */
import {
  Bitcoin,
  CircleDashed,
  Home,
  Landmark,
  LineChart,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { HoldingEnvelope, HoldingKind } from '@/types'

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
