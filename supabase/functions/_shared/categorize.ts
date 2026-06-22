/**
 * Catégorisation : 1) règles utilisateur, 2) heuristique mot-clé → catégorie.
 * Renvoie le nom de catégorie par défaut (résolu en id côté appelant) ou null.
 */

interface Rule {
  match_pattern: string
  category_id: string
  priority: number
}

const KEYWORD_MAP: { keywords: string[]; category: string }[] = [
  { keywords: ['carrefour', 'leclerc', 'auchan', 'monoprix', 'lidl', 'biocoop', 'intermarche', 'super u', 'casino'], category: 'Courses' },
  { keywords: ['restaurant', 'bistrot', 'sushi', 'mcdo', 'burger', 'boulangerie', 'uber eats', 'deliveroo', 'pizza'], category: 'Restaurants' },
  { keywords: ['total', 'esso', 'sncf', 'uber', 'ratp', 'bolt', 'station', 'autoroute', 'parking', 'essence'], category: 'Transport' },
  { keywords: ['loyer', 'sci', 'foncia', 'assurance', 'maif', 'macif'], category: 'Logement' },
  { keywords: ['edf', 'engie', 'total energies', 'electricite', 'gaz', 'eau'], category: 'Énergie' },
  { keywords: ['netflix', 'spotify', 'apple.com', 'icloud', 'amazon prime', 'disney', 'canal', 'youtube premium'], category: 'Abonnements' },
  { keywords: ['fnac', 'cinema', 'pathe', 'ugc', 'basic fit', 'fitness', 'steam', 'playstation'], category: 'Loisirs' },
  { keywords: ['pharmacie', 'doctolib', 'medecin', 'hopital', 'dentiste', 'optique'], category: 'Santé' },
  { keywords: ['zara', 'h&m', 'decathlon', 'darty', 'fnac', 'amazon', 'zalando', 'sephora'], category: 'Shopping' },
  { keywords: ['hotel', 'airbnb', 'booking', 'ryanair', 'air france', 'easyjet'], category: 'Voyages' },
  { keywords: ['salaire', 'vir salaire', 'remuneration', 'traitement paie'], category: 'Salaire' },
]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Match d'un mot-clé en MOT ENTIER (frontières de mot), pour éviter les faux
 * positifs par sous-chaîne — ex. « paie » dans « PAIEMENT », « eau » dans
 * « BUREAU », « gaz » dans « MAGAZINE ».
 */
function hasKeyword(haystack: string, keyword: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword)}([^a-z0-9]|$)`, 'i').test(haystack)
}

export function categorizeLabel(label: string, rules: Rule[]): string | null {
  const haystack = label.toLowerCase()

  // 1) Règles utilisateur (priorité d'abord) — match en mot entier.
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)
  for (const r of sorted) {
    if (hasKeyword(haystack, r.match_pattern.toLowerCase())) return r.category_id // déjà un id
  }

  // 2) Heuristique par mots-clés → nom de catégorie par défaut.
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((k) => hasKeyword(haystack, k))) return `name:${entry.category}`
  }
  return null
}

/** Nettoie un libellé brut bancaire en quelque chose de lisible. */
export function cleanLabel(raw: string): string {
  return raw
    .replace(/\bCB\b|\bPAIEMENT\b|\bCARTE\b|\bVIR\b|\bPRLV\b/gi, '')
    .replace(/\d{2}\/\d{2}\/\d{2,4}/g, '')
    .replace(/\d{6,}/g, '')
    .replace(/\*+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 60) || raw.slice(0, 60)
}
