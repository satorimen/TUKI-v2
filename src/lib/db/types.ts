import type { CategoryId } from '@/lib/tasks/categories';
import type { TaskDraft } from '@/lib/ai/types';

/**
 * Domain types shared by the memory repository and the Supabase repository.
 * Field names intentionally mirror the SQL schema (001_initial_schema.sql)
 * so the Supabase implementation is a thin mapper.
 */

export type UserRole = 'client' | 'master' | 'admin';
export type Language = 'he' | 'ru' | 'en';

export interface Profile {
  id: string;
  role: UserRole;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  /** wa.me format: 9725XXXXXXXX */
  whatsappNumber: string | null;
  locale: Language;
  createdAt: string;
}

export interface MasterProfile {
  id: string;
  userId: string;
  specializations: CategoryId[];
  /** city ids from src/lib/geo/cities.ts */
  workCities: string[];
  experienceYears: number | null;
  bio: string | null;
  portfolioUrls: string[];
  isActive: boolean;
  rating: number;
  reviewsCount: number;
  completedTasks: number;
  createdAt: string;
}

export type TaskStatus =
  | 'draft'
  | 'published'
  | 'assigned'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface Subtask {
  category: CategoryId;
  title: string;
  details?: string;
}

export interface Task {
  id: string;
  clientId: string;
  status: TaskStatus;
  language: Language;
  subtasks: Subtask[];
  /** denormalized categories for matching */
  categories: CategoryId[];
  areaSqm: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string | null;
  cityId: string;
  workDetails: string | null;
  rawInput: string | null;
  photoUrls: string[];
  selectedBidId: string | null;
  publishedAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export type BidStatus = 'pending' | 'selected' | 'rejected' | 'withdrawn';

export interface Bid {
  id: string;
  taskId: string;
  masterId: string;
  price: number | null;
  timeline: string | null;
  message: string | null;
  status: BidStatus;
  createdAt: string;
}

export interface Review {
  id: string;
  taskId: string;
  masterId: string;
  clientId: string;
  scoreQuality: number;
  scoreBudget: number;
  scorePunctuality: number;
  scoreCleanliness: number;
  scoreCommunication: number;
  text: string | null;
  masterResponse: string | null;
  createdAt: string;
}

/** Task + draft interop: build a Task payload from the AI draft */
export function taskFromDraft(
  clientId: string,
  draft: TaskDraft,
  cityId: string,
  rawInput: string
): Omit<Task, 'id' | 'createdAt' | 'selectedBidId' | 'publishedAt' | 'assignedAt' | 'completedAt'> {
  return {
    clientId,
    status: 'published',
    language: draft.language,
    subtasks: draft.subtasks,
    categories: [...new Set(draft.subtasks.map((s) => s.category))],
    areaSqm: draft.area_sqm,
    budgetMin: draft.budget_ils.min,
    budgetMax: draft.budget_ils.max,
    timeline: draft.timeline,
    cityId,
    workDetails: draft.work_details,
    rawInput,
    photoUrls: [],
  };
}
