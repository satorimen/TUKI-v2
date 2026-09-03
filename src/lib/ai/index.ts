import { matchCityId } from '@/lib/geo/city-match';
import { GeminiProvider } from './gemini-provider';
import { MockProvider } from './mock-provider';
import type { AIProvider, ParseResult } from './types';

export type ProviderKind = 'gemini' | 'mock';

/**
 * Provider factory.
 * - AI disabled explicitly (AI_DISABLED=1) → Mock (deterministic, offline)
 * - otherwise → Gemini via the Vercel AI Gateway (zero-config auth on v0/Vercel),
 *   with a built-in Mock fallback on any error so the chat never breaks.
 */
export function getAIProvider(): { provider: AIProvider; kind: ProviderKind } {
  if (process.env.AI_DISABLED === '1') {
    return { provider: new MockProvider(), kind: 'mock' };
  }
  return { provider: new GeminiProvider(), kind: 'gemini' };
}

/**
 * Resolve draft.city (free text from AI) to a canonical cityId
 * using fuzzy matching (hebrew prefixes, russian inflections, latin variants).
 */
export function resolveCityInDraft(result: ParseResult): ParseResult {
  if (!result.draft.cityId && result.draft.city) {
    const cityId = matchCityId(result.draft.city);
    if (cityId) result.draft.cityId = cityId;
  }
  return result;
}

export * from './types';
