import type { BankProvider } from './bankProvider.ts'
import { EnableBankingProvider } from './enableBanking.ts'

/**
 * Single place that decides which aggregator implementation to use.
 * Swap the provider here (Powens, Bridge…) without touching any function.
 */
export function getBankProvider(): BankProvider {
  const which = Deno.env.get('BANK_PROVIDER') ?? 'enablebanking'
  switch (which) {
    case 'enablebanking':
      return new EnableBankingProvider()
    default:
      throw new Error(`Unknown BANK_PROVIDER: ${which}`)
  }
}
