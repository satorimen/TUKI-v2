import type { CategoryId } from '@/lib/tasks/categories';

/** Fields the assistant may need to clarify with the user */
export type TaskField =
  | 'category'
  | 'area_sqm'
  | 'budget_ils'
  | 'timeline'
  | 'city'
  | 'work_details';

/** Supported UI languages (matches i18n routing) */
export type Language = 'he' | 'ru' | 'en';

/** One atomic job inside a request (a complex request splits into several) */
export interface ParsedSubtask {
  category: CategoryId;
  /** Short human title in the USER'S language, e.g. «צביעת חדר שינה» */
  title: string;
  /** Free-form details in the user's language */
  details?: string;
}

/** Structured task specification produced by the AI from free-form text */
export interface TaskDraft {
  language: Language;
  subtasks: ParsedSubtask[];
  area_sqm: number | null;
  /** Budget in ILS */
  budget_ils: { min: number | null; max: number | null };
  /** Normalized timeline note in the user's language, e.g. «בשבוע הבא» */
  timeline: string | null;
  /** City as written/normalized by AI (Hebrew or Latin spelling) */
  city: string | null;
  /** Matched canonical city id from src/lib/geo/cities.ts */
  cityId: string | null;
  work_details: string | null;
}

/** A clarifying question tied to a missing field */
export interface ClarifyingQuestion {
  field: TaskField;
  /** Question text in the user's language */
  question: string;
}

/** Result of one AI parse round */
export interface ParseResult {
  /** Updated draft state (server trusts client's accumulated draft + new message) */
  draft: TaskDraft;
  /** Questions to ask the user; empty array = draft is complete enough */
  clarifyingQuestions: ClarifyingQuestion[];
  /** Short friendly summary of what was understood, in the user's language */
  summary: string;
}

/** One message of the conversation with the assistant */
export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** Input for a parse round */
export interface ParseInput {
  /** New user message */
  message: string;
  /** Conversation so far (excluding the new message) */
  history: ChatMessage[];
  /** Current accumulated draft, if any */
  draft: Partial<TaskDraft> | null;
  /** Preferred UI locale — used by the mock provider and as a language hint */
  locale: Language;
}

/** Provider-agnostic AI contract. Implementations: Gemini, Mock */
export interface AIProvider {
  parse(input: ParseInput): Promise<ParseResult>;
}
