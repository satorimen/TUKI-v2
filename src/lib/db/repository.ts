import type {
  Profile,
  MasterProfile,
  Task,
  Bid,
  Review,
  TaskStatus,
} from './types';

/**
 * Provider-agnostic data access contract.
 * Implementations: MemoryDb (dev/demo, no keys) · SupabaseDb (production).
 *
 * Auth is handled separately (session cookie → profile id), so repository
 * methods receive explicit actor ids.
 */
export interface DbRepository {
  // ── profiles ─────────────────────────────────────────────
  getProfile(id: string): Promise<Profile | null>;
  getProfileByEmail(email: string): Promise<Profile | null>;
  createProfile(input: {
    email: string;
    fullName?: string;
    locale?: string;
    role?: 'client' | 'master';
  }): Promise<Profile>;
  updateProfile(
    id: string,
    patch: Partial<Pick<Profile, 'fullName' | 'phone' | 'whatsappNumber' | 'locale' | 'role'>>
  ): Promise<Profile>;

  // ── masters ──────────────────────────────────────────────
  getMasterByUserId(userId: string): Promise<MasterProfile | null>;
  getMaster(id: string): Promise<MasterProfile | null>;
  createMaster(
    userId: string,
    input: {
      specializations: string[];
      workCities: string[];
      experienceYears?: number;
      bio?: string;
    }
  ): Promise<MasterProfile>;
  updateMaster(
    id: string,
    patch: Partial<Pick<MasterProfile, 'specializations' | 'workCities' | 'experienceYears' | 'bio' | 'isActive'>>
  ): Promise<MasterProfile>;
  /** For matching (M4): active masters in given cities with any of the categories */
  findMasters(filter: {
    cityIds?: string[];
    categories?: string[];
  }): Promise<MasterProfile[]>;

  // ── tasks ────────────────────────────────────────────────
  createTask(input: Omit<Task, 'id' | 'createdAt' | 'selectedBidId' | 'publishedAt' | 'assignedAt' | 'completedAt'>): Promise<Task>;
  getTask(id: string): Promise<Task | null>;
  listTasksByClient(clientId: string): Promise<Task[]>;
  listPublishedTasks(filter?: { cityIds?: string[]; categories?: string[] }): Promise<Task[]>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task | null>;
  setTaskSelectedBid(taskId: string, bidId: string): Promise<Task | null>;

  // ── bids ─────────────────────────────────────────────────
  createBid(input: Omit<Bid, 'id' | 'createdAt' | 'status'>): Promise<Bid>;
  listBidsByTask(taskId: string): Promise<Bid[]>;
  listBidsByMaster(masterId: string): Promise<Bid[]>;
  updateBidStatus(id: string, status: Bid['status']): Promise<Bid | null>;

  // ── reviews ──────────────────────────────────────────────
  createReview(input: Omit<Review, 'id' | 'createdAt' | 'masterResponse'>): Promise<Review>;
  listReviewsByMaster(masterId: string): Promise<Review[]>;
}
