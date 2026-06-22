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
  { keywords: ['carrefour', 'leclerc', 'auchan', 'monoprix', 'lidl', 'biocoop', 'intermarche', 'super u', 'hyper u', 'casino', 'franprix', 'naturalia', 'grand frais', 'aldi', 'cora', 'leader price', 'picard', 'metro', 'supermarche', 'epicerie', 'primeur'], category: 'Courses' },
  { keywords: ['restaurant', 'bistrot', 'brasserie', 'sushi', 'mcdo', 'mcdonald', 'kfc', 'subway', 'burger', 'boulangerie', 'patisserie', 'uber eats', 'deliveroo', 'just eat', 'pizza', 'pizzeria', 'kebab', 'tacos', 'starbucks', 'brioche', 'flunch', 'buffalo grill', 'creperie', 'traiteur', 'mie', 'nosh'], category: 'Restaurants' },
  { keywords: ['total', 'esso', 'sncf', 'uber', 'ratp', 'bolt', 'station', 'autoroute', 'parking', 'essence', 'shell', 'avia', 'peage', 'vinci', 'sanef', 'aprr', 'velib', 'lime', 'blablacar', 'flixbus', 'semepa', 'tisseo', 'carburant'], category: 'Transport' },
  { keywords: ['loyer', 'sci', 'foncia', 'nexity', 'assurance', 'maif', 'macif', 'matmut', 'gmf', 'axa', 'allianz', 'syndic', 'copropriete'], category: 'Logement' },
  { keywords: ['edf', 'engie', 'total energies', 'electricite', 'gaz', 'veolia', 'saur', 'suez', 'enedis', 'eaux', 'service des eaux'], category: 'Énergie' },
  { keywords: ['netflix', 'spotify', 'deezer', 'apple.com', 'apple com', 'itunes', 'icloud', 'amazon prime', 'prime video', 'disney', 'canal', 'youtube', 'audible', 'free', 'orange', 'sfr', 'bouygues', 'sosh', 'chatgpt', 'openai', 'anthropic', 'claude', 'github', 'adobe', 'microsoft', 'dropbox', 'notion'], category: 'Abonnements' },
  { keywords: ['cinema', 'pathe', 'gaumont', 'ugc', 'mk2', 'theatre', 'basic fit', 'basic-fit', 'fitness', 'neoness', 'steam', 'playstation', 'nintendo', 'xbox', 'concert', 'musee', 'piscine', 'bowling'], category: 'Loisirs' },
  { keywords: ['pharmacie', 'doctolib', 'medecin', 'hopital', 'clinique', 'dentiste', 'opticien', 'optique', 'laboratoire', 'kine', 'osteopathe', 'mutuelle', 'ameli', 'cpam', 'labo'], category: 'Santé' },
  { keywords: ['zara', 'h&m', 'decathlon', 'darty', 'boulanger', 'fnac', 'amazon', 'zalando', 'sephora', 'leroy merlin', 'castorama', 'ikea', 'action', 'gifi', 'primark', 'uniqlo', 'kiabi', 'cdiscount', 'veepee', 'vinted', 'shein', 'nike', 'adidas', 'jardiland'], category: 'Shopping' },
  { keywords: ['hotel', 'airbnb', 'booking', 'ryanair', 'air france', 'easyjet', 'transavia', 'volotea', 'expedia', 'abritel', 'hertz', 'europcar', 'sixt', 'trainline', 'oui sncf', 'sncf connect', 'camping'], category: 'Voyages' },
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

/**
 * Nettoie un libellé brut bancaire pour ne garder que le marchand.
 * Retire les mots techniques, le jeton de carte (X3085), les dates (JJ/MM),
 * les longs nombres et la ponctuation parasite. Indispensable pour que les
 * règles « toujours classer X » généralisent d'une opération à l'autre.
 */
export function cleanLabel(raw: string): string {
  const cleaned = raw
    .replace(/\b(CB|PAIEMENT|PAIE|PAR|CARTE|ACHAT|RETRAIT|VIR(EMENT)?|PRLV|PRELEVEMENT|FACTURE|REMISE|COMMERCE|ELECTRONIQUE)\b/gi, ' ')
    .replace(/\bX\d{2,}\b/gi, ' ')                       // jeton carte ex. X3085
    .replace(/\b\d{2}[/.]\d{2}([/.]\d{2,4})?\b/g, ' ') // dates JJ/MM(/AAAA)
    .replace(/\d{5,}/g, ' ')                             // longs nombres
    .replace(/[*#]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 48)
  return cleaned || raw.slice(0, 48)
}
