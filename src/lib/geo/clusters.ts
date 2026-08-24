/**
 * Israel geo clusters for matching.
 *
 * The whole country is split into 4 clusters covering ~95% of the population.
 * Task matching works cluster-first: a task in Tel Aviv is first offered to
 * Gush-Dan masters; if there are fewer than MIN_MASTERS_PER_TASK matches,
 * the radius expands to adjacent clusters.
 */

export const CLUSTER_IDS = ['gush_dan', 'jerusalem', 'haifa_north', 'south'] as const;
export type ClusterId = (typeof CLUSTER_IDS)[number];

export interface Cluster {
  id: ClusterId;
  /** Names in the 3 supported locales */
  name: { he: string; ru: string; en: string };
  /** Clusters that are "close enough" for radius expansion, in priority order */
  adjacent: ClusterId[];
}

export const CLUSTERS: Record<ClusterId, Cluster> = {
  gush_dan: {
    id: 'gush_dan',
    name: { he: 'גוש דן', ru: 'Гуш-Дан', en: 'Gush Dan' },
    adjacent: ['jerusalem', 'haifa_north', 'south'],
  },
  jerusalem: {
    id: 'jerusalem',
    name: { he: 'ירושלים והסביבה', ru: 'Иерусалим и окрестности', en: 'Jerusalem area' },
    adjacent: ['gush_dan', 'haifa_north', 'south'],
  },
  haifa_north: {
    id: 'haifa_north',
    name: { he: 'חיפה והצפון', ru: 'Хайфа и Север', en: 'Haifa & North' },
    adjacent: ['gush_dan', 'jerusalem', 'south'],
  },
  south: {
    id: 'south',
    name: { he: 'באר שבע והדרום', ru: 'Беэр-Шева и Юг', en: 'Beer Sheva & South' },
    adjacent: ['gush_dan', 'jerusalem', 'haifa_north'],
  },
};

/** When fewer than this many masters match inside a cluster, expand to adjacent ones */
export const MIN_MASTERS_PER_TASK = 3;
