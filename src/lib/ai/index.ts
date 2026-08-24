import { matchCityId } from '@/lib/geo/city-match';
import { GeminiProvider } from './gemini-provider';
import { MockProvider } from './mock-provider';
import type { AIProvider, ParseResult } from './types';

export type ProviderKind = 'gemini' | 'mock';

/**
 * Provider factory.
 * - GEMINI_API_KEY set → Gemini (with built-in Mock fallback on errors)
 * - otherwise → Mock (deterministic rule-based parsing, fine for dev/demo)
 */
export function getAIProvider(): { provider: AIProvider; kind: ProviderKind } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    return { provider: new GeminiProvider(apiKey), kind: 'gemini' };
  }
  return { provider: new MockProvider(), kind: 'mock' };
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
