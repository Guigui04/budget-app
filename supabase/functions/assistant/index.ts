/**
 * assistant — proxy LLM (Groq) pour l'assistant « Demander à ton budget ».
 * Le front calcule le contexte financier (déterministe) et l'envoie ici ; cette
 * fonction y ajoute la consigne système et appelle le modèle gratuit. La clé API
 * reste côté serveur (secret GROQ_API_KEY) et ne transite jamais par le front.
 */
import { json, preflight } from '../_shared/cors.ts'
import { callerHousehold } from '../_shared/supabaseAdmin.ts'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Body {
  question?: unknown
  context?: unknown
  history?: unknown
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)
  const caller = await callerHousehold(authHeader)
  if (!caller) return json({ error: 'Foyer introuvable' }, 403)

  // Messages destinés à l'utilisateur renvoyés en 200 (affichés tels quels).
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) return json({ error: "L'assistant n'est pas encore configuré (clé API manquante)." })

  try {
    const body = (await req.json()) as Body
    const question = typeof body.question === 'string' ? body.question.slice(0, 1000) : ''
    const context = typeof body.context === 'string' ? body.context.slice(0, 12000) : ''
    if (!question) return json({ error: 'Pose-moi une question 🙂' })

    const history: ChatMessage[] = Array.isArray(body.history)
      ? (body.history as ChatMessage[])
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-6)
      : []

    const today = new Date().toISOString().slice(0, 10)
    const system = [
      "Tu es l'assistant financier personnel intégré à une app de budget familiale.",
      'Tu réponds en français, de façon concise (2 à 4 phrases), chaleureuse et précise.',
      'Règles impératives :',
      "- Base-toi UNIQUEMENT sur les données fournies ci-dessous. N'invente JAMAIS un chiffre.",
      "- Si l'information demandée n'est pas dans les données, dis-le simplement.",
      `- Les montants sont en euros. La date du jour est ${today}.`,
      "- Pour « est-ce que je peux me permettre X ? », compare X au solde projeté de fin de mois et au disponible, puis donne un avis clair.",
      '- Donne des montants concrets, pas de blabla.',
      '',
      'DONNÉES DU FOYER :',
      context,
    ].join('\n')

    const messages = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: question },
    ]

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, max_tokens: 500 }),
    })

    if (!res.ok) {
      const status = res.status
      throw new Error(`Modèle indisponible (${status}). Réessaie dans un instant.`)
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const answer = data.choices?.[0]?.message?.content?.trim() ?? "Je n'ai pas pu formuler de réponse."
    return json({ answer })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assistant indisponible'
    return json({ error: message })
  }
})
