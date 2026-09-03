import { getClusterOfCity, CITIES } from '@/lib/geo/cities';
import { CLUSTERS, MIN_MASTERS_PER_TASK } from '@/lib/geo/clusters';
import type { MasterProfile, Task } from '@/lib/db/types';

/**
 * Cluster-based matching (M4, rule-based per PRD §10.3):
 *
 * 1. Masters whose workCities include the task city AND whose
 *    specializations overlap the task categories — "exact" tier.
 * 2. If fewer than MIN_MASTERS_PER_TASK, expand: masters working in ANY
 *    city of the task's cluster.
 * 3. Still fewer — expand to adjacent clusters (CLUSTERS[cluster].adjacent).
 *
 * Result sorted by rating (best first). Bidding masters see the task
 * regardless of tier once it's published (feed = flat list).
 */

export interface MatchResult {
  masters: MasterProfile[];
  /** how far we had to expand */
  tier: 'city' | 'cluster' | 'adjacent';
}

function overlaps<T>(a: T[], b: T[]): boolean {
  return a.some((x) => b.includes(x));
}

export function matchMastersForTask(
  task: Pick<Task, 'cityId' | 'categories'>,
  allMasters: MasterProfile[]
): MatchResult {
  const cluster = getClusterOfCity(task.cityId);

  const bySpec = (m: MasterProfile) => overlaps(m.specializations, task.categories);
  const rated = (list: MasterProfile[]) =>
    [...list].sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);

  // Tier 1: exact city
  const exact = allMasters.filter((m) => m.isActive && bySpec(m) && m.workCities.includes(task.cityId));
  if (exact.length >= MIN_MASTERS_PER_TASK) return { masters: rated(exact), tier: 'city' };

  // Tier 2: same cluster cities
  if (cluster) {
    const clusterCityIds = CITIES.filter((c) => c.cluster === cluster).map((c) => c.id);
    const inCluster = allMasters.filter(
      (m) =>
        m.isActive &&
        bySpec(m) &&
        m.workCities.some((c) => clusterCityIds.includes(c))
    );
    const merged = dedupe(exact, inCluster);
    if (merged.length >= MIN_MASTERS_PER_TASK) return { masters: rated(merged), tier: 'cluster' };

    // Tier 3: adjacent clusters
    const adjacentCityIds = CITIES.filter((c) =>
      CLUSTERS[cluster].adjacent.includes(c.cluster)
    ).map((c) => c.id);
    const adjacent = allMasters.filter(
      (m) =>
        m.isActive &&
        bySpec(m) &&
        m.workCities.some((c) => adjacentCityIds.includes(c))
    );
    return { masters: rated(dedupe(merged, adjacent)), tier: 'adjacent' };
  }

  return { masters: rated(exact), tier: 'city' };
}

function dedupe(a: MasterProfile[], b: MasterProfile[]): MasterProfile[] {
  const seen = new Set(a.map((m) => m.id));
  return [...a, ...b.filter((m) => !seen.has(m.id))];
}

/**
 * Feed for a specific master: published tasks the master has been INVITED to
 * by the wave dispatcher, newest first.
 *
 * A task exposes `matchedMasterIds` (priority snapshot) and `invitedCount`
 * (how many waves have opened). The master sees the task only if their id is
 * within the invited slice. Legacy/unmatched tasks (empty snapshot) fall back
 * to the previous cluster-based visibility so nothing silently disappears.
 */
export function feedForMaster(
  master: Pick<MasterProfile, 'id' | 'specializations' | 'workCities'>,
  publishedTasks: Task[]
): Task[] {
  // map work cities → their clusters → all cities of those clusters (fallback only)
  const clusterIds = new Set(
    master.workCities
      .map((cityId) => getClusterOfCity(cityId))
      .filter(Boolean) as string[]
  );
  const visibleCities = new Set(
    CITIES.filter((c) => clusterIds.has(c.cluster)).map((c) => c.id)
  );

  return publishedTasks
    .filter((t) => {
      const snapshot = t.matchedMasterIds ?? [];
      if (snapshot.length > 0) {
        // Wave-based visibility: only invited masters see the task
        return snapshot.slice(0, t.invitedCount).includes(master.id);
      }
      // Fallback for legacy tasks without a wave snapshot
      return (
        overlaps(master.specializations, t.categories) &&
        (visibleCities.has(t.cityId) || master.workCities.includes(t.cityId))
      );
    })
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}
