import type { CategoryId } from '@/lib/tasks/categories';
import type { DbRepository } from './repository';
import type {
  Profile,
  MasterProfile,
  Task,
  Bid,
  Review,
  Subtask,
} from './types';

/**
 * Supabase-backed repository (production).
 *
 * Activated automatically when NEXT_PUBLIC_SUPABASE_URL + ANON_KEY are set
 * AND a server Supabase client is available. Uses the service-role client
 * on the server (API routes) — RLS policies from 001_initial_schema.sql
 * protect direct client access.
 *
 * Field mapping: domain camelCase ↔ SQL snake_case.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function serverClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the service role key on the server; fall back to anon
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── mappers ──────────────────────────────────────────────────
type Row = Record<string, any>;

function mapProfile(row: Row): Profile {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    locale: row.locale,
    createdAt: row.created_at,
  };
}

function mapMaster(row: Row): MasterProfile {
  return {
    id: row.id,
    userId: row.user_id,
    specializations: (row.specializations ?? []) as CategoryId[],
    workCities: row.work_cities ?? [],
    experienceYears: row.experience_years,
    bio: row.bio,
    portfolioUrls: row.portfolio_urls ?? [],
    isActive: row.is_active,
    rating: Number(row.rating ?? 0),
    reviewsCount: row.reviews_count ?? 0,
    completedTasks: row.completed_tasks ?? 0,
    createdAt: row.created_at,
  };
}

function mapTask(row: Row): Task {
  return {
    id: row.id,
    clientId: row.client_id,
    status: row.status,
    language: row.language,
    subtasks: (row.subtasks ?? []) as Subtask[],
    categories: (row.categories ?? []) as CategoryId[],
    areaSqm: row.area_sqm != null ? Number(row.area_sqm) : null,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    timeline: row.timeline,
    cityId: row.city_id,
    workDetails: row.work_details,
    rawInput: row.raw_input,
    photoUrls: row.photo_urls ?? [],
    selectedBidId: row.selected_bid_id,
    publishedAt: row.published_at,
    assignedAt: row.assigned_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function mapBid(row: Row): Bid {
  return {
    id: row.id,
    taskId: row.task_id,
    masterId: row.master_id,
    price: row.price,
    timeline: row.timeline,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapReview(row: Row): Review {
  return {
    id: row.id,
    taskId: row.task_id,
    masterId: row.master_id,
    clientId: row.client_id,
    scoreQuality: row.score_quality,
    scoreBudget: row.score_budget,
    scorePunctuality: row.score_punctuality,
    scoreCleanliness: row.score_cleanliness,
    scoreCommunication: row.score_communication,
    text: row.text,
    masterResponse: row.master_response,
    createdAt: row.created_at,
  };
}

export class SupabaseDb implements DbRepository {
  private db: SupabaseClient;

  constructor(client?: SupabaseClient) {
    const c = client ?? serverClient();
    if (!c) throw new Error('Supabase env vars are not configured');
    this.db = c;
  }

  // ── profiles ─────────────────────────────────────────────
  async getProfile(id: string) {
    const { data } = await this.db.from('profiles').select('*').eq('id', id).maybeSingle();
    return data ? mapProfile(data) : null;
  }

  async getProfileByEmail(email: string) {
    const { data } = await this.db
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    return data ? mapProfile(data) : null;
  }

  async createProfile(input: {
    email: string;
    fullName?: string;
    locale?: string;
    role?: 'client' | 'master';
  }): Promise<Profile> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.getProfileByEmail(email);
    if (existing) return existing;
    const { data, error } = await this.db
      .from('profiles')
      .insert({
        // with service role we create profiles not bound to auth.users:
        // auth integration arrives with real Supabase Auth (M3.5)
        id: crypto.randomUUID(),
        email,
        full_name: input.fullName ?? '',
        locale: input.locale ?? 'he',
        role: input.role ?? 'client',
      })
      .select()
      .single();
    if (error) throw error;
    return mapProfile(data);
  }

  async updateProfile(id: string, patch: Partial<Profile>) {
    const row: Row = {};
    if (patch.fullName !== undefined) row.full_name = patch.fullName;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.whatsappNumber !== undefined) row.whatsapp_number = patch.whatsappNumber;
    if (patch.locale !== undefined) row.locale = patch.locale;
    if (patch.role !== undefined) row.role = patch.role;
    const { data, error } = await this.db
      .from('profiles')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapProfile(data);
  }

  // ── masters ──────────────────────────────────────────────
  async getMasterByUserId(userId: string) {
    const { data } = await this.db
      .from('masters')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data ? mapMaster(data) : null;
  }

  async getMaster(id: string) {
    const { data } = await this.db.from('masters').select('*').eq('id', id).maybeSingle();
    return data ? mapMaster(data) : null;
  }

  async createMaster(
    userId: string,
    input: { specializations: string[]; workCities: string[]; experienceYears?: number; bio?: string }
  ): Promise<MasterProfile> {
    const existing = await this.getMasterByUserId(userId);
    if (existing) {
      return this.updateMaster(existing.id, {
        specializations: input.specializations as CategoryId[],
        workCities: input.workCities,
        experienceYears: input.experienceYears ?? null,
        bio: input.bio ?? null,
      });
    }
    const { data, error } = await this.db
      .from('masters')
      .insert({
        user_id: userId,
        specializations: input.specializations,
        work_cities: input.workCities,
        experience_years: input.experienceYears ?? null,
        bio: input.bio ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapMaster(data);
  }

  async updateMaster(id: string, patch: Partial<MasterProfile>) {
    const row: Row = {};
    if (patch.specializations !== undefined) row.specializations = patch.specializations;
    if (patch.workCities !== undefined) row.work_cities = patch.workCities;
    if (patch.experienceYears !== undefined) row.experience_years = patch.experienceYears;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.isActive !== undefined) row.is_active = patch.isActive;
    const { data, error } = await this.db
      .from('masters')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapMaster(data);
  }

  async findMasters(filter: { cityIds?: string[]; categories?: string[] }) {
    let query = this.db.from('masters').select('*').eq('is_active', true);
    if (filter.categories?.length) {
      query = query.overlaps('specializations', filter.categories);
    }
    // city overlap is filtered in SQL via contains on one city or in app:
    const { data, error } = await query.order('rating', { ascending: false });
    if (error) throw error;
    let masters = (data ?? []).map(mapMaster);
    if (filter.cityIds?.length) {
      masters = masters.filter((m) => m.workCities.some((c) => filter.cityIds!.includes(c)));
    }
    return masters;
  }

  // ── tasks ────────────────────────────────────────────────
  async createTask(input: any): Promise<Task> {
    const { data, error } = await this.db
      .from('tasks')
      .insert({
        client_id: input.clientId,
        status: input.status,
        language: input.language,
        subtasks: input.subtasks,
        categories: input.categories,
        area_sqm: input.areaSqm,
        budget_min: input.budgetMin,
        budget_max: input.budgetMax,
        timeline: input.timeline,
        city_id: input.cityId,
        work_details: input.workDetails,
        raw_input: input.rawInput,
        photo_urls: input.photoUrls ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return mapTask(data);
  }

  async getTask(id: string) {
    const { data } = await this.db.from('tasks').select('*').eq('id', id).maybeSingle();
    return data ? mapTask(data) : null;
  }

  async listTasksByClient(clientId: string) {
    const { data } = await this.db
      .from('tasks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(mapTask);
  }

  async listPublishedTasks(filter?: { cityIds?: string[]; categories?: string[] }) {
    let query = this.db
      .from('tasks')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (filter?.cityIds?.length) {
      query = query.in('city_id', filter.cityIds);
    }
    const { data, error } = await query;
    if (error) throw error;
    let tasks = (data ?? []).map(mapTask);
    if (filter?.categories?.length) {
      tasks = tasks.filter((t) => t.categories.some((c) => filter.categories!.includes(c)));
    }
    return tasks;
  }

  async updateTaskStatus(id: string, status: Task['status']) {
    const patch: Row = { status };
    if (status === 'assigned') patch.assigned_at = new Date().toISOString();
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    const { data, error } = await this.db
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? mapTask(data) : null;
  }

  async setTaskSelectedBid(taskId: string, bidId: string) {
    const { data, error } = await this.db
      .from('tasks')
      .update({ selected_bid_id: bidId })
      .eq('id', taskId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? mapTask(data) : null;
  }

  // ── bids ─────────────────────────────────────────────────
  async createBid(input: any): Promise<Bid> {
    const { data, error } = await this.db
      .from('bids')
      .insert({
        task_id: input.taskId,
        master_id: input.masterId,
        price: input.price,
        timeline: input.timeline,
        message: input.message,
      })
      .select()
      .single();
    if (error) throw error;
    return mapBid(data);
  }

  async listBidsByTask(taskId: string) {
    const { data } = await this.db
      .from('bids')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(mapBid);
  }

  async listBidsByMaster(masterId: string) {
    const { data } = await this.db
      .from('bids')
      .select('*')
      .eq('master_id', masterId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(mapBid);
  }

  async updateBidStatus(id: string, status: Bid['status']) {
    const { data, error } = await this.db
      .from('bids')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? mapBid(data) : null;
  }

  // ── reviews ──────────────────────────────────────────────
  async createReview(input: any): Promise<Review> {
    const { data, error } = await this.db
      .from('reviews')
      .insert({
        task_id: input.taskId,
        master_id: input.masterId,
        client_id: input.clientId,
        score_quality: input.scoreQuality,
        score_budget: input.scoreBudget,
        score_punctuality: input.scorePunctuality,
        score_cleanliness: input.scoreCleanliness,
        score_communication: input.scoreCommunication,
        text: input.text,
      })
      .select()
      .single();
    if (error) throw error;
    return mapReview(data);
  }

  async listReviewsByMaster(masterId: string) {
    const { data } = await this.db
      .from('reviews')
      .select('*')
      .eq('master_id', masterId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(mapReview);
  }
}
