/**
 * Dérivation et vérification d'un code PIN applicatif.
 *
 * Le PIN n'est JAMAIS stocké en clair : on conserve uniquement un sel aléatoire
 * et le hash PBKDF2-SHA256 dérivé. La vérification re-dérive et compare en temps
 * constant. C'est un verrou de confort local (anti coup d'œil), pas un secret
 * serveur — les vraies données restent protégées par l'auth Supabase + RLS.
 */

const ITERATIONS = 150_000
const KEY_LENGTH_BITS = 256

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function generateSalt(): string {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return toHex(salt)
}

/** Dérive le hash hexadécimal d'un PIN avec le sel fourni. */
export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BITS,
  )
  return toHex(new Uint8Array(bits))
}

/** Comparaison à temps constant pour éviter les attaques temporelles. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Un PIN valide : 4 à 8 chiffres. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}
