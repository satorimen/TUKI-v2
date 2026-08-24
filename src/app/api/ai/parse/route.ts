import { NextResponse } from 'next/server';
import { getAIProvider, resolveCityInDraft } from '@/lib/ai';
import type { ParseInput } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/parse
 * Body: ParseInput (message, history, draft, locale)
 * Returns: ParseResult + provider kind (for the UI to show a dev badge)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ParseInput;

    if (!body || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    if (body.message.length > 4000) {
      return NextResponse.json({ error: 'message too long' }, { status: 400 });
    }

    const { provider, kind } = getAIProvider();
    const result = await provider.parse({
      message: body.message,
      history: Array.isArray(body.history) ? body.history.slice(-20) : [],
      draft: body.draft ?? null,
      locale: body.locale ?? 'he',
    });

    return NextResponse.json({ ...resolveCityInDraft(result), provider: kind });
  } catch (error) {
    console.error('[POST /api/ai/parse]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
