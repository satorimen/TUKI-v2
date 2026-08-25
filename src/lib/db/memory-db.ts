import { randomUUID } from 'crypto';
import type { CategoryId } from '@/lib/tasks/categories';
import type {
  Profile,
  MasterProfile,
  Task,
  Bid,
  Review,
} from './types';
import type { DbRepository } from './repository';

/**
 * In-memory repository — dev/demo mode when Supabase env vars are absent.
 *
 * Survives Next.js dev HMR via globalThis; resets on server restart,
 * which is fine for development (tasks are re-created in seconds via the chat).
 */

interface MemoryState {
  profiles: Map<string, Profile>;
  masters: Map<string, MasterProfile>;
  tasks: Map<string, Task>;
  bids: Map<string, Bid>;
  reviews: Map<string, Review>;
}

const g = globalThis as unknown as { __tukiMemoryDb?: MemoryState };

function state(): MemoryState {
  if (!g.__tukiMemoryDb) {
    g.__tukiMemoryDb = {
      profiles: new Map(),
      masters: new Map(),
      tasks: new Map(),
      bids: new Map(),
      reviews: new Map(),
    };
  }
  return g.__tukiMemoryDb;
}

const normalizeEmail = (email: string) => email.toLowerCase().trim();

export class MemoryDb implements DbRepository {
  // ── profiles ─────────────────────────────────────────────
  async getProfile(id: string) {
    return state().profiles.get(id) ?? null;
  }

  async getProfileByEmail(email: string) {
    const target = normalizeEmail(email);
    for (const p of state().profiles.values()) {
      if (p.email && normalizeEmail(p.email) === target) return p;
    }
    return null;
  }

  async createProfile(input: {
    email: string;
    fullName?: string;
    locale?: string;
    role?: 'client' | 'master';
  }): Promise<Profile> {
    // idempotent by email
    const existing = await this.getProfileByEmail(input.email);
    if (existing) return existing;

    const profile: Profile = {
      id: randomUUID(),
      role: input.role ?? 'client',
      fullName: input.fullName ?? null,
      email: normalizeEmail(input.email),
      phone: null,
      whatsappNumber: null,
      locale: (input.locale as Profile['locale']) ?? 'he',
      createdAt: new Date().toISOString(),
    };
    state().profiles.set(profile.id, profile);
    return profile;
  }

  async updateProfile(id: string, patch: Partial<Profile>) {
    const profile = state().profiles.get(id);
    if (!profile) throw new Error('profile not found');
    Object.assign(profile, patch);
    return profile;
  }

  // ── masters ──────────────────────────────────────────────
  async getMasterByUserId(userId: string) {
    for (const m of state().masters.values()) {
      if (m.userId === userId) return m;
    }
    return null;
  }

  async getMaster(id: string) {
    return state().masters.get(id) ?? null;
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
    const master: MasterProfile = {
      id: randomUUID(),
      userId,
      specializations: input.specializations as CategoryId[],
      workCities: input.workCities,
      experienceYears: input.experienceYears ?? null,
      bio: input.bio ?? null,
      portfolioUrls: [],
      isActive: true,
      rating: 0,
      reviewsCount: 0,
      completedTasks: 0,
      createdAt: new Date().toISOString(),
    };
    state().masters.set(master.id, master);
    return master;
  }

  async updateMaster(id: string, patch: Partial<MasterProfile>) {
    const master = state().masters.get(id);
    if (!master) throw new Error('master not found');
    Object.assign(master, patch);
    return master;
  }

  async findMasters(filter: { cityIds?: string[]; categories?: string[] }) {
    const result: MasterProfile[] = [];
    for (const m of state().masters.values()) {
      if (!m.isActive) continue;
      if (filter.cityIds && filter.cityIds.length > 0) {
        if (!m.workCities.some((c) => filter.cityIds!.includes(c))) continue;
      }
      if (filter.categories && filter.categories.length > 0) {
        if (!m.specializations.some((s) => filter.categories!.includes(s))) continue;
      }
      result.push(m);
    }
    return result.sort((a, b) => b.rating - a.rating);
  }

  // ── tasks ────────────────────────────────────────────────
  async createTask(input: any): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      ...input,
      id: randomUUID(),
      selectedBidId: null,
      publishedAt: now,
      assignedAt: null,
      completedAt: null,
      createdAt: now,
    };
    state().tasks.set(task.id, task);
    return task;
  }

  async getTask(id: string) {
    return state().tasks.get(id) ?? null;
  }

  async listTasksByClient(clientId: string) {
    return [...state().tasks.values()]
      .filter((t) => t.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listPublishedTasks(filter?: { cityIds?: string[]; categories?: string[] }) {
    let tasks = [...state().tasks.values()].filter((t) => t.status === 'published');
    if (filter?.cityIds?.length) {
      tasks = tasks.filter((t) => filter.cityIds!.includes(t.cityId));
    }
    if (filter?.categories?.length) {
      tasks = tasks.filter((t) => t.categories.some((c) => filter.categories!.includes(c)));
    }
    return tasks.sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));
  }

  async updateTaskStatus(id: string, status: Task['status']) {
    const task = state().tasks.get(id);
    if (!task) return null;
    task.status = status;
    if (status === 'assigned') task.assignedAt = new Date().toISOString();
    if (status === 'completed') task.completedAt = new Date().toISOString();
    return task;
  }

  // ── bids ─────────────────────────────────────────────────
  async createBid(input: any): Promise<Bid> {
    const existingBid = [...state().bids.values()].find(
      (b) => b.taskId === input.taskId && b.masterId === input.masterId
    );
    if (existingBid) throw new Error('duplicate bid');

    const bid: Bid = {
      ...input,
      id: randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    state().bids.set(bid.id, bid);
    return bid;
  }

  async listBidsByTask(taskId: string) {
    return [...state().bids.values()]
      .filter((b) => b.taskId === taskId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listBidsByMaster(masterId: string) {
    return [...state().bids.values()]
      .filter((b) => b.masterId === masterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateBidStatus(id: string, status: Bid['status']) {
    const bid = state().bids.get(id);
    if (!bid) return null;
    bid.status = status;
    return bid;
  }

  // ── reviews ──────────────────────────────────────────────
  async createReview(input: any): Promise<Review> {
    const review: Review = {
      ...input,
      id: randomUUID(),
      masterResponse: null,
      createdAt: new Date().toISOString(),
    };
    state().reviews.set(review.id, review);

    // recalc weighted rating (same weights as SQL trigger)
    const master = state().masters.get(review.masterId);
    if (master) {
      const all = [...state().reviews.values()].filter((r) => r.masterId === master.id);
      const avg =
        all.reduce(
          (acc, r) =>
            acc +
            r.scoreQuality * 0.35 +
            r.scoreBudget * 0.25 +
            r.scorePunctuality * 0.15 +
            r.scoreCleanliness * 0.15 +
            r.scoreCommunication * 0.1,
          0
        ) / all.length;
      master.rating = Math.round(avg * 100) / 100;
      master.reviewsCount = all.length;
    }
    return review;
  }

  async listReviewsByMaster(masterId: string) {
    return [...state().reviews.values()]
      .filter((r) => r.masterId === masterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
