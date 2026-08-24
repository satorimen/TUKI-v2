import { matchCityId } from '@/lib/geo/city-match';
import { categoryName, type CategoryId } from '@/lib/tasks/categories';
import type {
  AIProvider,
  ParseInput,
  ParseResult,
  TaskDraft,
  ClarifyingQuestion,
  Language,
} from './types';

/**
 * Rule-based deterministic provider.
 *
 * Two roles:
 * 1. Development/demo mode when GEMINI_API_KEY is not set.
 * 2. Fallback when Gemini fails or quota is exhausted (graceful degradation —
 *    the product keeps working, with slightly dumber parsing).
 *
 * Understands keyword sets in Hebrew, Russian and English + numbers with units.
 */

interface CategoryKeywords {
  id: CategoryId;
  keywords: string[]; // lowercase; Cyrillic/Hebrew work as-is
}

// Minimal but practical keyword coverage for the fallback path
const CATEGORY_KEYWORDS: CategoryKeywords[] = [
  { id: 'painting', keywords: ['צבע', 'לצבוע', 'צביעה', 'פפיר טפט', 'טפט', 'покрас', 'краск', 'обои', 'поклеить', 'paint', 'wallpaper'] },
  { id: 'plastering', keywords: ['טיח', 'טייח', 'שפכטל', 'יישור קירות', 'штукатур', 'шпакл', 'выровнять стен', 'plaster', 'putty', 'level the wall'] },
  { id: 'plumbing', keywords: ['אינסטלט', 'אינסטלצ', 'ברז', 'נזילה', 'צינור', 'שירותים', 'מקלחת', 'כיור', 'сантехник', 'кран', 'смесител', 'труба', 'течёт', 'течет', 'капает', 'унитаз', 'ванная', 'раковин', 'plumb', 'faucet', 'tap ', 'leak', 'toilet', 'shower', 'sink', 'pipe'] },
  { id: 'electrical', keywords: ['חשמל', 'שקע', 'מפסק', 'תלת', 'люстр', 'электрик', 'розетк', 'выключател', 'проводк', 'лампочк', 'электр', 'electric', 'outlet', 'socket', 'switch', 'wiring', 'light fix'] },
  { id: 'tiling', keywords: ['אריח', 'ריצוף', 'קרמיקה', 'плиточн', 'плитк', 'укладк', 'кафель', 'керамогран', 'tile', 'flooring'] },
  { id: 'drywall', keywords: ['גבס', 'гипсокартон', 'гкл', 'drywall', 'plasterboard'] },
  { id: 'carpentry', keywords: ['נגר', 'ארון', 'מטבח מטבחים', 'ארונות', 'столяр', 'шкаф', 'кухонный гарнитур', 'мебель', 'carpenter', 'furniture', 'cabinet'] },
  { id: 'full_renovation', keywords: ['שיפוץ', 'ремонт квартир', 'капитальный ремонт', 'ремонт под ключ', 'בניית בית', 'renovat', 'remodel', 'full renovation'] },
  { id: 'appliance_repair', keywords: ['מקרר', 'מכונת כביסה', 'מדיח', 'תנור', 'холодильник', 'стиральн', 'посудомоечн', 'духовк', 'fridge', 'washing machine', 'dishwasher', 'oven repair'] },
  { id: 'hvac', keywords: ['מזגן', 'אוורור', 'вентиляц', 'кондиционер', 'air condition', 'hvac'] },
  { id: 'windows_doors', keywords: ['חלון', 'דלת', 'תריס', 'окн', 'двер', 'жалюзи', 'window', 'door', 'blind'] },
  { id: 'roofing', keywords: ['גג', 'איטום', 'крыш', 'кровл', 'roof', 'waterproof'] },
  { id: 'pest_control', keywords: ['הדברה', 'נמלים', 'תיקנים', 'насеком', 'таракан', 'муравь', 'pest', 'ants', 'cockroach'] },
  { id: 'post_renovation_cleaning', keywords: ['ניקיון', 'לנקות', 'уборк', 'clean after', 'post-renovation clean'] },
  { id: 'gardening', keywords: ['גינה', 'דשא', 'גינון', 'сад', 'газон', 'garden', 'lawn'] },
];

