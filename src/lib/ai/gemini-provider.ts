import { generateObject } from 'ai';
import { z } from 'zod';
import { CATEGORY_IDS, type CategoryId } from '@/lib/tasks/categories';
import { scrubPII } from './sanitize';
import { MockProvider } from './mock-provider';
import type { AIProvider, ParseInput, ParseResult, TaskDraft, Language } from './types';

/**
 * Gemini-backed provider via the Vercel AI Gateway (AI SDK).
 *
 * - Uses `generateObject` with a strict zod schema → no fragile JSON parsing
 * - Model is resolved through the AI Gateway (zero-config auth on v0/Vercel)
 * - Detects the user's language (he/ru/en) and always replies in it
 * - PII is scrubbed before anything leaves the server
 * - On any failure (quota, network, schema) falls back to MockProvider —
 *   the chat keeps working, parsing just gets dumber
 */

const MODEL_ID = 'google/gemini-2.5-flash';

const TASK_FIELDS = ['category', 'area_sqm', 'budget_ils', 'timeline', 'city', 'work_details'] as const;

const SYSTEM_PROMPT = `You are TUKI, a friendly assistant that helps homeowners in Israel describe repair/construction jobs.

The user may write in Hebrew, Russian or English (sometimes mixed). Detect the dominant language and ALWAYS write summaries, titles, details and questions in that language.

Your goal: turn the user's messages into a structured task specification for professional contractors.

category MUST be one of: ${CATEGORY_IDS.join(', ')}

Rules:
- Budget is in ILS (₪). A range like "800-1200" → min 800, max 1200. "עד 1000" / "до 1000" → min null, max 1000.
- Split complex requests into separate subtasks (e.g. painting + faucet repair = 2 subtasks).
- city: full Israeli city name (e.g. "תל אביב", "חיפה", "באר שבע").
- Ask AT MOST 2 clarifying questions per reply, only for the most important missing fields. Priority: city > budget_ils > timeline > area_sqm.
- If the draft already has a field filled, do not ask about it again; keep previous values unless the user corrects them.
- When the essentials are known (at least category + city + budget), return an empty clarifyingQuestions array.
- Be concise and warm. Never use professional jargon the homeowner wouldn't know.`;

const draftSchema = z.object({
  language: z.enum(['he', 'ru', 'en']),
  subtasks: z
    .array(
      z.object({
        category: z.enum([...CATEGORY_IDS] as [string, ...string[]]),
        title: z.string(),
        details: z.string().nullable().optional(),
      })
    )
    .max(5),
  area_sqm: z.number().nullable(),
  budget_ils: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
  }),
  timeline: z.string().nullable(),
  city: z.string().nullable(),
  work_details: z.string().nullable(),
  clarifying_questions: z
    .array(
      z.object({
        field: z.enum(TASK_FIELDS),
        question: z.string(),
      })
    )
    .max(2),
  summary: z.string(),
});

type RawDraft = z.infer<typeof draftSchema>;

function normalizeDraft(raw: RawDraft, fallback: Partial<TaskDraft> | null, locale: Language): TaskDraft {
  const language: Language = raw.language ?? locale;
  const num = (v: number | null | undefined) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;

  const subtasks = raw.subtasks
    .filter((s) => s && typeof s.title === 'string' && CATEGORY_IDS.includes(s.category as CategoryId))
    .slice(0, 5)
    .map((s) => ({
      category: s.category as CategoryId,
      title: String(s.title).slice(0, 120),
      details: s.details ? String(s.details).slice(0, 500) : undefined,
    }));

  return {
    language,
    subtasks: subtasks.length > 0 ? subtasks : (fallback?.subtasks ?? []),
    area_sqm: num(raw.area_sqm) ?? fallback?.area_sqm ?? null,
    budget_ils: {
      min: num(raw.budget_ils?.min) ?? fallback?.budget_ils?.min ?? null,
      max: num(raw.budget_ils?.max) ?? fallback?.budget_ils?.max ?? null,
    },
    timeline: (raw.timeline && String(raw.timeline)) || fallback?.timeline || null,
    city: (raw.city && String(raw.city)) || fallback?.city || null,
    cityId: fallback?.cityId ?? null, // resolved server-side from `city` by city matcher
    work_details: (raw.work_details && String(raw.work_details)) || fallback?.work_details || null,
  };
}

export class GeminiProvider implements AIProvider {
  private fallback = new MockProvider();

  // apiKey kept for interface compatibility; auth is handled by the AI Gateway
  constructor(_apiKey?: string) {}

  async parse(input: ParseInput): Promise<ParseResult> {
    try {
      const userContent = [
        input.draft ? `Current draft state: ${JSON.stringify(input.draft)}` : null,
        input.history.length > 0
          ? `Conversation so far:\n${input.history
              .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
              .join('\n')}`
          : null,
        `New user message: ${scrubPII(input.message)}`,
        `The user's UI locale is "${input.locale}". If unsure of the language, default to it.`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const { object } = await generateObject({
        model: MODEL_ID,
        schema: draftSchema,
        system: SYSTEM_PROMPT,
        prompt: userContent,
        temperature: 0.2,
      });

      const draft = normalizeDraft(object, input.draft, input.locale);
      const clarifyingQuestions = (object.clarifying_questions ?? [])
        .filter((q) => q && typeof q.question === 'string' && TASK_FIELDS.includes(q.field))
        .slice(0, 2)
        .map((q) => ({ field: q.field, question: String(q.question).slice(0, 200) }));

      return {
        draft,
        clarifyingQuestions,
        summary: typeof object.summary === 'string' ? object.summary : '',
      };
    } catch (error) {
      console.error('[GeminiProvider] falling back to MockProvider:', (error as Error).message);
      return this.fallback.parse(input);
    }
  }
}
