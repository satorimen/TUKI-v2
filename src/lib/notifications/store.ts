/**
 * In-app notifications (M4).
 * MVP: in-memory per-user list; becomes a DB table with Supabase later.
 */

export type NotificationType =
  | 'new_bid' // → task client
  | 'bid_selected' // → master
  | 'task_assigned' // → task client (confirmation)
  | 'new_task' // → matched masters
  | 'task_cancelled'; // → bidding masters

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  taskId: string;
  /** short text in the recipient's locale (built at creation time) */
  text: string;
  link: string;
  read: boolean;
  createdAt: string;
}

const g = globalThis as unknown as { __tukiNotifications?: Map<string, AppNotification[]> };

function store(): Map<string, AppNotification[]> {
  if (!g.__tukiNotifications) g.__tukiNotifications = new Map();
  return g.__tukiNotifications;
}

let seq = 0;

export function pushNotification(input: {
  userId: string;
  type: NotificationType;
  taskId: string;
  text: string;
  link: string;
}): AppNotification {
  const notification: AppNotification = {
    id: `n_${Date.now().toString(36)}_${seq++}`,
    userId: input.userId,
    type: input.type,
    taskId: input.taskId,
    text: input.text,
    link: input.link,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const list = store().get(input.userId) ?? [];
  list.unshift(notification);
  store().set(input.userId, list.slice(0, 50)); // cap at 50
  return notification;
}

export function listNotifications(userId: string): AppNotification[] {
  return store().get(userId) ?? [];
}

export function markAllRead(userId: string): void {
  const list = store().get(userId);
  if (list) list.forEach((n) => (n.read = true));
}