const UNIT_AREA_RE = /(\d+(?:[.,]\d+)?)\s*(?:מ״ר|מ"ר|מר|м²|м2|кв\.?\s*м|кв|sqm|m2|square|м²)/i;
const BUDGET_RE = /(\d{2,6})\s*(?:₪|ש״ח|שקל|шекел|шек|ils|shekel)/gi;
const BUDGET_REVERSE_RE = /(?:₪|ש״ח|שקל|ils)\s*(\d{2,6})/gi;
const BUDGET_RANGE_RE = /(\d{2,6})\s*[-–—]\s*(\d{2,6})\s*(?:₪|ש״ח|שקל|шекел|ils)?/i;
/** "бюджет до 3000" / "תקציב עד 1500" / "budget up to 1500" — number after the budget word */
const BUDGET_WORD_RE = /(?:бюджет|תקציב|budget)\D{0,20}?(\d{3,6})/i;

/** Common timeline phrases in the 3 languages (longest first) */
const TIMELINE_PHRASES = [
  'на следующей неделе', 'на этой неделе', 'в следующем месяце', 'как можно скорее', 'срочно', 'завтра', 'сегодня', 'на выходных',
  'בשבוע הבא', 'בחודש הבא', 'בהקדם האפשרי', 'בדחיפות', 'מחר', 'היום', 'בסוף השבוע',
  'next week', 'this week', 'next month', 'as soon as possible', 'asap', 'urgent', 'tomorrow', 'today', 'this weekend',
].sort((a, b) => b.length - a.length);

const QUESTIONS_BY_FIELD: Record<Language, Record<string, string>> = {
  he: {
    city: 'באיזו עיר נמצא הדירה?',
    budget_ils: 'מה התקציב המשוער? (בשקלים)',
    timeline: 'מתי תרצו להתחיל?',
    work_details: 'תוכלו לתאר בקצרה מה בדיוק צריך לעשות?',
  },
  ru: {
    city: 'В каком городе находится квартира?',
    budget_ils: 'Какой примерный бюджет? (в шекелях)',
    timeline: 'Когда хотите начать?',
    work_details: 'Опишите коротко, что именно нужно сделать?',
  },
  en: {
    city: 'Which city is the apartment in?',
    budget_ils: 'What is your approximate budget? (in ILS)',
    timeline: 'When would you like to start?',
    work_details: 'Can you briefly describe what exactly needs to be done?',
  },
};

const SUMMARY_TEMPLATES: Record<Language, (n: number) => string> = {
  he: (n) => `הבנתי: ${n === 1 ? 'עבודה אחת' : `${n} עבודות`}.`,
  ru: (n) => `Понял: ${n === 1 ? 'одна работа' : `${n} вида работ`}.`,
  en: (n) => `Got it: ${n === 1 ? 'one job' : `${n} jobs`}.`,
};

/** All categories whose keywords hit the text, best match first */
function detectCategories(text: string): CategoryId[] {
  const lower = text.toLowerCase();
  const hits: { id: CategoryId; n: number }[] = [];
  for (const { id, keywords } of CATEGORY_KEYWORDS) {
    const n = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (n > 0) hits.push({ id, n });
  }
  return hits.sort((a, b) => b.n - a.n).slice(0, 3).map((h) => h.id);
}

export class MockProvider implements AIProvider {
  async parse(input: ParseInput): Promise<ParseResult> {
    const language = input.draft?.language ?? input.locale;
    const combined = [...input.history.map((m) => m.text), input.message].join('\n');

    // Merge accumulated draft with newly extracted facts
    const draft: TaskDraft = {
      language,
      subtasks: input.draft?.subtasks ?? [],
      area_sqm: input.draft?.area_sqm ?? null,
      budget_ils: input.draft?.budget_ils ?? { min: null, max: null },
      timeline: input.draft?.timeline ?? null,
      city: input.draft?.city ?? null,
      cityId: input.draft?.cityId ?? null,
      work_details: input.draft?.work_details ?? null,
    };

    // Categories → subtasks (complex requests split into several jobs)
    const categories = detectCategories(combined);
    if (categories.length > 0) {
      draft.subtasks = categories.map((category) => ({
        category,
        title: categoryName(category, language),
        details: categories.length > 1 ? undefined : input.message.slice(0, 300),
      }));
    }

    // Area
    if (draft.area_sqm == null) {
      const m = combined.match(UNIT_AREA_RE);
      if (m) draft.area_sqm = parseFloat(m[1].replace(',', '.'));
    }

    // Budget (range → min/max; single value → max)
    if (draft.budget_ils.max == null) {
      const range = combined.match(BUDGET_RANGE_RE);
      const single = [...combined.matchAll(BUDGET_RE)].map((m) => parseInt(m[1], 10));
      const reversed = [...combined.matchAll(BUDGET_REVERSE_RE)].map((m) => parseInt(m[1], 10));
      const byWord = combined.match(BUDGET_WORD_RE);

      if (range && /^\d+\s*[-–—]/.test(range[0])) {
        draft.budget_ils = { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
      } else if (single.length > 0 || reversed.length > 0) {
        draft.budget_ils = { min: null, max: Math.max(...single, ...reversed) };
      } else if (byWord) {
        draft.budget_ils = { min: null, max: parseInt(byWord[1], 10) };
      }
    }

    // City (fuzzy: hebrew prefixes, russian inflections, latin variants)
    if (!draft.cityId) {
      const cityId = matchCityId(combined);
      if (cityId) {
        draft.cityId = cityId;
        draft.city = cityId;
      }
    }

    // Timeline: detect common phrases in any of the 3 languages
    if (draft.timeline == null) {
      const lower = combined.toLowerCase();
      const phrase = TIMELINE_PHRASES.find((p) => lower.includes(p.toLowerCase()));
      if (phrase) draft.timeline = phrase;
    }

    // Work details = latest user message
    draft.work_details = input.message.slice(0, 500);

    // Clarifying questions for the most important missing fields (max 2)
    const questions: ClarifyingQuestion[] = [];
    const ask = (field: string) => {
      const q = QUESTIONS_BY_FIELD[language][field];
      if (q && questions.length < 2) questions.push({ field: field as any, question: q });
    };
    if (draft.subtasks.length === 0) ask('work_details');
    if (!draft.cityId) ask('city');
    if (draft.budget_ils.max == null) ask('budget_ils');
    if (questions.length < 2 && draft.timeline == null) ask('timeline');

    return {
      draft,
      clarifyingQuestions: questions,
      summary: SUMMARY_TEMPLATES[language](draft.subtasks.length || 1),
    };
  }
}
