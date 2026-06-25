/**
 * Client-side entry point for market data (real quotes + symbol search).
 * Like the bank client, the PWA never calls the data provider directly: it goes
 * through the `quotes` Edge Function, which holds the API key and caches results
 * server-side. In demo mode (no Supabase) we return deterministic simulated
 * quotes so the whole patrimoine UI works offline.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { demoStore } from '@/data/demoStore'
import { demoSymbolSearch } from '@/data/demo'
import { mapQuote, type Row } from '@/data/mappers'
import type { Quote, SymbolSearchResult } from '@/types'

/** Récupère les cours réels d'une liste de symboles. */
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const unique = [...new Set(symbols.filter(Boolean))]
  if (unique.length === 0) return []
  if (!isSupabaseConfigured || !supabase) return demoStore.quotesFor(unique)

  const { data, error } = await supabase.functions.invoke('quotes', {
    body: { action: 'quotes', symbols: unique },
  })
  if (error) throw new Error(error.message)
  return ((data as { quotes?: Row[] })?.quotes ?? []).map(mapQuote)
}

/** Recherche de symbole pour l'ajout d'une position cotée. */
export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  if (!isSupabaseConfigured || !supabase) return demoSymbolSearch(q)

  const { data, error } = await supabase.functions.invoke('quotes', {
    body: { action: 'search', query: q },
  })
  if (error) throw new Error(error.message)
  return (data as { results?: SymbolSearchResult[] })?.results ?? []
}
