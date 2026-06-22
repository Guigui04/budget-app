import {
  Briefcase,
  Car,
  CircleDashed,
  HeartPulse,
  Home,
  PartyPopper,
  PiggyBank,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const registry: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  home: Home,
  zap: Zap,
  repeat: Repeat,
  'party-popper': PartyPopper,
  'heart-pulse': HeartPulse,
  'shopping-bag': ShoppingBag,
  plane: Plane,
  briefcase: Briefcase,
  'piggy-bank': PiggyBank,
  'circle-dashed': CircleDashed,
}

interface CategoryIconProps {
  icon: string
  color: string
  size?: number
}

/** A category glyph inside a soft tinted chip. */
export function CategoryIcon({ icon, color, size = 40 }: CategoryIconProps) {
  const Icon = registry[icon] ?? CircleDashed
  return (
    <span
      className="cat-chip"
      style={{ width: size, height: size, background: `${color}22`, color }}
    >
      <Icon size={size * 0.5} strokeWidth={2} />
    </span>
  )
}
