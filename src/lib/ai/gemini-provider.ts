import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORY_IDS, type CategoryId } from '@/lib/tasks/categories';
import { scrubPII } from './sanitize';
import { MockProvider } from './mock-provider';
import type { AIProvider, ParseInput, ParseResult, TaskDraft, Language } from './types';

/**
 * Gemini-backed provider.
 *
 * - Detects the user's language (he/ru/en) and always replies in it
 * - Returns STRICT JSON validated against our schema
 * - PII is scrubbed before anything leaves the server
 * - On any failure (quota, network, bad JSON) falls back to MockProvider —
 *   the chat keeps working, parsing just gets dumber
 */

const SYSTEM_PROMPT = `You are TUKI, a friendly assistant that helps homeowners in Israel describe repair/construction jobs.

The user may write in Hebrew, Russian or English (sometimes mixed). Detect the dominant language and ALWAYS write summaries, titles, details and questions in that language.

Your goal: turn the user's messages into a structured task specification for professional contractors.

Output STRICT JSON only (no markdown fences), matching exactly:
{
  "language": "he" | "ru" | "en",
  "subtasks": [{"category": "<category_id>", "title": "<short title in user's language>", "details": "<optional details in user's language>"}],
  "area_sqm": number | null,
  "budget_ils": {"min": number | null, "max": number | null},
  "timeline": "<normalized timeline in user's language>" | null,
  "city": "<Israeli city name as written by user>" | null,
  "work_details": "<compact free-form description of the job in user's language>",
  "clarifying_questions": [{"field": "<field_id>", "question": "<one short friendly question in user's language>"}],
  "summary": "<one sentence: what you understood, in user's language>"
}

category_id MUST be one of: ${CATEGORY_IDS.join(', ')}

field_id MUST be one of: category, area_sqm, budget_ils, timeline, city, work_details

Rules:
- Budget is in ILS (₪). A range like "800-1200" → min 800, max 1200. "עד 1000" / "до 1000" → min null, max 1000.
- Split complex requests into separate subtasks (e.g. painting + faucet repair = 2 subtasks).
- city: full Israeli city name (e.g. "תל אביב", "חיפה", "באר שבע").
- Ask AT MOST 2 clarifying questions per reply, only for the most important missing fields. Priority: city > budget_ils > timeline > area_sqm.
- If the draft already has a field filled, do not ask about it again; keep previous values unless the user corrects them.
- When the essentials are known (at least category + city + budget), return an empty clarifying_questions array.
- Be concise and warm. Never use professional jargon the homeowner wouldn't know.`;

function validateDraft(raw: any, fallback: Partial<TaskDraft> | null, locale: Language): TaskDraft {
  const language: Language =
    raw?.language === 'he' || raw?.language === 'ru' || raw?.language === 'en'
      ? raw.language
      : locale;

  const subtasks = Array.isArray(raw?.subtasks)
    ? raw.subtasks
        .filter(
          (s: any) =>
            s && typeof s.title === 'string' && CATEGORY_IDS.includes(s.category as CategoryId)
        )
        .slice(0, 5)
        .map((s: any) => ({
          category: s.category as CategoryId,
          title: String(s.title).slice(0, 120),
          details: s.details ? String(s.details).slice(0, 500) : undefined,
        }))
    : [];

  const budgetRaw = raw?.budget_ils ?? {};
  const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

  return {
    language,
    subtasks: subtasks.length > 0 ? subtasks : (fallback?.subtasks ?? []),
    area_sqm: num(raw?.area_sqm) ?? fallback?.area_sqm ?? null,
    budget_ils: {
      min: num(budgetRaw.min) ?? fallback?.budget_ils?.min ?? null,
      max: num(budgetRaw.max) ?? fallback?.budget_ils?.max ?? null,
    },
    timeline:
      (typeof raw?.timeline === 'string' && raw.timeline) || fallback?.timeline || null,
    city: (typeof raw?.city === 'string' && raw.city) || fallback?.city || null,
    cityId: fallback?.cityId ?? null, // resolved server-side from `city` by city matcher
    work_details:
      (typeof raw?.work_details === 'string' && raw.work_details) ||
      fallback?.work_details ||
      null,
  };
}

function extractJson(text: string): any | null {
  // Strip markdown fences if the model added them despite instructions
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // try to find a JSON object inside the text
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export class GeminiProvider implements AIProvider {
  private model: any;
  private fallback = new MockProvider();

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    });
  }

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
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await this.model.generateContent([SYSTEM_PROMPT, userContent].join('\n\n'));
      const text = result.response.text();
      const json = extractJson(text);
      if (!json) throw new Error('Gemini returned non-JSON response');

      const draft = validateDraft(json, input.draft, input.locale);
      const questions = Array.isArray(json.clarifying_questions)
        ? json.clarifying_questions
            .filter(
              (q: any) =>
                q &&
                typeof q.question === 'string' &&
                ['category', 'area_sqm', 'budget_ils', 'timeline', 'city', 'work_details'].includes(
                  q.field
                )
            )
            .slice(0, 2)
            .map((q: any) => ({ field: q.field as any, question: String(q.question).slice(0, 200) }))
        : [];

      return {
        draft,
        clarifyingQuestions: questions,
        summary: typeof json.summary === 'string' ? json.summary : '',
      };
    } catch (error) {
      console.error('[GeminiProvider] falling back to MockProvider:', (error as Error).message);
      return this.fallback.parse(input);
    }
  }
}
