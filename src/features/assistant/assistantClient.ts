import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Interroge l'assistant (Edge Function `assistant`). Renvoie la réponse texte. */
export async function askAssistant(question: string, context: string, history: ChatMessage[]): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    return "En mode démo, l'assistant n'est pas disponible : il faut un projet Supabase et une clé Groq."
  }
  const { data, error } = await supabase.functions.invoke('assistant', {
    body: { question, context, history },
  })
  if (error) throw new Error(error.message)
  const res = data as { answer?: string; error?: string }
  return res.answer ?? res.error ?? "Je n'ai pas pu répondre."
}
